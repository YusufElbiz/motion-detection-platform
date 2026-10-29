import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MascotDirector,binGuideX,binGuideSpeech} from '../src/mascot-director.ts';
import type {Category} from '../src/config.ts';

function fixture(reduced=false){
 Object.defineProperty(globalThis,'window',{configurable:true,value:{matchMedia:()=>({matches:reduced})}});
 const properties=new Map<string,string>();
 const panel={style:{left:'',top:'',setProperty:(name:string,value:string)=>properties.set(name,value)},dataset:{} as Record<string,string>};
 const bins=Object.keys(binGuideX).map(category=>{
  const classes=new Set<string>();return {dataset:{category},classes,classList:{add:(name:string)=>classes.add(name),remove:(name:string)=>classes.delete(name)}};
 });
 const game={querySelectorAll:()=>bins};
 const director=new MascotDirector(panel as unknown as HTMLElement,game as unknown as HTMLElement);
 director.reset();return {panel,bins,director,properties};
}

test('Topik watches from the centre, helps at each correct bin and returns home',()=>{
 const {panel,bins,director,properties}=fixture();const initial=panel.style.left;
 for(let i=0;i<20;i++)director.tick(.05);
 assert.equal(panel.style.left,'50%');assert.equal(panel.dataset.behavior,'watching');
 for(let i=0;i<20;i++)director.tick(.05,[{id:1,x:100,y:155}]);
 assert.ok(parseFloat(properties.get('--eye-x')!)<0);assert.ok(parseFloat(properties.get('--eye-y')!)<0);
 for(let i=0;i<20;i++)director.tick(.05,[{id:1,x:100,y:155},{id:2,x:1150,y:470}]);
 assert.ok(parseFloat(properties.get('--eye-x')!)>0);assert.ok(parseFloat(properties.get('--eye-y')!)>0);
 assert.equal(panel.dataset.watchingObject,'2');assert.equal(panel.style.left,'50%');
 for(const category of Object.keys(binGuideX) as Category[]){
  director.guide(category);assert.equal(panel.dataset.guideCategory,category);
  assert.deepEqual(bins.filter(bin=>bin.classes.has('mascot-target')).map(bin=>bin.dataset.category),[category]);
  for(let i=0;i<70;i++)director.tick(.05);
  assert.ok(Math.abs(parseFloat(panel.style.left)-binGuideX[category]/1280*100)<.01);
  assert.equal(panel.dataset.arrived,'true');assert.match(binGuideSpeech[category],/buraya/);
 }
 director.celebrate();assert.equal(panel.dataset.behavior,'celebrating');
 assert.equal(bins.some(bin=>bin.classes.has('mascot-target')),false);
 const jumpX=panel.style.left;director.tick(.05);assert.equal(panel.style.left,jumpX);
 for(let i=0;i<100;i++)director.tick(.05);assert.equal(panel.dataset.behavior,'watching');assert.equal(panel.style.left,'50%');
 director.guide('glass');director.stop();assert.equal(panel.dataset.behavior,'resting');
 assert.equal(bins.some(bin=>bin.classes.has('mascot-target')),false);
 director.reset();assert.equal(panel.style.left,initial);assert.equal(panel.dataset.guideCategory,undefined);
 delete (globalThis as unknown as {window?:unknown}).window;
});

test('reduced motion still points to the correct bin immediately',()=>{
 const {panel,director}=fixture(true);director.guide('glass');director.tick(.05);
 assert.equal(parseFloat(panel.style.left),binGuideX.glass/1280*100);assert.equal(panel.dataset.arrived,'true');
 delete (globalThis as unknown as {window?:unknown}).window;
});
