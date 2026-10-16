/// <reference lib="webworker" />
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { VisionSettings } from './types';
const scope=self as unknown as DedicatedWorkerGlobalScope;
let model:PoseLandmarker|null=null;
async function initialise(base:string,settings:VisionSettings){
  model?.close(); model=null;
  const files=await FilesetResolver.forVisionTasks(`${base}vendor`);
  const loader=files.wasmLoaderPath;
  const create=async(delegate:'CPU'|'GPU')=>{
    // Vendored 0.10.32 loader explicitly exports ModuleFactory; module worker can import it.
    await import(/* @vite-ignore */ `${loader}?worker=${delegate}-${Date.now()}`);
    return PoseLandmarker.createFromOptions({...files,wasmLoaderPath:''},{
      baseOptions:{modelAssetPath:`${base}models/pose_${settings.model}.task`,delegate},
      runningMode:'VIDEO',numPoses:settings.numPoses,
      minPoseDetectionConfidence:.55,minPosePresenceConfidence:.55,minTrackingConfidence:.55,
      outputSegmentationMasks:false,canvas:new OffscreenCanvas(settings.resolution,settings.resolution)
    });
  };
  let delegate=settings.delegate;let fallback=false;
  try {model=await create(delegate)} catch(error) {
    if(delegate==='CPU')throw error;
    delegate='CPU';fallback=true;model=await create(delegate);
  }
  scope.postMessage({type:'ready',delegate,fallback});
}
scope.onmessage=async(event:MessageEvent)=>{
  const d=event.data;
  try {
    if(d.type==='init'){await initialise(d.base,d.settings);return;}
    if(d.type==='frame'){
      const bitmap=d.bitmap as ImageBitmap;
      try{
        if(!model)throw new Error('Model henüz hazır değil');
        const started=performance.now();
        const result=model.detectForVideo(bitmap,d.timestamp);
        scope.postMessage({type:'result',poses:result.landmarks,inferenceMs:performance.now()-started,timestamp:d.timestamp,frameAt:d.frameAt});
      }finally{bitmap.close();}
    }
  }catch(error){scope.postMessage({type:'error',message:error instanceof Error?error.message:String(error)});}
};
