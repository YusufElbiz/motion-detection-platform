import type { PosePacket, VisionSettings } from './types';
export class CameraTracker {
  private worker:Worker|null=null;
  private stream:MediaStream|null=null;
  private active=false;
  private busy=false;
  private generation=0;
  private handle=0;
  private frameAPI=false;
  private lastFrame=-1;
  private lastTimestamp=0;
  private pendingReject:((error:Error)=>void)|null=null;
  onPose:(packet:PosePacket)=>void=()=>{};
  onStatus:(status:string)=>void=()=>{};
  onError:(error:string)=>void=()=>{};
  constructor(readonly video:HTMLVideoElement,private settings:VisionSettings){}
  async start(){
    this.stop();const gen=++this.generation;
    if(!navigator.mediaDevices?.getUserMedia)throw Error('Chrome + localhost veya HTTPS gerekiyor.');
    this.onStatus('Kamera izni isteniyor...');
    try{
      this.stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30,max:60},facingMode:'user'},audio:false});
      if(gen!==this.generation)return;
      this.video.srcObject=this.stream;await this.video.play();
      if(gen!==this.generation)return;
      this.onStatus(`${this.settings.numPoses} kişilik MediaPipe modeli açılıyor...`);
      this.worker=new Worker(new URL('./worker.ts',import.meta.url),{type:'module'});
      const result=await new Promise<{delegate:string;fallback:boolean}>((resolve,reject)=>{
        const timeout=window.setTimeout(()=>reject(Error('Model zaman aşımına uğradı.')),45000);
        this.pendingReject=(err:Error)=>{window.clearTimeout(timeout);reject(err)};
        this.worker!.onmessage=e=>{
          const d=e.data;
          if(d.type==='ready'){window.clearTimeout(timeout);this.pendingReject=null;this.busy=false;resolve(d);return;}
          if(d.type==='error'){
            this.busy=false;
            if(this.pendingReject){this.pendingReject(new Error(String(d.message)))}
            else this.onError(String(d.message));return;
          }
          if(d.type==='result'){
            this.busy=false;
            if(this.active&&gen===this.generation)this.onPose(d as PosePacket);
          }
        };
        this.worker!.onerror=e=>{const err=new Error(e.message||'Hareket modeli yüklenemedi.');if(this.pendingReject)this.pendingReject(err);else this.onError(err.message)};
        this.worker!.postMessage({type:'init',base:new URL(import.meta.env.BASE_URL,location.href).href,settings:this.settings});
      });
      if(gen!==this.generation)return;
      this.active=true;
      this.onStatus(`Kamera hazır · ${result.delegate}${result.fallback?' (GPU yerine CPU)':''}`);
      this.schedule();
    }catch(e){this.stop();throw e}
  }
  private schedule(){
    if(!this.active)return;
    this.frameAPI=typeof this.video.requestVideoFrameCallback==='function';
    if(this.frameAPI)this.handle=this.video.requestVideoFrameCallback((now,meta)=>{this.process(now);this.schedule()});
    else this.handle=requestAnimationFrame(now=>{if(this.video.currentTime!==this.lastFrame){this.lastFrame=this.video.currentTime;this.process(now)}this.schedule()});
  }
  private process(now:number){
    if(this.busy||!this.worker||!this.video.videoWidth)return;
    this.busy=true;const gen=this.generation;
    const w=Math.min(this.video.videoWidth,this.settings.resolution),h=Math.max(1,Math.round(w*this.video.videoHeight/this.video.videoWidth));
    createImageBitmap(this.video,{resizeWidth:w,resizeHeight:h,resizeQuality:'high'}).then(bitmap=>{
      if(!this.active||gen!==this.generation||!this.worker){bitmap.close();this.busy=false;return;}
      // Strictly increasing timestamps. No frame queue.
      this.lastTimestamp=Math.max(now,this.lastTimestamp+1);
      this.worker.postMessage({type:'frame',bitmap,frameAt:now,timestamp:this.lastTimestamp},[bitmap]);
    }).catch(e=>{this.busy=false;this.onError(String(e))});
  }
  stop(){
    this.active=false;this.generation++;
    if(this.frameAPI)this.video.cancelVideoFrameCallback(this.handle);else cancelAnimationFrame(this.handle);
    this.pendingReject?.(new Error('Kamera kapatıldı.'));this.pendingReject=null;
    this.worker?.terminate();this.worker=null;
    this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;
    this.video.pause();this.video.srcObject=null;this.busy=false;this.lastTimestamp=0;
  }
}
