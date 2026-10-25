import {trackingConfig} from './config.ts';
import type {InferenceResult, TrackingBackend, WorkerReply,TrackingEngine} from './types.ts';
// Only this backend knows the MediaPipe worker protocol; no dependency on the game.
export class HandTrackingService implements TrackingBackend {
  private worker?:Worker;
  private pending?:{resolve:(value:InferenceResult)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>};
  private initialization?:{reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>};
  async initialize(delegate:'CPU'|'GPU',engine:TrackingEngine='landmarks'):Promise<'CPU'|'GPU'> {
    this.close();
    if(typeof Worker==='undefined'||typeof OffscreenCanvas==='undefined'||typeof createImageBitmap==='undefined')throw new Error('Bu tarayıcı el takibini desteklemiyor. Güncel Chrome veya Edge ile deneyin.');
    const base=new URL(`${import.meta.env.BASE_URL}tracking/`,location.href).href;
    const worker=new Worker(`${base}inference-worker.js`);
    this.worker=worker;
    return new Promise((resolve,reject)=>{
      const fail=(message:string)=>{
        if(this.worker!==worker)return;
        const error=new Error(message);clearTimeout(this.initialization?.timer);this.initialization=undefined;
        reject(error);this.pending?.reject(error);this.close();
      };
      this.initialization={reject,timer:setTimeout(()=>fail('El takip modeli açılamadı. Yerel model dosyalarını kontrol edip yeniden deneyin.'),trackingConfig.modelTimeoutMs)};
      worker.onerror=()=>fail('El takip sistemi başlatılamadı. Güncel Chrome veya Edge kullanıp yeniden deneyin.');
      worker.onmessage=(event:MessageEvent<WorkerReply>)=>{
        if(this.worker!==worker)return;
        const reply=event.data;
        if(reply.kind==='ready'){clearTimeout(this.initialization?.timer);this.initialization=undefined;resolve(reply.delegate);}
        else if(reply.kind==='result'){
          if(this.pending){clearTimeout(this.pending.timer);this.pending.resolve(reply.result);this.pending=undefined;}
        } else if(reply.kind==='error')fail(reply.message);
      };
      worker.postMessage({kind:'init',base,delegate,engine,thresholds:{detection:trackingConfig.minHandDetectionConfidence,presence:trackingConfig.minHandPresenceConfidence,tracking:trackingConfig.minTrackingConfidence}});
    });
  }
  infer(frame:ImageBitmap,timestamp:number):Promise<InferenceResult> {
    if(!this.worker||this.pending){frame.close();return Promise.reject(new Error('El takip sistemi hazır değil. Yeniden başlatın.'));}
    return new Promise((resolve,reject)=>{
      this.pending={resolve,reject,timer:setTimeout(()=>{this.close();},trackingConfig.frameTimeoutMs)};
      try{this.worker!.postMessage({kind:'frame',frame,timestamp},[frame]);}
      catch {frame.close();this.close();}
    });
  }
  close(){
    if(this.initialization){clearTimeout(this.initialization.timer);this.initialization.reject(new Error('El takibi durduruldu.'));this.initialization=undefined;}
    if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(new Error('El takibi durduruldu veya yanıt vermedi. Yeniden başlatabilirsiniz.'));this.pending=undefined;}
    const worker=this.worker;this.worker=undefined;
    if(worker){worker.postMessage({kind:'close'});setTimeout(()=>worker.terminate(),200);}
  }
}
