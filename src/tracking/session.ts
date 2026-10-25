import {CameraManager,cameraError} from './camera.ts';
import {HandTrackingService} from './service.ts';
import {TrackingProcessor} from './processor.ts';
import {TrackingMetrics} from './metrics.ts';
import {FrameGate} from './frameGate.ts';
import {trackingConfig} from './config.ts';
import {PipelineMetrics} from './pipelineMetrics.ts';
import type {TrackingFrame,TrackingEngine} from './types.ts';
// Gameplay uses the established Phase 2 modules. No extra render animation loop:
// the game calls tick(), and source frames arrive via requestVideoFrameCallback.
export class TrackingSession {
  readonly processor=new TrackingProcessor();
  readonly metrics=new TrackingMetrics();
  readonly pipeline=new PipelineMetrics();
  readonly camera:CameraManager;
  private service=new HandTrackingService();
  private gate=new FrameGate();
  private video:HTMLVideoElement;
  private generation=0;
  private busy=false;
  private callback=0;
  private lastCamera=0;
  private lastFrame?:TrackingFrame;
  active=false;
  loading=false;
  suspended=false;
  engine:TrackingEngine='gestures';
  requestedDelegate:'CPU'|'GPU'='GPU';
  actualDelegate:'CPU'|'GPU'='CPU';
  inferenceWidth=trackingConfig.inferenceWidth;
  timings={bitmapMs:0,roundTripMs:0,modelMs:0,resultAgeMs:0};
  onFrame?:(frame:TrackingFrame)=>void;
  onStatus?:(status:'permission'|'loading'|'ready'|'stopped'|'error',message:string)=>void;
  constructor(video:HTMLVideoElement){
    this.video=video;this.camera=new CameraManager(video);
    this.processor.adaptive=true;
    this.processor.predictive=true;
    this.camera.onDisconnect=()=>this.fail('Kamera bağlantısı kesildi. Yeniden başlatabilir veya fareyle oynayabilirsin.');
  }
  async start(){
    if(this.active)return true;
    this.stop();const generation=this.generation;this.loading=true;this.onStatus?.('permission','Kamerayı açalım. Tarayıcı izin penceresini kontrol edin.');
    try{
      if(!await this.camera.start('',trackingConfig.cameraWidth)||generation!==this.generation)return false;
      this.onStatus?.('loading','Görüntü açık. Ellerimiz için hazırlanıyoruz…');
      const delegate=await this.service.initialize(this.requestedDelegate,this.engine);if(generation!==this.generation)return false;
      this.actualDelegate=delegate;
      this.active=true;this.loading=false;this.suspended=false;this.lastCamera=performance.now();
      if(typeof this.video.requestVideoFrameCallback==='function')this.schedule(generation);
      this.onStatus?.('ready','Hazırız! Ellerini göster.');return true;
    }catch(error){if(generation===this.generation)this.fail(this.camera.active&&error instanceof Error?error.message:cameraError(error));return false;}
  }
  tick(now:number){
    if(!this.active)return;
    if(typeof this.video.requestVideoFrameCallback!=='function'&&this.video.readyState>=2)this.frame(now,this.video.currentTime,this.generation);
    if(now-this.lastCamera>5000){this.fail('Kameradan görüntü gelmiyor. Kamerayı kontrol edip yeniden deneyin.');return;}
    if(this.lastFrame?.hands.length&&now-this.lastFrame.timestamp>trackingConfig.lossTimeoutMs){
      this.lastFrame=this.processor.update([],now);this.onFrame?.(this.lastFrame);
    }
  }
  stop(){
    this.generation++;this.active=false;this.loading=false;this.busy=false;
    if(this.callback&&typeof this.video.cancelVideoFrameCallback==='function')this.video.cancelVideoFrameCallback(this.callback);this.callback=0;
    this.camera.stop();this.service.close();this.processor.reset();this.metrics.reset();this.pipeline.reset();this.gate.reset();this.lastFrame=undefined;
    this.onStatus?.('stopped','Kamera kapalı.');
  }
  private fail(message:string){this.stop();this.onStatus?.('error',message);}
  private schedule(generation:number){
    this.callback=this.video.requestVideoFrameCallback((now,metadata)=>{this.frame(now,metadata.mediaTime,generation);if(this.active&&generation===this.generation)this.schedule(generation);});
  }
  private frame(now:number,mediaTime:number,generation:number){
    if(!this.active||generation!==this.generation)return;
    const accepted=this.gate.accept(mediaTime,now,30,this.busy);
    if(!accepted.fresh)return;
    this.lastCamera=now;this.metrics.cameraFrame(now);
    if(!accepted.due&&!this.suspended){if(this.busy)this.pipeline.skippedBusy++;else this.pipeline.skippedRate++;}
    if(accepted.due&&!this.suspended&&this.video.readyState>=2)void this.infer(now,generation);
  }
  private async infer(timestamp:number,generation:number){
    this.busy=true;
    try{
      const width=Math.min(this.video.videoWidth,this.inferenceWidth);
      const begin=performance.now();
      const frame=width===this.video.videoWidth?await createImageBitmap(this.video):await createImageBitmap(this.video,{resizeWidth:width,resizeHeight:Math.max(1,Math.round(this.video.videoHeight*width/this.video.videoWidth))});
      const bitmapMs=performance.now()-begin;
      if(generation!==this.generation){frame.close();return;}
      const sent=performance.now();
      const result=await this.service.infer(frame,timestamp);if(generation!==this.generation)return;
      this.timings={bitmapMs,roundTripMs:performance.now()-sent,modelMs:result.latencyMs,resultAgeMs:performance.now()-timestamp};
      this.metrics.inferenceFrame(performance.now(),result.latencyMs);
      this.pipeline.record(result.timestamp,performance.now(),result.latencyMs);
      this.lastFrame=this.processor.update(result.detections,result.timestamp);this.onFrame?.(this.lastFrame);
    }catch(error){if(generation===this.generation)this.fail(error instanceof Error?error.message:'El takibi durdu. Yeniden başlatabilirsiniz.');}
    finally{if(generation===this.generation)this.busy=false;}
  }
}
