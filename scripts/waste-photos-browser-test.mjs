import {chromium} from 'playwright';
import {readdir,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';

const files=(await readdir('public/waste')).filter(name=>name.endsWith('.png'));
assert.equal(files.length,16);
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1000,height:1100}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5173');
 const results=await page.evaluate(async files=>{
  return Promise.all(files.map(async file=>{
   const img=new Image();img.src=`/waste/${file}`;await img.decode();
   const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
   const context=canvas.getContext('2d');context.drawImage(img,0,0);
   const data=context.getImageData(0,0,canvas.width,canvas.height).data;
   let transparent=0,visible=0;
   for(let i=3;i<data.length;i+=4){if(data[i]===0)transparent++;if(data[i]>0)visible++;}
   return {file,width:img.naturalWidth,height:img.naturalHeight,transparent,visible};
  }));
 },files);
 for(const item of results){assert.ok(item.width>=512,item.file);assert.ok(item.transparent>100,item.file+' has transparent alpha');assert.ok(item.visible>100,item.file+' contains an object');}
 await page.route('**/__waste-gallery',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));
 await page.goto('http://127.0.0.1:5173/__waste-gallery');
 await page.setContent(`<html><body style="margin:0;padding:24px;background:#e8f1e8;font:14px system-ui;display:grid;grid-template-columns:repeat(4,1fr);gap:18px">${files.map(file=>`<div style="height:244px;text-align:center;background:#fff8;border-radius:12px;padding:8px"><img src="http://127.0.0.1:5173/waste/${file}" style="width:100%;height:210px;object-fit:contain"><div>${file}</div></div>`).join('')}</body></html>`);
 await page.locator('img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
 await mkdir('docs/screenshots',{recursive:true});await page.screenshot({path:'docs/screenshots/waste-photos.png',fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('PASS: all 16 local PNGs decode, have visible objects and transparent alpha; contact sheet saved.');
}finally{await browser.close();}
