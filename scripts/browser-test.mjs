import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';

const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--configLoader','native','--host','127.0.0.1','--port','4173','--strictPort'],{stdio:'pipe',windowsHide:true});
let browser;
try {
 await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('4173'))resolve();});server.on('error',reject);server.on('exit',code=>reject(new Error(`Preview server exited ${code}`)));setTimeout(()=>reject(new Error('Preview startup timed out')),15000).unref();});
 browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1100}});
 const errors=[]; const external=[];
 page.on('pageerror',error=>errors.push(String(error)));
 page.on('console',message=>{if(message.type()==='error') errors.push(message.text());});
 page.on('request',request=>{if(!request.url().startsWith('http://127.0.0.1:4173'))external.push(request.url());});
 await page.goto('http://127.0.0.1:4173');
 await mkdir('docs/screenshots',{recursive:true});
 assert.equal(await page.locator('#menu').isVisible(),true);
 await page.screenshot({path:'docs/screenshots/menu.png',fullPage:true});
 await page.locator('#difficulty').selectOption('normal');
 await page.evaluate(()=>{window.__nativeWasteRandom=Math.random;Math.random=()=>0;});
 await page.locator('#start').click();
 await page.locator('.waste').first().waitFor();
 assert.equal(await page.locator('#menu').isVisible(),false);
 const object=page.locator('.waste').first();
 const initialArt=await object.innerHTML();assert.equal(await object.getAttribute('data-category'),'plastic');
 const bins={plastic:0,paper:1,glass:2,metal:3};
 const correctBin=async target=>bins[await target.getAttribute('data-category')];
 assert.ok(await object.getAttribute('data-variant'),'spawned object has a catalog variant');
 const before=await object.boundingBox(); await page.waitForTimeout(300);const after=await object.boundingBox();assert.ok(after.y>before.y,'object falls');
 const field=page.locator('#playfield');
 async function dragTo(target,index){
  const o=await target.boundingBox(); const r=await field.boundingBox();
  await page.mouse.move(o.x+o.width/2,o.y+o.height/2);await page.mouse.down();
  await page.mouse.move(r.x+r.width*(304+224*index)/1280,r.y+r.height*590/720,{steps:15});
  assert.ok(await target.evaluate(n=>n.classList.contains('held')),'drag captures object');
  await page.mouse.up();
 }
 const firstBin=await correctBin(object);
 await dragTo(object,(firstBin+1)%4);
 assert.equal(await page.locator('#score').textContent(),'0');
 assert.ok((await page.locator('#feedback').textContent()).includes(await page.locator('.bin strong').nth(firstBin).textContent()));
 await dragTo(object,firstBin);
 assert.equal(await page.locator('#score').textContent(),'1');
 await page.locator('#sound').click();assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'true');
 await page.locator('#sound').click();assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'false');
 await page.evaluate(()=>{Math.random=()=>.99;});
 await page.locator('#restart').click();assert.equal(await page.locator('#score').textContent(),'0');
 assert.equal(await page.locator('.waste').first().getAttribute('data-category'),'metal','restart refreshes reused DOM category');
 assert.notEqual(await page.locator('.waste').first().innerHTML(),initialArt,'restart refreshes artwork');
 await page.evaluate(()=>{Math.random=window.__nativeWasteRandom;});
 await page.locator('#pause').click();const pausedY=(await page.locator('.waste').boundingBox()).y;await page.waitForTimeout(300);assert.equal((await page.locator('.waste').boundingBox()).y,pausedY);await page.locator('#resume').click();
 await page.setViewportSize({width:850,height:800});await dragTo(page.locator('.waste').first(),await correctBin(page.locator('.waste').first()));assert.equal(await page.locator('#score').textContent(),'1');
 await page.setViewportSize({width:1440,height:1100});
 for(let score=1;score<8;score++) {
  const next=page.locator('.waste').first();await next.waitFor({timeout:10000});
  const index=await correctBin(next);assert.ok(index>=0);
  await dragTo(next,index);assert.equal(await page.locator('#score').textContent(),String(score+1));
 }
 assert.equal(await page.locator('#result').isVisible(),true);
 await page.screenshot({path:'docs/screenshots/completed.png',fullPage:true});
 await page.locator('#again').click();assert.equal(await page.locator('#score').textContent(),'0');
 await page.screenshot({path:'docs/screenshots/gameplay.png',fullPage:true});
 // Re-open the built app with browser networking restricted to localhost.
 await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:4173')?route.continue():route.abort());
 await page.reload();await page.locator('#start').click();await page.locator('.waste').waitFor();
 assert.equal(external.length,0,`external requests: ${external}`);
 assert.equal(errors.length,0,`browser errors: ${errors}`);
 console.log('PASS: production startup, Turkish menu, start, falling, mouse drag, wrong/correct bins, scoring, sound state, reset, pause/resume, resized drag, 8-star completion, replay, localhost-only runtime, zero browser console/page errors.');
} finally {await browser?.close(); server.kill();}
