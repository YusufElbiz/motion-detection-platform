import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:4174';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--configLoader','native','--host','127.0.0.1','--port','4174','--strictPort'],{stdio:'pipe',windowsHide:true});
let browser;
const report={environment:'Headless installed Google Chrome, fake camera (color bars), actual local MediaPipe CPU worker. Not physical webcam or child-hand measurements.',samples:[],checks:[]};
try{
 await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('4174'))resolve();});server.on('error',reject);server.stderr.on('data',d=>console.error(String(d)));server.on('exit',code=>reject(new Error(`Preview exited ${code}`)));setTimeout(()=>reject(new Error('Preview timeout')),15000).unref();});
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 const context=await browser.newContext({viewport:{width:1440,height:1120}});
 const requests=[];const errors=[];
 context.on('request',request=>requests.push({url:request.url(),method:request.method()}));
 await context.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(origin);await page.locator('#tracking-open').click();
 assert.equal(await page.locator('#camera-status').textContent(),'Kamera kapalı');
 assert.equal(await page.locator('#tracking-video').evaluate(video=>video.srcObject),null);
 await mkdir('docs/screenshots',{recursive:true});
 await page.screenshot({path:'docs/screenshots/tracking-idle.png',fullPage:true});
 await page.locator('#camera-start').click();
 await page.waitForFunction(()=>document.querySelector('#camera-status').textContent==='Kamera açık',{},{timeout:45000});
 await page.waitForFunction(()=>parseFloat(document.querySelector('#inference-fps').textContent)>0,{},{timeout:20000});
 assert.match(await page.locator('#tracking-engine').textContent(),/CPU/);
 assert.ok(await page.locator('#tracking-video').evaluate(video=>video.videoWidth>0&&video.srcObject.getVideoTracks().some(t=>t.readyState==='live')));
 report.checks.push('real local model/WASM loaded; VIDEO inference on fake webcam; no external network allowed');
 // Wait past SDK metrics timer boundaries while watching egress and sustained inference.
 for(let i=0;i<33;i++){
  await page.waitForTimeout(2000);
  report.samples.push({cameraFps:await page.locator('#camera-fps').textContent(),inferenceFps:await page.locator('#inference-fps').textContent(),latency:await page.locator('#inference-latency').textContent()});
 }
 await page.screenshot({path:'docs/screenshots/tracking-live-synthetic.png',fullPage:true});
 await page.locator('#tracking-mirror').uncheck();assert.equal(await page.locator('#tracking-video').evaluate(v=>getComputedStyle(v).transform),'none');
 await page.locator('#tracking-mirror').check();assert.notEqual(await page.locator('#tracking-video').evaluate(v=>getComputedStyle(v).transform),'none');
 await page.locator('#tracking-smoothing').uncheck();await page.locator('#tracking-smoothing').check();
 const tracks=await page.locator('#tracking-video').evaluateHandle(video=>video.srcObject.getVideoTracks());
 await page.locator('#camera-stop').click();
 assert.equal(await tracks.evaluate(list=>list.every(t=>t.readyState==='ended')),true);
 assert.equal(await page.locator('#tracking-video').evaluate(video=>video.srcObject),null);
 await page.waitForTimeout(400);assert.equal(page.workers().length,0,'stopped worker disposed');
 report.checks.push('mirror controls, smoothing controls, stop releases camera tracks');
 await page.locator('#camera-start').click();await page.waitForFunction(()=>document.querySelector('#camera-status').textContent==='Kamera açık',{},{timeout:45000});
 const secondTracks=await page.locator('#tracking-video').evaluateHandle(video=>video.srcObject.getVideoTracks());
 await page.locator('#tracking-back').click();assert.equal(await secondTracks.evaluate(list=>list.every(t=>t.readyState==='ended')),true);
 await page.locator('#start').click();await page.locator('.waste').waitFor();
 await page.locator('#tracking-open').click();assert.equal(await page.locator('#camera-status').textContent(),'Kamera kapalı');
 report.checks.push('leave/re-enter cleans resources; mouse game still starts');
 // Isolated API error simulation, not claims about an actual busy/disconnected device.
 for(const [name,pattern]of [['NotAllowedError','izin'],['NotFoundError','bulunamadı'],['NotReadableError','diğer uygulamaları']]){
  await page.evaluate(name=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('simulated',name);};},name);
  await page.locator('#camera-start').click();await page.waitForFunction(text=>document.querySelector('#tracking-status').textContent.includes(text),pattern);
  assert.equal(await page.locator('#camera-start').isEnabled(),true);
 }
 report.checks.push('simulated permission denial, missing camera, busy camera errors');
 // Recover the native fake camera API, then simulate an unexpected ended event.
 await page.reload();await page.locator('#tracking-open').click();await page.locator('#camera-start').click();await page.waitForFunction(()=>document.querySelector('#camera-status').textContent==='Kamera açık',{},{timeout:45000});
 await page.locator('#tracking-video').evaluate(video=>video.srcObject.getVideoTracks()[0].dispatchEvent(new Event('ended')));
 assert.match(await page.locator('#tracking-status').textContent(),/bağlantısı kesildi/);
 assert.equal(await page.locator('#tracking-video').evaluate(video=>video.srcObject),null);
 report.checks.push('simulated disconnect clears stream');
 // Deterministic UI/overlay/calibration checks use an explicitly mocked backend.
 // These results are excluded from the performance samples above.
 const mockPage=await context.newPage();
 mockPage.on('pageerror',e=>errors.push(String(e)));
 await mockPage.addInitScript(()=>{
  window.__testHands=[{x:.3,y:.5,label:'Left'}];
  const NativeWorker=window.Worker;
  window.Worker=class {
   alive=true;
   constructor(url,options){if(!String(url).includes('inference-worker.js'))return new NativeWorker(url,options);}
   postMessage(data){
    if(data.kind==='close'){this.alive=false;return;}
    if(data.kind==='init'){setTimeout(()=>this.alive&&this.onmessage?.({data:{kind:'ready',delegate:'CPU'}}),10);return;}
    if(data.kind==='frame'){
     data.frame.close();
     const shape=[[0,.16],[-.07,.1],[-.12,.04],[-.16,-.02],[-.19,-.07],[-.07,-.03],[-.08,-.12],[-.08,-.19],[-.08,-.24],[0,-.05],[0,-.15],[0,-.23],[0,-.28],[.07,-.03],[.08,-.12],[.08,-.19],[.08,-.24],[.12,.01],[.16,-.06],[.18,-.12],[.19,-.17]];
     const detections=window.__testHands.map(h=>({landmarks:shape.map(([x,y])=>({x:h.x+x*.45,y:h.y+y*.45,z:0})),handedness:h.label,handednessScore:.91}));
     setTimeout(()=>this.alive&&this.onmessage?.({data:{kind:'result',result:{detections,latencyMs:1,timestamp:data.timestamp}}}),2);
    }
   }
   terminate(){this.alive=false;}
  };
 });
 await mockPage.goto(origin);await mockPage.locator('#tracking-open').click();await mockPage.locator('#camera-start').click();
 await mockPage.waitForFunction(()=>document.querySelectorAll('.hand-card').length===1);
 assert.match(await mockPage.locator('.hand-card').textContent(),/Model: Sol/);
 await mockPage.locator('#calibration-start').click();
 await mockPage.waitForFunction(()=>document.querySelector('#calibration-guide').textContent.includes('iki elinizi'));
 await mockPage.evaluate(()=>{window.__testHands=[{x:.3,y:.5,label:'Left'},{x:.7,y:.5,label:'Right'}];});
 await mockPage.waitForFunction(()=>document.querySelectorAll('.hand-card').length===2);
 await mockPage.waitForFunction(()=>document.querySelector('#calibration-finish').disabled===false);
 await mockPage.screenshot({path:'docs/screenshots/tracking-overlay-mock.png',fullPage:true});
 for(const [x,y]of [[.15,.2],[.85,.2],[.15,.85],[.85,.85]]){
  await mockPage.evaluate(({x,y})=>{window.__testHands=[{x,y,label:'Left'}];},{x,y});await mockPage.waitForTimeout(800);
 }
 await mockPage.locator('#calibration-finish').click();assert.match(await mockPage.locator('#calibration-guide').textContent(),/Alan hazır/);
 await mockPage.locator('#calibration-reset').click();assert.match(await mockPage.locator('#calibration-guide').textContent(),/Kameranın karşısında/);
 await mockPage.evaluate(()=>{window.__testHands=[];});await mockPage.waitForFunction(()=>document.querySelectorAll('.hand-card').length===0);
 await mockPage.waitForTimeout(500);
 await mockPage.evaluate(()=>{window.__testHands=[{x:.5,y:.5,label:'Right'}];});await mockPage.waitForFunction(()=>document.querySelectorAll('.hand-card').length===1);
 await mockPage.locator('#tracking-mirror').uncheck();assert.match(await mockPage.locator('.hand-card').textContent(),/Model: Sağ/);
 await mockPage.locator('#tracking-mirror').check();assert.match(await mockPage.locator('.hand-card').textContent(),/Model: Sağ/);
 await mockPage.evaluate(()=>{window.__testHands=[{x:.49,y:.5,label:'Right'},{x:.51,y:.5,label:'Left'}];});
 await mockPage.waitForFunction(()=>document.querySelector('#tracking-status').textContent.includes('üst üste'));
 await mockPage.setViewportSize({width:650,height:1000});assert.equal(await mockPage.locator('#camera-stop').isVisible(),true);
 await mockPage.locator('#camera-stop').click();await mockPage.close();
 report.checks.push('MOCK backend only: two-hand skeleton/coordinates UI, reported labels under display mirroring, calibration steps/reach/reset, loss/reappearance, overlap hint, narrow screen');
 await context.close();
 assert.equal(requests.filter(r=>!r.url.startsWith(origin)).length,0,'no nonlocal request attempts');
 assert.equal(requests.filter(r=>r.method!=='GET').length,0,'no frame uploads or metric POST requests');
 assert.equal(errors.length,0,`browser errors: ${errors.join('\n')}`);
 report.requests={total:requests.length,external:0,nonGet:0};report.consoleErrors=errors;
 await writeFile('docs/tracking-browser-results.json',JSON.stringify(report,null,2)+'\n');
 console.log('PASS: Phase 2 local inference, camera lifecycle, settings, error recovery, zero external requests and zero browser errors.');console.log(JSON.stringify(report.samples));
}finally{await browser?.close();server.kill();}
