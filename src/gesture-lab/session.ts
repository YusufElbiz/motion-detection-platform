import {CameraManager,cameraError} from '../tracking/camera.ts';
import {HandTrackingService} from '../tracking/service.ts';
import {FrameGate} from '../tracking/frameGate.ts';
import type {TrackingBackend,Detection} from '../tracking/types.ts';
import {HandTracks} from './tracks.ts';

export interface LabCamera {active:boolean;start(device:string,width:number):Promise<boolean>;stop():void;onDisconnect?:()=>void}
export class LabSession {
  readonly tracks=new HandTracks();
  active=false;
  loading=false;
  delegate:'CPU'|'GPU'='CPU';
  requestedDelegate:'CPU'|'GPU'='CPU';
  width=640;
  frequency=30;
  raw:Detection[]=[];
  lastSample?:number;
  skippedBusy=0;
  skippedRate=0;
  staleResults=0;
  missedCameraFrames=0;
  cameraTimes:number[]=[];
  samples:{at:number;model:number;roundTrip:number;age:number;bitmap:number}[]=[];
  onStatus?:(message:string)=>void;
  private video:HTMLVideoElement;
  private camera:LabCamera;
  private backend:TrackingBackend;
  private gate=new FrameGate();
  private generation=0;
  private callback=0;
  private fallback=0;
  private busy=false;
  private lastCamera=0;
  private presented?:number;
  constructor(video:HTMLVideoElement,camera?:LabCamera,backend?:TrackingBackend){
    this.video=video;this.camera=camera??new CameraManager(video);this.backend=backend??new HandTrackingService();
    this.camera.onDisconnect=()=>{this.stop();this.onStatus?.('Kamera bağlantısı kesildi. Yeniden başlatabilirsiniz.');};
  }
  async start(){
    if(this.loading||this.active)return;
    this.stop();const generation=this.generation;this.loading=true;
    this.onStatus?.('Kamera izni bekleniyor…');
    try{
      if(!await this.camera.start('',this.width)||generation!==this.generation)return;
      this.onStatus?.('Yerel hareket modeli yükleniyor…');
      const delegate=await this.backend.initialize(this.requestedDelegate,'gestures');
      if(generation!==this.generation)return;
      this.delegate=delegate;this.active=true;this.loading=false;this.lastCamera=performance.now();
      this.onStatus?.(delegate===this.requestedDelegate?'Kamera hazır. Bir veya iki elinizi gösterin.':'GPU başlatılamadı; CPU ile devam ediliyor.');
      this.schedule(generation);
    }catch(error){if(generation===this.generation){const message=this.camera.active&&error instanceof Error?error.message:cameraError(error);this.stop();this.onStatus?.(message);}}
  }
  stop(){
    this.generation++;this.active=false;this.loading=false;
    if(this.callback)this.video.cancelVideoFrameCallback?.(this.callback);
    cancelAnimationFrame(this.fallback);this.callback=this.fallback=0;
    this.camera.stop();this.backend.close();this.busy=false;this.gate.reset();this.tracks.reset();
    this.raw=[];this.lastSample=undefined;this.cameraTimes=[];this.samples=[];this.presented=undefined;
    this.skippedBusy=this.skippedRate=this.staleResults=this.missedCameraFrames=0;
    this.onStatus?.('Kamera kapalı.');
  }
  tick(now:number){
    if(!this.active)return;
    this.tracks.age(now);
    if(now-this.lastCamera>5000){this.stop();this.onStatus?.('Kameradan görüntü gelmiyor. Yeniden başlatın.');}
  }
  metrics(now=performance.now()){
    const times=this.cameraTimes.filter(t=>now-t<3000),samples=this.samples.filter(s=>now-s.at<3000);
    const rate=(values:number[])=>values.length<2?0:(values.length-1)*1000/(values.at(-1)!-values[0]);
    const sorted=samples.map(s=>s.model).sort((a,b)=>a-b);
    const mean=(key:'model'|'roundTrip'|'age'|'bitmap')=>samples.length?samples.reduce((sum,s)=>sum+s[key],0)/samples.length:0;
    return {cameraFps:rate(times),inferenceFps:rate(samples.map(s=>s.at)),averageMs:mean('model'),p95Ms:sorted.length?sorted[Math.ceil(sorted.length*.95)-1]:0,roundTripMs:mean('roundTrip'),bitmapMs:mean('bitmap'),resultAgeMs:mean('age'),landmarkAgeMs:this.lastSample===undefined?null:now-this.lastSample,sampleCount:samples.length,skippedBusy:this.skippedBusy,skippedRate:this.skippedRate,staleResults:this.staleResults,missedCameraFrames:this.missedCameraFrames};
  }
  private schedule(generation:number){
    if(typeof this.video.requestVideoFrameCallback==='function'){
      this.callback=this.video.requestVideoFrameCallback((now,metadata)=>{
        if(generation!==this.generation||!this.active)return;
        if(this.presented!==undefined)this.missedCameraFrames+=Math.max(0,metadata.presentedFrames-this.presented-1);
        this.presented=metadata.presentedFrames;this.frame(now,metadata.mediaTime,generation);this.schedule(generation);
      });
    }else this.fallback=requestAnimationFrame(now=>{if(generation!==this.generation||!this.active)return;this.frame(now,this.video.currentTime,generation);this.schedule(generation);});
  }
  private frame(now:number,mediaTime:number,generation:number){
    if(this.video.readyState<2)return;
    const accepted=this.gate.accept(mediaTime,now,this.frequency,this.busy);
    if(!accepted.fresh)return;
    this.lastCamera=now;this.cameraTimes.push(now);if(this.cameraTimes.length>180)this.cameraTimes.shift();
    if(!accepted.due){if(this.busy)this.skippedBusy++;else this.skippedRate++;return;}
    void this.infer(now,generation);
  }
  private async infer(timestamp:number,generation:number){
    this.busy=true;
    try{
      const begin=performance.now();
      // Capture only the current camera frame. No frame queue and no second model.
      const bitmap=await createImageBitmap(this.video);
      if(generation!==this.generation){bitmap.close();return;}
      const sent=performance.now();const result=await this.backend.infer(bitmap,timestamp);
      if(generation!==this.generation)return;
      const received=performance.now();
      this.samples.push({at:received,model:result.latencyMs,roundTrip:received-sent,age:received-timestamp,bitmap:sent-begin});if(this.samples.length>180)this.samples.shift();
      if(received-timestamp>180){this.staleResults++;this.tracks.age(received);return;}
      this.lastSample=timestamp;this.raw=result.detections;
      this.tracks.aspect=this.video.videoWidth/this.video.videoHeight;
      this.tracks.update(result.detections,timestamp);
    }catch(error){if(generation===this.generation){this.stop();this.onStatus?.(error instanceof Error?error.message:'El takibi durdu. Yeniden başlatın.');}}
    finally{if(generation===this.generation)this.busy=false;}
  }
}
