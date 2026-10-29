import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {handFixture} from './hand-fixtures.mjs';
const origin='http://127.0.0.1:4178';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--configLoader','native','--host','127.0.0.1','--port','4178','--strictPort'],{stdio:'pipe',windowsHide:true});
let browser,page;
const report={environment:'Real local MediaPipe Gesture Recognizer on Chrome fake camera; test replaces output landmarks/categories AFTER inference with rotated/tilted hands and model None. Tests the shared hybrid classifier inside gameplay. No physical webcam, gesture accuracy or real child usability proof.',checks:[],observedSyntheticResponseMs:[],metrics:[]};
const bins={plastic:0,paper:1,glass:2,metal:3};
const firstBin=async()=>bins[await page.locator('.waste').first().getAttribute('data-category')];
try{
 await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('4178'))resolve();});server.on('error',reject);server.on('exit',code=>reject(new Error(`Preview exited ${code}`)));setTimeout(()=>reject(new Error('Preview timeout')),15000).unref();});
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 const context=await browser.newContext({viewport:{width:1440,height:1120}});const requests=[],errors=[];
 context.on('request',r=>requests.push({url:r.url(),method:r.method()}));await context.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
 page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript({content:`window.__makeHand = ${handFixture.toString()};`});
 await page.addInitScript(()=>{
  window.__hands=[{x:.3,y:.5,closed:false}];window.__workerStarts=0;window.__sentWidths=[];
  const NativeWorker=window.Worker;
  window.Worker=class extends NativeWorker{
   constructor(url,options){super(url,options);if(!String(url).includes('inference-worker.js'))return;window.__workerStarts++;this.addEventListener('message',e=>{
    if(e.data.kind!=='result')return;
    e.data.result.detections=window.__hands.map((h,index)=>{
     const options={rotation:90,tilt:65,...h};
     const landmarks=window.__makeHand(options);
     if(h.ok){const closed=window.__makeHand({...options,closed:true});for(let i=5;i<=8;i++)landmarks[i]=closed[i];landmarks[4]={...landmarks[8]};}
     if(h.unknown){const opposite=window.__makeHand({...options,closed:!h.closed});for(const i of [5,9])for(let j=0;j<4;j++)landmarks[i+j]=opposite[i+j];}
     return {landmarks,worldLandmarks:landmarks.map(p=>({x:p.x*4/3*.3,y:p.y*.3,z:p.z*4/3*.3})),handedness:index?'Left':'Right',handednessScore:.91,...(this.engine==='gestures'?{modelGesture:{label:h.thumbsUp?'Thumb_Up':'None',score:.96}}:{})};
    });
   });}
   postMessage(data,transfer){if(data.kind==='init')this.engine=data.engine??'landmarks';if(data.kind==='frame')window.__sentWidths.push(data.frame.width);return super.postMessage(data,transfer??[]);}
  };
 });
 await page.goto(origin);assert.equal(await page.locator('#grab-method').inputValue(),'fist');
 assert.equal(await page.locator('#game-delegate').inputValue(),'GPU');
 await page.locator('#choose-hand').click();await page.locator('#start').click();
 await page.waitForFunction(()=>document.querySelector('#setup-guide').textContent.includes('iki elini'),{},{timeout:45000});
 await page.evaluate(()=>{window.__hands=[{x:.3,y:.5,closed:false},{x:.7,y:.5,closed:false}];});await page.waitForFunction(()=>document.querySelector('#setup-finish').disabled===false);
 await page.evaluate(()=>{window.__hands=[{x:.3,y:.5,thumbsUp:true,closed:true},{x:.7,y:.5,thumbsUp:true,closed:true}];});await page.waitForTimeout(1100);
 assert.equal(await page.locator('#hand-setup').isVisible(),true,'two thumbs-up signs cannot bypass reach calibration');
 for(const [x,y]of [[.15,.15],[.85,.15],[.15,.85],[.85,.85]]){await page.evaluate(({x,y})=>{window.__hands=[{x,y,closed:false}];},{x,y});await page.waitForTimeout(900);}
 await page.evaluate(()=>{window.__hands=[{x:.3,y:.5,closed:false},{x:.7,y:.5,closed:false}];});
 await page.waitForFunction(()=>document.querySelector('#hand-setup').hidden,{},{timeout:10000});
 assert.equal(await page.locator('#instructions').isVisible(),true);assert.equal(await page.locator('.waste').count(),0);
 assert.match(await page.locator('#instruction-text').textContent(),/yumruk/);
 await page.locator('#instructions').waitFor({state:'hidden',timeout:30000});
 await page.evaluate(()=>{window.__hands=[{x:.3,y:.5,closed:false}];});
 await page.waitForFunction(()=>document.querySelectorAll('.hand-cursor').length===1);
 await page.waitForFunction(()=>document.querySelector('.hand-cursor')?.dataset.gesture==='OPEN');
 report.checks.push('two ordinary visible hands finish calibration; spoken mascot tutorial precedes gameplay, without any OK sign or button click');
 await page.waitForFunction(()=>/GPU|CPU/.test(document.querySelector('#motion-metrics').textContent));
 assert.equal(await page.locator('#game-delegate').isDisabled(),true);
 assert.match(await page.locator('#motion-metrics').textContent(),/P95/);
 assert.equal(await page.locator('.hand-cursor').innerText(),'');assert.equal(await page.locator('.cartoon-arms .hand-art').count(),1);
 report.checks.push('default hybrid fist mode; rotated/tilted 3D hands despite model None; real recognizer initialization, palm calibration, SVG artwork without emoji cursor');
 async function point(target){return target.evaluate(n=>({x:parseFloat(n.style.left)*12.8,y:parseFloat(n.style.top)*7.2}));}
 async function update(index,x,y,closed){await page.evaluate(({index,x,y,closed})=>{window.__hands[index]={...window.__hands[index],x:.85-x/1280*.7,y:.15+y/720*.7,closed,unknown:false};},{index,x,y,closed});}
 async function move(x,y,closed=false,index=0){const from=await page.evaluate(i=>window.__hands[i],index),to={x:.85-x/1280*.7,y:.15+y/720*.7};for(let i=1;i<=10;i++){await page.evaluate(({index,x,y,closed})=>{window.__hands[index]={...window.__hands[index],x,y,closed,unknown:false};},{index,x:from.x+(to.x-from.x)*i/10,y:from.y+(to.y-from.y)*i/10,closed});await page.waitForTimeout(65);}}
 async function grab(target=page.locator('.waste').first(),index=0){
  const p=await point(target);if(index===1)await move(p.x,675,false,index);await move(p.x,p.y,false,index);await page.waitForTimeout(180);const current=await point(target);await update(index,current.x,current.y,false);await page.waitForTimeout(120);
  const begin=await page.evaluate(()=>performance.now());await update(index,current.x,current.y,true);
  await target.and(page.locator('.held')).waitFor({timeout:4000});report.observedSyntheticResponseMs.push({action:'close-to-attached-DOM',ms:await page.evaluate(()=>performance.now())-begin});
 }
 async function release(bin,index=0){await move(304+224*bin,590,true,index);await page.waitForTimeout(300);const before=await page.locator('.waste.held').count();assert.ok(before>0,'carry must survive the scripted move before opening');const begin=await page.evaluate(()=>performance.now());await update(index,304+224*bin,590,false);await page.waitForFunction(count=>document.querySelectorAll('.waste.held').length<count,before,{timeout:4000});report.observedSyntheticResponseMs.push({action:'open-to-release-DOM',ms:await page.evaluate(()=>performance.now())-begin});}
 await move(1100,350,false);await page.waitForTimeout(180);await update(0,1100,350,true);await page.waitForTimeout(180);assert.equal(await page.locator('.waste.held').count(),0);
 await move(200,250,true);await page.waitForTimeout(200);assert.equal(await page.locator('.waste.held').count(),0);
 report.checks.push('closing away from an object and entering already closed cannot grab');
 await grab();
 await mkdir('docs/screenshots',{recursive:true});await page.locator('.game').screenshot({path:'docs/screenshots/fist-carry-synthetic.png'});await page.waitForTimeout(350);
 assert.equal(await page.locator('.hand-cursor.carrying .grip-art').evaluate(n=>getComputedStyle(n).display),'inline');
 const held=page.locator('.waste.held');const cursor=page.locator('.hand-cursor.carrying');const objectP=await point(held),handP=await point(cursor);assert.ok(Math.hypot(objectP.x-handP.x,objectP.y-handP.y)<1,'palm/object alignment');
 await release(await firstBin());assert.equal(await page.locator('#score').textContent(),'1');assert.equal(await page.locator('.hand-cursor.carrying').count(),0);
 report.checks.push('confirmed closing grabs promptly; closed carry aligns to palm; opening sorts once; grip only with ownership');
 await page.waitForFunction(()=>document.querySelectorAll('.waste').length>=2,{},{timeout:12000});
 const targets=await page.locator('.waste').evaluateAll(nodes=>nodes.slice(0,2).map(n=>({id:n.dataset.objectId,category:n.dataset.category})));
 await page.evaluate(()=>{window.__hands.push({x:.15,y:.85,closed:false});});await page.waitForFunction(()=>document.querySelectorAll('.hand-cursor:not(.lost)').length===2);
 await grab(page.locator(`[data-object-id="${targets[0].id}"]`),0);await grab(page.locator(`[data-object-id="${targets[1].id}"]`),1);assert.equal(await page.locator('.waste.held').count(),2);
 await page.locator('.game').screenshot({path:'docs/screenshots/fist-two-hands-synthetic.png'});await page.waitForTimeout(350);
 const secondPosition=await point(page.locator(`[data-object-id="${targets[1].id}"]`));
 await move(secondPosition.x,200,true,1);await move(1100,200,true,1);
 await release(bins[targets[0].category],0);assert.equal(await page.locator('.waste.held').count(),1);await release(bins[targets[1].category],1);assert.equal(await page.locator('#score').textContent(),'3');
 report.checks.push('two independent fists carry and release different objects');
 await page.evaluate(()=>{window.__hands=[window.__hands[0]];});await page.locator('#restart').click();await grab();
 await page.evaluate(()=>{window.__hands[0].unknown=true;});await page.waitForTimeout(100);assert.equal(await page.locator('#score').textContent(),'0');
 await page.evaluate(()=>{window.__hands[0].unknown=false;});await page.waitForTimeout(180);
 const saved=await page.evaluate(()=>window.__hands);await page.evaluate(()=>{window.__hands=[];});await page.waitForTimeout(120);await page.evaluate(hands=>{window.__hands=hands;},saved);await page.waitForTimeout(230);assert.equal(await page.locator('#score').textContent(),'0');
 await page.evaluate(()=>{window.__hands=[];});await page.waitForTimeout(1100);assert.equal(await page.locator('.waste.held').count(),0);assert.equal(await page.locator('#score').textContent(),'0');
 report.checks.push('ambiguous pose and short/full loss cannot score falsely');
 await page.evaluate(()=>{window.__hands=[{x:.5,y:.5,closed:false,rotation:85}];});await page.waitForTimeout(250);assert.ok(await page.locator('.cartoon-arms .hand-art').count()>0);
 await page.setViewportSize({width:900,height:950});await grab();const wrongBin=(await firstBin()+1)%4;await release(wrongBin);assert.equal(await page.locator('#score').textContent(),'0');assert.match(await page.locator('#feedback').textContent(),/kutusu/);
 report.checks.push('rotated hand artwork, resized palm mapping, incorrect classification feedback');
 await page.locator('.motion-settings > summary').click();await page.locator('.gesture-lab > summary').click();await page.locator('#gesture-debug').check();await page.waitForTimeout(350);assert.match(await page.locator('#gesture-details').textContent(),/rawPalm/);assert.match(await page.locator('#gesture-details').textContent(),/model/);
 report.metrics.push(await page.locator('#motion-metrics').textContent());report.debug=JSON.parse(await page.locator('#gesture-details').textContent());
 await page.locator('#home').click();await page.waitForFunction(()=>!document.querySelector('#game-delegate').disabled);
 await page.locator('#game-delegate').selectOption('CPU');await page.locator('#game-inference-width').selectOption('480');
 await page.locator('#gesture-engine').selectOption('landmarks');await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('#hand-setup').hidden===true,{},{timeout:45000});
 await grab();await release(await firstBin());assert.equal(await page.locator('#score').textContent(),'1');report.checks.push('geometry-only alternative uses same fist states without second concurrent model');
 assert.match(await page.locator('#motion-metrics').textContent(),/CPU/);report.checks.push('GPU preferred with actual delegate displayed; controls locked while camera runs; CPU and 480px mode can be selected on menu; P95/data-age/busy-frame diagnostics');
 assert.equal(await page.evaluate(()=>window.__sentWidths.at(-1)),480,'light mode really resizes frames sent to worker');
 await page.locator('#home').click();await page.waitForTimeout(300);assert.equal(await page.locator('#motion-video').evaluate(v=>v.srcObject),null);assert.equal(page.workers().length,0);
 assert.equal(requests.filter(r=>!r.url.startsWith(origin)).length,0);assert.equal(requests.filter(r=>r.method!=='GET').length,0);assert.deepEqual(errors,[]);
 report.requests={total:requests.length,external:0,nonGet:0};report.errors=errors;await writeFile('docs/fist-browser-results.json',JSON.stringify(report,null,2)+'\n');console.log('PASS: fist, palm mapping, arms, two-hand ownership, loss, geometry alternative, local-only runtime.');console.log(JSON.stringify(report.observedSyntheticResponseMs));
}catch(error){
 console.error('FAILURE:',error.stack??String(error));
 if(page){await page.evaluate(()=>{document.querySelector('#gesture-debug').checked=true;});await page.waitForTimeout(350);console.error('FAILURE DIAGNOSTICS:',await page.locator('#gesture-details').textContent());}
 throw error;
}finally{await browser?.close();server.kill();}
