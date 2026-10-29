import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5173');await page.locator('#waste-count').fill('4');await page.locator('#start').click();
 const game=page.locator('.game');
 const summary=()=>game.evaluate(el=>({progress:el.dataset.natureProgress,stage:el.dataset.natureStage,grass:el.style.getPropertyValue('--nature-grass'),litter:[...el.querySelectorAll('.scenery-litter')].filter(n=>+n.style.opacity>0).length,flowers:[...el.querySelectorAll('.scenery-flower')].filter(n=>+n.style.opacity>0).length}));
 const initial=await summary();assert.equal(initial.progress,'0.000');assert.equal(initial.stage,'polluted');assert.equal(initial.litter,20);assert.equal(initial.flowers,0);
 await game.screenshot({path:'docs/screenshots/environment-before.png'});
 const bins={plastic:0,paper:1,glass:2,metal:3};
 async function drag(wrong=false){
  const waste=page.locator('.waste').first();await waste.waitFor();
  const category=await waste.getAttribute('data-category');const index=bins[category];
  const box=await waste.boundingBox(),field=await page.locator('#playfield').boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
  await page.mouse.move(field.x+field.width*(304+224*(wrong?(index+1)%4:index))/1280,field.y+field.height*590/720,{steps:12});await page.mouse.up();
 }
 await drag(true);assert.deepEqual(await summary(),initial,'wrong bins never restore or degrade the garden');
 for(let i=1;i<=4;i++){
  await drag();const result=await summary();assert.equal(+result.progress,i/4);assert.equal(result.litter,20-i*5);assert.equal(result.flowers,i*3);assert.notEqual(result.grass,initial.grass);
  if(i===2){await page.waitForTimeout(1300);await game.screenshot({path:'docs/screenshots/environment-halfway.png'});}
 }
 assert.equal((await summary()).stage,'restored');assert.equal(await page.locator('#result').isVisible(),true);
 await page.waitForTimeout(1400);await game.screenshot({path:'docs/screenshots/environment-after.png'});
 assert.equal(await page.locator('.environment-grime').evaluate(el=>getComputedStyle(el).opacity),'0');
 assert.equal(await page.locator('.nature-wildlife').evaluate(el=>getComputedStyle(el).opacity),'1');
 await page.locator('#again').click();assert.equal((await summary()).stage,'polluted');assert.equal((await summary()).litter,20);
 await page.locator('#home').click();await page.locator('#waste-count').fill('1');await page.locator('#start').click();await drag();assert.equal((await summary()).stage,'restored');
 await page.locator('#home').click();await page.locator('#waste-count').fill('40');await page.locator('#start').click();await drag();assert.equal((await summary()).progress,'0.025');
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.nature-bird').evaluate(el=>getComputedStyle(el).animationName),'none');
 assert.deepEqual(errors,[]);console.log('PASS: dirty start, progressive litter removal/greening/flowers, clean finish, wrong-bin stability, replay reset, 1/4/40 goals and reduced motion.');
}finally{await browser.close();}
