/* First-party worker adapter. Upstream JS/WASM files are copied unmodified.
   Frames live only in this local worker and are closed immediately after use. */
// Explicit local-only transport policy, including any optional upstream metrics.
const localFetch=self.fetch.bind(self);
self.fetch=(input,init)=>{
  const url=new URL(input instanceof Request?input.url:String(input),self.location.href);
  const method=init?.method??(input instanceof Request?input.method:'GET');
  if(url.origin!==self.location.origin||!['GET','HEAD'].includes(method.toUpperCase()))return Promise.reject(new Error('External transport disabled by application policy'));
  return localFetch(input,init);
};
const originalOpen=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(method,url,...rest){
  if(new URL(url,self.location.href).origin!==self.location.origin||!['GET','HEAD'].includes(method.toUpperCase()))throw new Error('External transport disabled by application policy');
  return originalOpen.call(this,method,url,...rest);
};
let landmarker;
let busy=false;
let disposed=false;
let engine='landmarks';
// Emscripten writes this informational startup message to stderr. Preserve it as
// console.info while keeping every other warning/error unchanged.
const originalError=console.error.bind(console);
console.error=(...args)=>{
  if(args.length===1&&args[0]==='INFO: Created TensorFlow Lite XNNPACK delegate for CPU.')console.info(...args);
  else originalError(...args);
};
self.onmessage=async({data})=>{
  if(data.kind==='close'){disposed=true;landmarker?.close();landmarker=undefined;self.close();return;}
  if(data.kind==='init'){
    try{
      importScripts('./vision_bundle.js');
      const files=await Vision.FilesetResolver.forVisionTasks(`${data.base}wasm`);
      const threshold=value=>Math.max(.2,Math.min(.9,Number(value)||.5));
      engine=data.engine==='gestures'?'gestures':'landmarks';
      const Task=engine==='gestures'?Vision.GestureRecognizer:Vision.HandLandmarker;
      const create=delegate=>Task.createFromOptions(files,{
        baseOptions:{modelAssetPath:`${data.base}${engine==='gestures'?'gesture_recognizer':'hand_landmarker'}.task`,delegate},
        canvas:new OffscreenCanvas(1,1),runningMode:'VIDEO',numHands:2,
        minHandDetectionConfidence:threshold(data.thresholds.detection),
        minHandPresenceConfidence:threshold(data.thresholds.presence),
        minTrackingConfidence:threshold(data.thresholds.tracking),
      });
      let delegate=data.delegate==='GPU'?'GPU':'CPU';
      try{landmarker=await create(delegate);}catch(error){if(delegate==='CPU')throw error;delegate='CPU';landmarker=await create(delegate);}
      if(disposed){landmarker.close();return;}
      self.postMessage({kind:'ready',delegate});
    }catch {self.postMessage({kind:'error',message:'Yerel el takip modeli yüklenemedi. Model/WASM dosyalarını kontrol edin; CPU seçeneğiyle yeniden deneyin.'});}
  }else if(data.kind==='frame'){
    if(busy||!landmarker||disposed){data.frame.close();return;}
    busy=true;
    try{
      const started=performance.now();
      const result=engine==='gestures'?landmarker.recognizeForVideo(data.frame,data.timestamp):landmarker.detectForVideo(data.frame,data.timestamp);
      const latencyMs=performance.now()-started;
      const detections=result.landmarks.map((landmarks,index)=>({
        landmarks:landmarks.map(({x,y,z})=>({x,y,z})),
        worldLandmarks:result.worldLandmarks?.[index]?.map(({x,y,z})=>({x,y,z})),
        handedness:result.handedness[index]?.[0]?.categoryName??'Unknown',
        handednessScore:result.handedness[index]?.[0]?.score??0,
        ...(engine==='gestures'?{modelGesture:{label:result.gestures[index]?.[0]?.categoryName??'None',score:result.gestures[index]?.[0]?.score??0}}:{}),
      }));
      self.postMessage({kind:'result',result:{detections,latencyMs,timestamp:data.timestamp}});
    }catch {self.postMessage({kind:'error',message:'El takibi kesildi. Kamerayı durdurup CPU seçeneğiyle yeniden başlatın.'});}
    finally{data.frame.close();busy=false;}
  }
};
