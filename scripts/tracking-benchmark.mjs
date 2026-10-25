import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const label=process.argv[2]??'after';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--configLoader','native','--host','127.0.0.1','--port','4176','--strictPort'],{stdio:'pipe',windowsHide:true});
let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('4176'))resolve();});server.on('error',reject);server.on('exit',code=>reject(new Error(`Preview exited ${code}`)));setTimeout(()=>reject(new Error('Preview timeout')),15000).unref();});
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:4176/');await page.locator('#choose-hand').click();await page.locator('#start').click();
 await page.waitForFunction(()=>document.querySelector('#motion-metrics').textContent.includes('Çıkarım'),{},{timeout:45000});
 const samples=[];for(let i=0;i<12;i++){await page.waitForTimeout(1000);samples.push(await page.locator('#motion-metrics').textContent());}
 await page.locator('#setup-cancel').click();assert.deepEqual(errors,[]);
 const result={label,environment:'Headless Chrome fake camera, actual CPU model, no physical hand. App pipeline sampled once/second, 12 seconds. Not a hand accuracy or end-to-end latency benchmark.',samples,errors};
 await writeFile(`docs/motion-rework-${label}.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser?.close();server.kill();}
