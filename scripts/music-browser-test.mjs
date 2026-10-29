import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.addInitScript(()=>{
  window.__music=null;const play=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(){if(this.dataset.role==='background-music')window.__music=this;return play.call(this);};
 });
 await page.goto('http://127.0.0.1:5173');assert.equal(await page.evaluate(()=>window.__music),null);
 await page.locator('#start').click();
 await page.waitForFunction(()=>window.__music&&!window.__music.paused&&window.__music.currentTime>0);
 assert.match(await page.evaluate(()=>window.__music.src),/dogaya-dost-ol-no-intro\.mp3$/);
 assert.ok(await page.evaluate(()=>window.__music.duration)>170&&await page.evaluate(()=>window.__music.duration)<178);
 assert.equal(await page.evaluate(()=>window.__music.loop),true);
 await page.waitForFunction(()=>window.__music.volume<.05);
 await page.waitForFunction(()=>document.querySelector('#instructions').hidden);
 await page.waitForFunction(()=>window.__music.volume>.12);
 const before=await page.evaluate(()=>window.__music.currentTime);
 await page.locator('#pause').click();assert.equal(await page.evaluate(()=>window.__music.paused),true);
 await page.locator('#resume').click();await page.waitForFunction(()=>!window.__music.paused);
 assert.ok(await page.evaluate(()=>window.__music.currentTime)>=before-.1);
 await page.locator('#sound').click();assert.equal(await page.evaluate(()=>window.__music.paused),true);
 await page.locator('#sound').click();await page.waitForFunction(()=>!window.__music.paused);
 await page.locator('#home').click();assert.equal(await page.evaluate(()=>window.__music.paused),true);assert.equal(await page.evaluate(()=>window.__music.currentTime),0);
 assert.deepEqual(errors,[]);console.log('PASS: user music decodes and plays; loop, speech ducking/restoration, pause/resume position, mute/unmute and menu stop/reset.');
}finally{await browser.close();}
