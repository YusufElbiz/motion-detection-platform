import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {handFixture} from './hand-fixtures.mjs';
// Workshop (level 2) driven by hands only: real local recognizer on Chrome's
// fake camera, with landmarks replaced AFTER inference (same method as the
// fist test). Proves the wiring, not real-camera accuracy or child usability.
const origin='http://127.0.0.1:4179';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--configLoader','native','--host','127.0.0.1','--port','4179','--strictPort'],{stdio:'pipe',windowsHide:true});
let browser,page;
try{
 await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('4179'))resolve();});server.on('error',reject);server.on('exit',code=>reject(new Error(`Preview exited ${code}`)));setTimeout(()=>reject(new Error('Preview timeout')),15000).unref();});
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 const context=await browser.newContext({viewport:{width:1440,height:1120}});const errors=[];
 await context.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
 page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript({content:`window.__makeHand = ${handFixture.toString()};`});
 await page.addInitScript(()=>{
  window.__hands=[{x:.3,y:.5,closed:false}];
  const NativeWorker=window.Worker;
  window.Worker=class extends NativeWorker{
   constructor(url,options){super(url,options);if(!String(url).includes('inference-worker.js'))return;this.addEventListener('message',e=>{
    if(e.data.kind!=='result')return;
    e.data.result.detections=window.__hands.map((h,index)=>{
     const landmarks=window.__makeHand({rotation:90,tilt:65,...h});
     return {landmarks,worldLandmarks:landmarks.map(p=>({x:p.x*4/3*.3,y:p.y*.3,z:p.z*4/3*.3})),handedness:index?'Left':'Right',handednessScore:.91,modelGesture:{label:'None',score:.96}};
    });
   });}
  };
 });
 const set=(x,y,closed)=>page.evaluate(({x,y,closed})=>{window.__hands=[{x:.85-x/1280*.7,y:.15+y/720*.7,closed}];},{x,y,closed});
 let here={x:640,y:360};
 async function move(x,y,closed){for(let i=1;i<=10;i++){await set(here.x+(x-here.x)*i/10,here.y+(y-here.y)*i/10,closed);await page.waitForTimeout(65);}here={x,y};await page.waitForTimeout(150);}
 async function fist(x,y){await move(x,y,false);await page.waitForTimeout(150);await set(x,y,true);await page.waitForTimeout(350);}
 async function open(){await set(here.x,here.y,false);await page.waitForTimeout(350);}
 const logical=selector=>page.locator(selector).first().evaluate(n=>({x:parseFloat(n.style.left)*12.8,y:parseFloat(n.style.top)*7.2}));

 await page.goto(origin);
 await page.locator('#choose-hand').click();await page.locator('#start-workshop').click();
 await page.waitForFunction(()=>document.querySelector('#setup-guide').textContent.includes('iki elini'),{},{timeout:45000});
 await page.evaluate(()=>{window.__hands=[{x:.3,y:.5,closed:false},{x:.7,y:.5,closed:false}];});await page.waitForFunction(()=>document.querySelector('#setup-finish').disabled===false);
 for(const [x,y]of [[.15,.15],[.85,.15],[.15,.85],[.85,.85]]){await page.evaluate(({x,y})=>{window.__hands=[{x,y,closed:false}];},{x,y});await page.waitForTimeout(900);}
 await page.evaluate(()=>{window.__hands=[{x:.3,y:.5,closed:false},{x:.7,y:.5,closed:false}];});
 await page.locator('#workshop').waitFor({state:'visible',timeout:15000});
 assert.equal(await page.locator('#instructions').isVisible(),false,'the workshop entry skips the sorting tutorial');
 await set(640,360,false);await page.waitForFunction(()=>document.querySelectorAll('.hand-cursor').length===1);

 for(let round=0;round<3;round++){
  await page.waitForFunction(()=>document.querySelector('#workshop').dataset.phase==='gather');
  for(let k=0;k<2;k++){
   const target=await logical('.ws-item.needed:not(.placed)');
   await fist(target.x,target.y);
   await page.locator('.ws-item.held').waitFor({timeout:4000});
   await move(640,480,true);await open();
  }
  await page.waitForFunction(()=>document.querySelector('#workshop').dataset.phase==='combine');
  await move(640,330,false);await fist(640,250);await open();
  await page.waitForFunction(()=>document.querySelector('#workshop').dataset.phase==='paint',{},{timeout:5000});
  // Close the fist on a paint pot, then slide the closed fist across the craft.
  await fist(88+104*(round%2),225);await move(500,300,true);
  for(const x of [540,600,660,720,780])await move(x,330,true);
  await open();
  const painted=await page.locator('.ws-craft [data-region]').evaluateAll(paths=>paths.filter(p=>p.style.fill).length);
  assert.ok(painted>=1,`round ${round}: sliding a loaded fist must paint at least one part (painted ${painted})`);
  if(round===0)await page.screenshot({path:'docs/screenshots/workshop-paint.png'});
  await move(1060,610,false);await fist(1060,610);await open();
  await page.waitForFunction(()=>['celebrate','gather','gallery'].includes(document.querySelector('#workshop').dataset.phase));
  await page.waitForFunction(()=>document.querySelector('#workshop').dataset.phase!=='celebrate',{},{timeout:8000});
 }
 await page.waitForFunction(()=>document.querySelector('#workshop').dataset.phase==='gallery');
 assert.equal(await page.locator('.ws-gallery figure').count(),3);
 await page.screenshot({path:'docs/screenshots/workshop-gallery.png'});
 await move(710,625,false);await fist(710,625);await open();
 await page.locator('#menu').waitFor({state:'visible',timeout:5000});
 assert.deepEqual(errors,[]);
 console.log('PASS: hand-only workshop — gather, wrong-free placement, combine, fist paint stroke, done, gallery and menu exit.');
}catch(error){
 console.error('FAILURE:',error.stack??String(error));
 if(page){await page.evaluate(()=>{document.querySelector('#gesture-debug').checked=true;});await page.waitForTimeout(350);console.error('DIAGNOSTICS:',(await page.locator('#gesture-details').textContent()).slice(0,2500));}
 if(page)console.error('PHASE:',await page.locator('#workshop').getAttribute('data-phase').catch(()=>'?'),'MESSAGE:',await page.locator('#ws-message').textContent().catch(()=>'?'));
 process.exitCode=1;
}finally{await browser?.close();server.kill();}
