import {chromium} from 'playwright';
import {readFile,stat} from 'node:fs/promises';
import assert from 'node:assert/strict';

const manifest=JSON.parse(await readFile('public/audio/topik/auditions/manifest.json','utf8'));
assert.equal(manifest.variants.length,3);assert.equal(manifest.steps,16);assert.equal(manifest.cfg,2);
assert.equal(new Set(manifest.variants.map(v=>v.seed)).size,3);
for(const v of manifest.variants){assert.ok((await stat(`public/audio/topik/auditions/${v.file}`)).size>1000);assert.equal(v.sentences.length,5);}
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1200,height:1000}});const errors=[],external=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:5173'))external.push(r.url());});
 await page.goto('http://127.0.0.1:5173/voice-auditions.html');
 const cards=page.locator('.cards audio');assert.equal(await cards.count(),3);
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('.cards audio')).every(a=>a.readyState>=1&&a.duration>5&&a.duration<60));
 await cards.nth(0).evaluate(a=>a.play());await page.waitForFunction(()=>!document.querySelectorAll('.cards audio')[0].paused);
 await cards.nth(1).evaluate(a=>a.play());assert.equal(await cards.nth(0).evaluate(a=>a.paused),true);
 await page.screenshot({path:'docs/screenshots/voice-auditions.png',fullPage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log('PASS: three distinct 5-sentence local voice auditions, audio metadata, real playback and non-overlapping controls; no external runtime requests.');
}finally{await browser.close();}
