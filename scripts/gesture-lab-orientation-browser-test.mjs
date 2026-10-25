import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {handFixture} from './hand-fixtures.mjs';
const origin='http://127.0.0.1:4181';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--configLoader','native','--host','127.0.0.1','--port','4181','--strictPort'],{stdio:'pipe',windowsHide:true});
let browser;
function detection({x=.5,closed=false,rotation=90,tilt=65,label='None'}={}){
  const landmarks=handFixture({x,closed,rotation,tilt});
  return {landmarks,worldLandmarks:landmarks.map(p=>({x:(p.x-x)*4/3*.3,y:(p.y-.5)*.3,z:p.z*4/3*.3})),handedness:'Unknown',handednessScore:0,modelGesture:{label,score:.95}};
}
try{
  await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('4181'))resolve();});server.on('error',reject);server.on('exit',code=>reject(new Error(`Preview exited ${code}`)));setTimeout(()=>reject(new Error('Preview timeout')),15000).unref();});
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
  const context=await browser.newContext({viewport:{width:1440,height:1100}});
  await context.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
  // Explicit synthetic integration seam AFTER real worker inference, test only.
  // This checks forwarding/temporal decisions/DOM, never real recognition accuracy.
  await context.addInitScript(()=>{
    const NativeWorker=window.Worker;
    window.__controlledHands=[];
    window.Worker=class extends NativeWorker{
      constructor(...args){super(...args);this.addEventListener('message',event=>{if(event.data.kind==='result')event.data.result.detections=window.__controlledHands;});}
    };
  });
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(`${origin}/gesture-lab`);await page.locator('#lab-start').click();
  await page.waitForFunction(()=>document.querySelector('#camera-light').textContent==='● Kamera açık',{},{timeout:45000});
  async function supply(hands,poses){
    await page.evaluate(hands=>{window.__controlledHands=hands;},hands);
    await page.waitForFunction(poses=>{const nodes=[...document.querySelectorAll('.pose')];return nodes.length===poses.length&&nodes.every((n,i)=>n.textContent===poses[i]);},poses,{timeout:10000});
  }
  await supply([detection()],['AÇIK']);
  assert.match(await page.locator('#tracks').innerText(),/Parmak geometrisi/);assert.match(await page.locator('#tracks').innerText(),/Tanımlanmadı/);
  await supply([detection({closed:true})],['KAPALI']);await supply([detection({rotation:270,tilt:85})],['AÇIK']);
  await page.locator('.finger-details summary').click();await page.waitForTimeout(400);assert.equal(await page.locator('.finger-details').getAttribute('open'),'','expanded diagnostics survive DOM refresh');
  await supply([detection({label:'Closed_Fist'})],['AÇIK']);await page.locator('.conflict').waitFor();assert.match(await page.locator('#tracks').innerText(),/farklı sonuç/);
  await supply([detection({x:.25}),detection({x:.75,closed:true})],['AÇIK','KAPALI']);
  await supply([detection({x:.25,closed:true}),detection({x:.75})],['KAPALI','AÇIK']);
  await mkdir('docs/screenshots',{recursive:true});await page.screenshot({path:'docs/screenshots/gesture-lab-orientation-synthetic.png',fullPage:true});
  await page.locator('#lab-stop').click();assert.equal(await page.locator('video').evaluate(v=>v.srcObject),null);
  assert.deepEqual(errors,[]);
  console.log('PASS: synthetic rotated 3D hands after real inference; None → geometry OPEN/CLOSED/OPEN; explicit model disagreement; independent simultaneous hands; Turkish source diagnostics; expanded details survive refresh; camera cleanup. NOT physical webcam accuracy.');
}finally{await browser?.close();server.kill();}
