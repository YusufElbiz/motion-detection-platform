import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const manifest=JSON.parse(await readFile('public/audio/topik/auditions-2/manifest.json','utf8'));
assert.deepEqual(manifest.variants.map(v=>v.number),[4,5,6]);
assert.equal(new Set(manifest.variants.map(v=>v.prompt)).size,3);
assert.equal(new Set(manifest.variants.map(v=>v.seed)).size,3);
for(const v of manifest.variants)assert.equal(v.sentences.length,5);
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();const errors=[],external=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:5173'))external.push(r.url());});
 await page.goto('http://127.0.0.1:5173/voice-examples.html');
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('.cards audio')).every(a=>a.readyState>=1&&a.duration>5&&a.duration<60));
 const players=page.locator('.cards audio');assert.equal(await players.count(),3);
 for(let i=0;i<3;i++){
  await players.nth(i).evaluate(a=>a.play());await page.waitForFunction(index=>!document.querySelectorAll('.cards audio')[index].paused,i);
  if(i>0)assert.equal(await players.nth(i-1).evaluate(a=>a.paused),true);
 }
 await page.screenshot({path:'docs/screenshots/extra-voice-examples.png',fullPage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log('PASS: three new voice directions, five sentences each, real playback, exclusive controls and local-only requests. Subjective voice quality requires listening.');
}finally{await browser.close();}
