import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {landmarkPose} from '../src/motion/fist.ts';
import {smoothPoints,adaptiveTimeConstant} from '../src/tracking/smoothing.ts';
import {handFixture} from './hand-fixtures.mjs';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--configLoader','native','--host','127.0.0.1','--port','4177','--strictPort'],{stdio:'pipe',windowsHide:true});
let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('4177'))resolve();});server.on('error',reject);server.on('exit',code=>reject(new Error(`Preview exited ${code}`)));setTimeout(()=>reject(new Error('Preview timeout')),15000).unref();});
 browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();
 await page.goto('http://127.0.0.1:4177/');
 const models=await page.evaluate(async()=>{
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;const c=canvas.getContext('2d');c.fillStyle='#d5e5cf';c.fillRect(0,0,640,480);
  const outputs=[];
  for(const engine of ['landmarks','gestures']){
   const worker=new Worker('/tracking/inference-worker.js');
   const exchange=data=>new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Worker timeout')),30000);worker.onmessage=event=>{clearTimeout(timeout);if(event.data.kind==='error')reject(new Error(event.data.message));else resolve(event.data);};worker.onerror=error=>{clearTimeout(timeout);reject(error);};worker.postMessage(data,data.frame?[data.frame]:[]);});
   await exchange({kind:'init',engine,delegate:'CPU',base:new URL('/tracking/',location.href).href,thresholds:{detection:.5,presence:.5,tracking:.5}});
   const times=[];let hands=0;const begin=performance.now();
   for(let i=0;i<100;i++){const reply=await exchange({kind:'frame',frame:await createImageBitmap(canvas),timestamp:i*50});if(i>=20)times.push(reply.result.latencyMs);hands+=reply.result.detections.length;}
   const elapsed=performance.now()-begin;times.sort((a,b)=>a-b);
   outputs.push({engine,frames:100,warmup:20,detectedHands:hands,meanMs:times.reduce((a,b)=>a+b,0)/times.length,p50Ms:times[Math.floor(times.length*.5)],p95Ms:times[Math.floor(times.length*.95)],batchThroughputFps:100000/elapsed});
   worker.postMessage({kind:'close'});await new Promise(r=>setTimeout(r,250));worker.terminate();
  }
  return outputs;
 });
 const frames=[handFixture(),handFixture({closed:true}),handFixture({rotation:90}),handFixture({closed:true,tilt:35})];
 const begin=performance.now();let count=0;for(let i=0;i<10000;i++){landmarkPose(frames[i%4]);count++;}const heuristicMs=(performance.now()-begin)/count;
 function stepResponse(adaptive){let points=[{x:0,y:0,z:0}];let reached;for(let i=1;i<=12;i++){points=smoothPoints(points,[{x:.2,y:0,z:0}],50,adaptive?adaptiveTimeConstant(i===1?4:0):65);if(reached===undefined&&points[0].x>=.19)reached=i*50;}return reached;}
 const result={environment:'Actual CPU model execution in headless Chrome on identical blank 640x480 canvas frames, sequential workers; no physical camera, hands or model classification accuracy measured. Blank frames skip hand-gesture heads; not a two-hand workload comparison.',models,heuristicMsPerHand:heuristicMs,syntheticFilter95PercentStepMs:{oldFixed65:stepResponse(false),adaptive:stepResponse(true)},physicalAccuracy:'UNMEASURED',physicalEndToEndLatency:'UNMEASURED'};
 await writeFile('docs/gesture-backend-benchmark.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser?.close();server.kill();}
