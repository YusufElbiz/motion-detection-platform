import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advance, classify, createState, sort, spawn,wasteName} from '../src/game.ts';
import {categoryIds} from '../src/config.ts';
import {wasteCatalog,variantsFor,wasteDefinition} from '../src/waste.ts';
import {wasteArt} from '../src/art.ts';
test('all sixteen category pairs classify correctly',()=>{for(const a of categoryIds) for(const b of categoryIds) assert.equal(classify(a,b),a===b);});
test('wrong bin preserves object and score; correct bin scores once',()=>{const s=createState();spawn(s,()=>0);assert.equal(sort(s,1,'paper'),false);assert.equal(s.score,0);assert.equal(s.objects.length,1);assert.equal(sort(s,1,'plastic'),true);assert.equal(s.score,1);assert.equal(sort(s,1,'plastic'),false);assert.equal(s.score,1);});
test('eight successful sorts complete the round; new state resets it',()=>{const s=createState();for(let i=0;i<8;i++){spawn(s,()=>0);const o=s.objects[0];sort(s,o.id,o.category);}assert.equal(s.complete,true);assert.equal(s.score,8);assert.deepEqual(createState(),{objects:[],score:0,nextId:1,elapsed:0,spawned:0,complete:false});});
test('falling uses elapsed time; held objects stay still; floor is forgiving',()=>{const s=createState();spawn(s,()=>0);advance(s,.05,'relaxed',1);assert.equal(s.objects[0].y,155);advance(s,.05,'relaxed',null);assert.equal(s.objects[0].y,156.5);for(let i=0;i<400;i++)advance(s,.05,'normal',null);assert.equal(s.objects[0].y,476);assert.ok(s.objects.length<=4);});
test('completed state stops updates; all categories appear',()=>{const s=createState();for(let i=0;i<4;i++)spawn(s,()=>0);assert.deepEqual(s.objects.map(o=>o.category),categoryIds);s.complete=true;const before=structuredClone(s);advance(s,.05,'normal',null);assert.deepEqual(s,before);});

const seeded=(seed:number)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
test('random category bags mix order and preserve all four materials in every batch',()=>{
 const s=createState(),random=seeded(1234);const batches:string[][]=[];
 for(let i=0;i<32;i++){spawn(s,random);if(i%4===0)batches.push([]);batches.at(-1)!.push(s.objects.at(-1)!.category);s.objects=[];}
 for(const batch of batches)assert.deepEqual([...batch].sort(),[...categoryIds].sort());
 assert.ok(batches.some(batch=>batch.join()!==categoryIds.join()));assert.ok(new Set(batches.map(batch=>batch.join())).size>1);
});
test('all sixteen variants appear before repeats within each material, with distinct SVG artwork',()=>{
 const s=createState(),random=seeded(5678);const seen=new Map<string,Set<string>>();
 for(let i=0;i<16;i++){spawn(s,random);const item=s.objects.at(-1)!;assert.equal(wasteDefinition(item.variant)?.category,item.category);const group=seen.get(item.category)??new Set();assert.ok(!group.has(item.variant!));group.add(item.variant!);seen.set(item.category,group);s.objects=[];}
 assert.equal(wasteCatalog.length,16);assert.equal(new Set(wasteCatalog.map(item=>item.id)).size,16);
 for(const category of categoryIds){assert.equal(seen.get(category)!.size,4);assert.equal(variantsFor(category).length,4);}
 assert.equal(new Set(wasteCatalog.map(item=>wasteArt(item.category,item.id))).size,16);
});
test('spawn position is independent of category and avoids an occupied drop column where possible',()=>{
 const make=(categoryDraw:number)=>{const values=[categoryDraw,.1,.37];const s=createState();spawn(s,()=>values.shift()??.9);return s.objects[0];};
 const plastic=make(0),glass=make(.55);assert.notEqual(plastic.category,glass.category);assert.equal(plastic.x,glass.x);
 const s=createState();s.objects.push({id:99,category:'paper',x:502.2,y:180});const values=[0,0,.37,.9];spawn(s,()=>values.shift()??.9);assert.ok(Math.abs(s.objects[1].x-s.objects[0].x)>=125);
 const random=seeded(99);for(let i=0;i<200;i++){s.objects=[];spawn(s,random);assert.ok(s.objects[0].x>=110&&s.objects[0].x<=1170);}
});
test('every illustrated variant sorts by its material and has its own Turkish object name',()=>{
 for(const definition of wasteCatalog){
  const s=createState();s.objects.push({id:1,category:definition.category,variant:definition.id,x:300,y:155});
  assert.equal(wasteName(s.objects[0]),definition.name);
  const wrong=categoryIds.find(category=>category!==definition.category)!;
  assert.equal(sort(s,1,wrong),false);assert.equal(sort(s,1,definition.category),true);assert.equal(s.score,1);
 }
});
