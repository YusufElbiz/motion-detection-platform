import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:4180';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--configLoader','native','--host','127.0.0.1','--port','4180','--strictPort'],{stdio:'pipe',windowsHide:true});
let browser;
const report={environment:'Installed headless Chrome, fake camera color bars, real local Gesture Recognizer. No substituted detections. Not physical hand accuracy, two-hand load or physical motion latency.',delegates:[],checks:[]};
try{
  await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('4180'))resolve();});server.on('error',reject);server.on('exit',code=>reject(new Error(`Preview exited ${code}`)));setTimeout(()=>reject(new Error('Preview timeout')),15000).unref();});
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
  const context=await browser.newContext({viewport:{width:1440,height:1100},deviceScaleFactor:1.5});
  const requests=[],errors=[];
  context.on('request',request=>requests.push({url:request.url(),method:request.method()}));
  await context.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
  // Test-only observer, not an inference substitute. Production has no debug API.
  await context.addInitScript(()=>{
    const NativeWorker=window.Worker;
    window.__observed={times:[],ready:[],inFlight:0,maximumInFlight:0,timestamps:[],detections:0};
    window.Worker=class extends NativeWorker{
      constructor(...args){super(...args);this.addEventListener('message',event=>{const data=event.data;if(data.kind==='ready')window.__observed.ready.push(data.delegate);if(data.kind==='result'){window.__observed.inFlight--;window.__observed.times.push(data.result.latencyMs);window.__observed.detections+=data.result.detections.length;}});}
      postMessage(data,...args){if(data.kind==='frame'){window.__observed.inFlight++;window.__observed.maximumInFlight=Math.max(window.__observed.maximumInFlight,window.__observed.inFlight);window.__observed.timestamps.push(data.timestamp);}return super.postMessage(data,...args);}
    };
  });
  const page=await context.newPage();page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(`${origin}/gesture-lab`);await page.locator('h1').waitFor();
  assert.match(await page.title(),/İki El/);assert.equal(await page.locator('video').evaluate(v=>v.srcObject),null);assert.equal(page.workers().length,0);
  assert.equal(await page.locator('#playfield').count(),0,'game is not mounted in lab');
  await mkdir('docs/screenshots',{recursive:true});
  await page.screenshot({path:'docs/screenshots/gesture-lab-idle.png',fullPage:true});
  for(const delegate of ['CPU','GPU']){
    await page.selectOption('#delegate',delegate);await page.locator('#lab-start').click();
    await page.waitForFunction(()=>document.querySelector('#camera-light').textContent==='● Kamera açık',{},{timeout:45000});
    await page.waitForFunction(()=>window.__observed.times.length>=80,{},{timeout:30000});
    const observed=await page.evaluate(()=>window.__observed);
    const times=observed.times.slice(20).sort((a,b)=>a-b);
    const actual=observed.ready.at(-1);
    assert.equal(observed.maximumInFlight,1,'no model backlog');
    assert.equal(new Set(observed.timestamps).size,observed.timestamps.length,'unique frame timestamps');
    assert.ok(times.every(Number.isFinite));
    report.delegates.push({requested:delegate,actual,frames:observed.times.length,warmupExcluded:20,meanMs:times.reduce((a,b)=>a+b,0)/times.length,p95Ms:times[Math.ceil(times.length*.95)-1],detectedHands:observed.detections,maximumInFlight:observed.maximumInFlight,screenMetrics:await page.locator('#metrics').innerText()});
    assert.equal(await page.locator('video').evaluate(v=>v.videoWidth>0&&v.srcObject.getVideoTracks()[0].readyState==='live'),true);
    const tracks=await page.locator('video').evaluateHandle(v=>v.srcObject.getVideoTracks());
    await page.locator('#smoothing').uncheck();await page.locator('#smoothing').check();
    await page.setViewportSize({width:760,height:1000});
    const size=await page.locator('canvas').evaluate(c=>({actual:c.width,expected:Math.round(c.getBoundingClientRect().width*devicePixelRatio)}));
    // Allow the next render to apply resize.
    await page.waitForFunction(()=>{const c=document.querySelector('canvas');return c.width===Math.round(c.getBoundingClientRect().width*devicePixelRatio);});
    assert.ok(size.expected>0);
    await page.setViewportSize({width:1440,height:1100});
    await page.screenshot({path:`docs/screenshots/gesture-lab-${delegate.toLowerCase()}-fake-camera.png`,fullPage:true});
    await page.locator('#lab-stop').click();assert.equal(await tracks.evaluate(ts=>ts.every(t=>t.readyState==='ended')),true);assert.equal(await page.locator('video').evaluate(v=>v.srcObject),null);
    await page.waitForFunction(()=>document.querySelector('#lab-start').disabled===false);await page.waitForTimeout(350);assert.equal(page.workers().length,0);
    await page.evaluate(()=>{window.__observed={times:[],ready:[],inFlight:0,maximumInFlight:0,timestamps:[],detections:0};});
  }
  await page.locator('#defaults').click();assert.equal(await page.locator('#threshold').inputValue(),'0.6');
  await page.locator('#lab-start').click();await page.waitForFunction(()=>document.querySelector('#camera-light').textContent==='● Kamera açık',{},{timeout:45000});
  const leavingTracks=await page.locator('video').evaluateHandle(v=>v.srcObject.getVideoTracks());
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));assert.equal(await leavingTracks.evaluate(ts=>ts.every(t=>t.readyState==='ended')),true);
  // Real navigation also loads the untouched mouse game without opening a camera.
  await page.locator('a[href="/"]').click();await page.locator('#menu').waitFor();await page.locator('#start').click();await page.locator('.waste').first().waitFor();assert.equal(await page.locator('#motion-video').evaluate(v=>v.srcObject),null);
  assert.equal(errors.length,0,errors.join('\n'));assert.ok(requests.every(r=>r.url.startsWith(origin)&&r.method==='GET'),'runtime is local GET only');
  report.checks.push('deep route; camera opt-in; CPU/GPU actual local model; single worker/no queued frames; unique timestamps; DPR/resize; smoothing controls; repeated start-stop; pagehide stops tracks; defaults; navigation to mouse game; zero page errors; local GET-only runtime');
  await writeFile('docs/gesture-lab-browser-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser?.close();server.kill();}
