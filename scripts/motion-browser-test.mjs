import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:4175';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--configLoader','native','--host','127.0.0.1','--port','4175','--strictPort'],{stdio:'pipe',windowsHide:true});
let browser;
const report={environment:'Installed headless Chrome; fake webcam; real local MediaPipe CPU inference. Hand landmarks substituted by test code after real inference; no physical-hand accuracy claim. Latency is actual blank-frame model time, not mock time.',checks:[],samples:[]};
try{
 await new Promise((resolve,reject)=>{server.stdout.on('data',data=>{if(String(data).includes('4175'))resolve();});server.on('error',reject);server.on('exit',code=>reject(new Error(`Preview exited ${code}`)));setTimeout(()=>reject(new Error('Preview startup timeout')),15000).unref();});
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 const context=await browser.newContext({viewport:{width:1440,height:1150}});
 const requests=[],errors=[];context.on('request',request=>requests.push({url:request.url(),method:request.method()}));
 await context.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
 const page=await context.newPage();page.on('pageerror',error=>errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 await page.addInitScript(()=>{
  window.__hands=[{x:.3,y:.5,closed:false}];window.__workerStarts=0;
  const NativeWorker=window.Worker;
  window.Worker=class extends NativeWorker{
   constructor(url,options){super(url,options);if(!String(url).includes('inference-worker.js'))return;window.__workerStarts++;
    this.addEventListener('message',event=>{
     if(event.data.kind!=='result')return;
     event.data.result.detections=window.__hands.map((h,index)=>{
      const shape=[[0,.16],[-.07,.10],[-.12,.04],[-.16,-.02],[.12,0],[-.05,.06],[-.07,-.03],[-.02,-.02],[0,0],[0,.04],[.02,-.04],[.02,-.10],[.02,-.16],[.05,.06],[.08,-.04],[.08,-.10],[.08,-.16],[.05,.06],[.12,0],[.14,-.04],[.16,-.10]];
      const landmarks=shape.map(([x,y])=>({x:h.x+x,y:h.y+y,z:0}));landmarks[4]={x:h.x+(h.closed?.012:.12),y:h.y,z:0};
      return {landmarks,handedness:index?'Left':'Right',handednessScore:.92};
     });
    });
   }
  };
 });
 await page.goto(origin);assert.equal(await page.evaluate(()=>window.__workerStarts),0);
 await page.locator('.motion-settings > summary').click();await page.locator('#grab-method').selectOption('dwell');
 await page.locator('#choose-hand').click();await page.locator('#start').click();
 await page.waitForFunction(()=>document.querySelector('#setup-guide').textContent.includes('iki elini'),{},{timeout:45000});
 await page.evaluate(()=>{window.__hands=[{x:.3,y:.5,closed:false},{x:.7,y:.5,closed:false}];});
 await page.waitForFunction(()=>document.querySelector('#setup-finish').disabled===false);
 for(const [x,y]of [[.15,.15],[.85,.15],[.15,.85],[.85,.85]]){await page.evaluate(({x,y})=>{window.__hands=[{x,y,closed:false}];},{x,y});await page.waitForTimeout(1000);}
 await mkdir('docs/screenshots',{recursive:true});await page.screenshot({path:'docs/screenshots/motion-setup-synthetic.png',fullPage:true});
 await page.locator('#setup-finish').click();await page.locator('.waste').first().waitFor();
 await page.waitForFunction(()=>document.querySelectorAll('.hand-cursor').length===1);
 assert.equal(await page.locator('#hand-setup').isVisible(),false);
 report.checks.push('hand mode selection; real model startup; one/two-hand calibration; calibrated gameplay cursor');
 async function setScreen(x,y,closed=false){await page.evaluate(({x,y,closed})=>{window.__hands=[{x:.85-x/1280*.7,y:.15+y/720*.7,closed}];},{x,y,closed});}
 async function moveTo(x,y,closed=false){
  const from=await page.evaluate(()=>window.__hands[0]??{x:.5,y:.5});const to={x:.85-x/1280*.7,y:.15+y/720*.7};
  for(let i=1;i<=12;i++){await page.evaluate(({x,y,closed})=>{window.__hands=[{x,y,closed}];},{x:from.x+(to.x-from.x)*i/12,y:from.y+(to.y-from.y)*i/12,closed});await page.waitForTimeout(70);}
 }
 async function objectPoint(target){return target.evaluate(node=>({x:parseFloat(node.style.left)*1280/100,y:parseFloat(node.style.top)*720/100}));}
 async function grab(method='dwell'){
  const target=page.locator('.waste').first();await target.waitFor({timeout:10000});const initial=await objectPoint(target);await moveTo(initial.x,initial.y,false);
  for(let i=0;i<45;i++){
   if(await page.locator('.waste.held').count())return;
   const point=await objectPoint(target);await setScreen(point.x,point.y,method==='pinch'&&i>=5);await page.waitForTimeout(100);
  }
  throw new Error(`No ${method} grab; cursor states: ${await page.locator('.hand-cursor').evaluateAll(nodes=>nodes.map(n=>n.dataset.state))}`);
 }
 async function drop(index,method='dwell'){
  await moveTo(304+224*index,590,method==='pinch');
  if(method==='pinch')await setScreen(304+224*index,590,false);
  await page.waitForFunction(()=>document.querySelectorAll('.waste.held').length===0,{},{timeout:6000});
 }
 const indices={plastic:0,paper:1,glass:2,metal:3};
 const heldBin=async()=>indices[await page.locator('.waste.held').getAttribute('data-category')];
 await grab();await page.screenshot({path:'docs/screenshots/motion-carry-synthetic.png',fullPage:true});await drop(await heldBin());assert.equal(await page.locator('#score').textContent(),'1');
 await grab();await drop((await heldBin()+1)%4);assert.equal(await page.locator('#score').textContent(),'1');assert.match(await page.locator('#feedback').textContent(),/kutusu/);
 report.checks.push('dwell grab/carry/release; correct and incorrect bins; no duplicate score');
 await grab();await page.locator('#pause').click();assert.equal(await page.locator('.waste.held').count(),0);assert.equal(await page.locator('#score').textContent(),'1');
 await page.locator('#resume').click();await page.waitForTimeout(250);assert.equal(await page.locator('.waste.held').count(),0);
 await grab();const workersBefore=await page.evaluate(()=>window.__workerStarts);await page.locator('#restart').click();assert.equal(await page.locator('#score').textContent(),'0');assert.equal(await page.locator('.waste.held').count(),0);assert.equal(await page.evaluate(()=>window.__workerStarts),workersBefore);
 report.checks.push('pause and restart cancel carry; restart reuses model');
 await grab();await page.evaluate(()=>{window.__hands=[];});await page.waitForTimeout(1200);assert.equal(await page.locator('.waste.held').count(),0);assert.equal(await page.locator('#score').textContent(),'0');
 report.checks.push('tracking loss cancels safely without scoring');
 await page.evaluate(()=>{window.__hands=[{x:.3,y:.4,closed:false},{x:.7,y:.4,closed:false}];});await page.waitForFunction(()=>document.querySelectorAll('.hand-cursor:not(.lost)').length===2);await page.waitForTimeout(200);
 await page.evaluate(()=>{window.__hands=[{x:.49,y:.5,closed:false},{x:.51,y:.5,closed:false}];});await page.waitForTimeout(200);assert.equal(await page.locator('.waste.held').count(),0);
 report.checks.push('two distinct cursors and safe overlapping hands');
 await page.locator('#grab-method').selectOption('pinch');
 await page.evaluate(()=>{window.__hands=[{x:.5,y:.5,closed:false}];});
 await grab('pinch');await drop(await heldBin(),'pinch');assert.equal(await page.locator('#score').textContent(),'1',JSON.stringify({feedback:await page.locator('#feedback').textContent(),hint:await page.locator('#hand-hint').textContent(),cursors:await page.locator('.hand-cursor').evaluateAll(nodes=>nodes.map(n=>({state:n.dataset.state,gesture:n.dataset.gesture})))}));
 report.checks.push('pinch grab/carry/release using real source-frame timing and test-substituted landmarks');
 await page.locator('#grab-method').selectOption('dwell');await page.setViewportSize({width:900,height:1000});
 for(let i=1;i<8;i++){
  await grab();const category=await page.locator('.waste.held').getAttribute('data-category');await drop(indices[category]);assert.equal(await page.locator('#score').textContent(),String(i+1));
  report.samples.push(await page.locator('#motion-metrics').textContent());
 }
 assert.equal(await page.locator('#result').isVisible(),true);
 assert.equal(await page.locator('#motion-video').evaluate(video=>video.srcObject),null);
 await page.waitForTimeout(300);assert.equal(page.workers().length,0);
 report.checks.push('resized hand sorting; eight-star win; completion disposes camera/model');
 await page.locator('#home').click();await page.locator('#choose-mouse').click();await page.locator('#start').click();await page.locator('.waste').first().waitFor();assert.equal(await page.locator('.hand-cursor').count(),0);assert.equal(await page.locator('#motion-video').evaluate(v=>v.srcObject),null);
 report.checks.push('switch to mouse leaves no camera/cursor active');
 await page.locator('#home').click();await page.locator('#choose-hand').click();await page.locator('#start').click();
 await page.waitForFunction(()=>document.querySelector('#motion-video').srcObject!==null);
 await page.locator('#tracking-open').click();assert.equal(await page.locator('#motion-video').evaluate(v=>v.srcObject),null);
 await page.locator('#tracking-back').click();assert.equal(await page.locator('#menu').isVisible(),true);
 await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('#motion-video').srcObject!==null);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;});
 assert.equal(await page.locator('#motion-video').evaluate(v=>v.srcObject),null);assert.equal(await page.locator('#setup-finish').isDisabled(),true);
 await page.locator('#setup-cancel').click();assert.equal(await page.locator('#menu').isVisible(),true);
 report.checks.push('diagnostic navigation during preparation and simulated hidden-tab setup cleanup');
 assert.equal(requests.filter(r=>!r.url.startsWith(origin)).length,0);assert.equal(requests.filter(r=>r.method!=='GET').length,0);assert.deepEqual(errors,[]);
 report.requests={total:requests.length,external:0,nonGet:0};report.errors=errors;
 await writeFile('docs/motion-browser-results.json',JSON.stringify(report,null,2)+'\n');console.log('PASS: Phase 3 hand gameplay integration. Synthetic landmarks; real local model and camera lifecycle.');console.log(JSON.stringify(report.samples));
}finally{await browser?.close();server.kill();}
