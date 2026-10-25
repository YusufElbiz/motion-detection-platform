import {trackingConfig} from './config.ts';
export function cameraError(error: unknown): string {
  const name=error instanceof Error ? error.name : '';
  const messages:Record<string,string>={
    NotAllowedError:'Kamera izni verilmedi. Tarayıcının adres çubuğundaki kamera ayarından izin verip yeniden deneyin.',
    NotFoundError:'Kamera bulunamadı. Kamerayı bağlayıp yeniden deneyin.',
    NotReadableError:'Kamera açılamadı. Kamerayı kullanan diğer uygulamaları kapatıp yeniden deneyin.',
    OverconstrainedError:'Bu kamera seçilen ayarı desteklemiyor. Başka bir çözünürlük veya kamera deneyin.',
    SecurityError:'Kamera erişimi bu tarayıcıda kapalı. Yerel adresi ve kamera izinlerini kontrol edin.',
    AbortError:'Kamera başlatılamadı. Bağlantısını kontrol edip yeniden deneyin.',
    TimeoutError:'Kameradan görüntü gelmedi. Bağlantısını kontrol edip yeniden deneyin.',
  };
  return messages[name]??'Kamera açılamadı. Bağlantısını ve tarayıcı izinlerini kontrol edip yeniden deneyin.';
}
export class CameraManager {
  private stream?: MediaStream;
  private generation=0;
  onDisconnect?:()=>void;
  private video:HTMLVideoElement;
  constructor(video:HTMLVideoElement) {this.video=video;}
  get active(){return this.stream?.getVideoTracks().some(track=>track.readyState==='live')??false;}
  async devices(){
    if(!navigator.mediaDevices?.enumerateDevices)return [];
    return (await navigator.mediaDevices.enumerateDevices()).filter(device=>device.kind==='videoinput');
  }
  async start(deviceId:string, width:number):Promise<boolean> {
    this.stop(); const generation=this.generation;
    if(!navigator.mediaDevices?.getUserMedia)throw new DOMException('Camera unavailable','SecurityError');
    const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{
      width:{ideal:Math.max(320,Math.min(1280,width))},height:{ideal:Math.round(width*.75)},
      frameRate:{ideal:trackingConfig.cameraFps,max:trackingConfig.cameraFps},
      ...(deviceId?{deviceId:{exact:deviceId}}:{facingMode:'user'}),
    }});
    if(generation!==this.generation){stream.getTracks().forEach(track=>track.stop());return false;}
    this.stream=stream;
    for(const track of stream.getVideoTracks())track.onended=()=>{if(generation===this.generation){this.stop();this.onDisconnect?.();}};
    this.video.srcObject=stream;
    let timeout:ReturnType<typeof setTimeout>|undefined;
    try {
      await Promise.race([this.video.play(),new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(new DOMException('No video','TimeoutError')),12000);})]);
      if(generation!==this.generation)return false;
      return true;
    } catch(error) {if(generation!==this.generation)return false;this.stop();throw error;}
    finally {clearTimeout(timeout);}
  }
  stop(){
    this.generation++;
    for(const track of this.stream?.getTracks()??[]){track.onended=null;track.stop();}
    this.stream=undefined;this.video.pause();this.video.srcObject=null;
  }
}
