import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WorkshopWorld,workshopLayout,targetIds} from '../src/workshop/world.ts';
import {recipes,chooseRecipes,paintColors} from '../src/workshop/recipes.ts';
import {MotionInput} from '../src/motion/input.ts';
import {palmCenter} from '../src/tracking/coordinates.ts';
import type {GameInputEvent,Position} from '../src/input.ts';
import type {TrackedHand} from '../src/tracking/types.ts';

// The fake craft has its regions in a horizontal strip across the craft area.
const regionAt=(p:Position)=>p.y>300&&p.y<420&&p.x>440&&p.x<840?Math.min(4,Math.floor((p.x-440)/80)):undefined;
const event=(type:GameInputEvent['type'],x:number,y:number,pointerId='a',source:'mouse'|'hand'='hand'):GameInputEvent=>({type,pointerId,source,position:{x,y}});
function setup(){const world=new WorkshopWorld(regionAt);world.start([recipes[0],recipes[1]],()=>0);return world;}
const carryTo=(world:WorkshopWorld,id:number,x:number,y:number,pointer='a')=>{
  const item=world.items.find(i=>i.id===id)!;
  world.dispatch(event('grab-start',item.x,item.y,pointer));world.dispatch(event('grab-held',x,y,pointer));
  return world.dispatch(event('grab-release',x,y,pointer));
};

test('recipes have two distinct materials, a distractor and paintable regions in their art',()=>{
  for(const recipe of recipes){
    assert.equal(new Set([...recipe.items,recipe.distractor]).size,3);
    for(let i=0;i<recipe.regions.length;i++)assert.match(recipe.art,new RegExp(`data-region="${i}"`));
  }
});
test('recipe choice prefers crafts made from materials collected in the first level',()=>{
  const chosen=chooseRecipes(['glass-jar','paper-bag','plastic-bottle'],2,()=>0);
  assert.equal(chosen[0].id,'lantern');assert.equal(chosen.length,2);
  assert.equal(chooseRecipes([],3).length,3);
});
test('needed items snap onto the table, a distractor and off-table drops return to the tray',()=>{
  const world=setup();const {table}=workshopLayout;
  const distractor=world.items.find(i=>!i.needed)!,needed=world.items.filter(i=>i.needed);
  assert.equal(carryTo(world,distractor.id,640,480)?.kind,'wrong');assert.equal(distractor.x,distractor.home.x);
  assert.equal(carryTo(world,needed[0].id,640,150)?.kind,'returned');
  const placed=carryTo(world,needed[0].id,(table.left+table.right)/2,(table.top+table.bottom)/2);
  assert.equal(placed?.kind,'placed');assert.equal(placed?.kind==='placed'&&placed.remaining,1);
  assert.equal(world.objectAt({x:needed[0].x,y:needed[0].y}),undefined);
  assert.equal(carryTo(world,needed[1].id,700,500)?.kind,'placed');assert.equal(world.phase,'combine');
});
test('combine, pinch a colour, drop it on parts and finish all crafts into the gallery',()=>{
  const world=setup();
  for(const item of world.items.filter(i=>i.needed))carryTo(world,item.id,640,480);
  const {combine,pots,done}=workshopLayout;
  assert.equal(world.dispatch(event('grab-start',combine.x,combine.y))?.kind,'combine');assert.equal(world.phase,'crafting');
  world.finishCrafting();assert.equal(world.phase,'paint');
  assert.equal(world.dispatch(event('grab-start',460,360))?.kind,'need-color');
  const picked=world.dispatch(event('grab-start',pots[2].x,pots[2].y));
  assert.equal(picked?.kind==='color'&&picked.color,paintColors[2].value);
  assert.equal(world.heldBy('a'),999);assert.equal(world.pinchGrab,true);
  // Carrying over parts only highlights; nothing is painted until release.
  assert.equal(world.dispatch(event('grab-held',460,360)),undefined);assert.equal(world.dropTargets.get('a'),0);
  assert.equal(world.dispatch(event('grab-held',540,360)),undefined);assert.equal(world.paint.size,0);
  assert.equal(world.dispatch(event('grab-release',540,360))?.kind,'painted');assert.deepEqual([...world.paint.keys()],[1]);
  assert.equal(world.heldBy('a'),undefined);assert.equal(world.dropTargets.size,0);
  // Dropping beside the craft paints nothing.
  world.dispatch(event('grab-start',pots[2].x,pots[2].y));assert.equal(world.dispatch(event('grab-release',640,200)),undefined);
  const results=[460,620,700,780].map(x=>{world.dispatch(event('grab-start',pots[2].x,pots[2].y));world.dispatch(event('grab-held',x,360));return world.dispatch(event('grab-release',x,360));});
  assert.deepEqual(results.map(r=>r?.kind),['painted','painted','painted','painted']);
  assert.equal(results[3]?.kind==='painted'&&results[3].complete,true);
  assert.equal(world.dispatch(event('grab-start',done.x,done.y))?.kind,'done');
  world.next(()=>0);assert.equal(world.phase,'gather');assert.equal(world.index,1);assert.equal(world.paint.size,0);
  for(const item of world.items.filter(i=>i.needed))carryTo(world,item.id,640,480);
  world.dispatch(event('grab-start',combine.x,combine.y));world.finishCrafting();
  world.dispatch(event('grab-start',done.x,done.y));world.next();
  assert.equal(world.phase,'gallery');assert.equal(world.gallery.length,2);assert.equal(world.gallery[0].paint.size,5);
  assert.equal(world.dispatch(event('grab-start',workshopLayout.gallery.menu.x,workshopLayout.gallery.menu.y))?.kind,'menu');
});
test('two hands carry different items and a lost hand returns its item to the tray',()=>{
  const world=setup();const [a,b]=world.items;
  world.dispatch(event('grab-start',a.x,a.y,'left'));world.dispatch(event('grab-start',b.x,b.y,'right'));
  assert.equal(world.heldBy('left'),a.id);assert.equal(world.heldBy('right'),b.id);
  world.dispatch(event('grab-held',600,300,'left'));world.dispatch(event('input-disabled',600,300,'left'));
  assert.equal(a.x,a.home.x);assert.equal(world.heldBy('left'),undefined);assert.equal(world.heldBy('right'),b.id);
});
test('dwell control paints with single touches instead of holding a brush',()=>{
  const world=setup();world.brushOnHold=false;
  for(const item of world.items.filter(i=>i.needed))carryTo(world,item.id,640,480);
  world.dispatch(event('grab-start',workshopLayout.combine.x,workshopLayout.combine.y));world.finishCrafting();
  world.dispatch(event('grab-start',workshopLayout.pots[0].x,workshopLayout.pots[0].y));
  assert.equal(world.heldBy('a'),undefined);
  assert.equal(world.dispatch(event('grab-start',460,360))?.kind,'painted');assert.equal(world.heldBy('a'),undefined);
  assert.equal(world.objectAt({x:460,y:360})?.id,targetIds.region);
});

function hand(x:number,y:number,closed=false):TrackedHand {
  const p={x:1-x/1280,y:y/720,z:0};const points=Array.from({length:21},()=>({...p}));
  points[0].y+=.16;points[9].y+=.04;points[5].x-=.05;points[17].x+=.05;points[4].x+=closed?.012:.12;
  return {id:1,colorSlot:0,landmarks:points,raw:structuredClone(points),indexTip:points[8],thumbTip:points[4],wrist:points[0],palmCenter:palmCenter(points),handedness:'Right',handednessScore:.9};
}
test('the same MotionInput drives the workshop after switching worlds',()=>{
  const world=setup();const kinds:string[]=[];
  const motion=new MotionInput(world,e=>{const r=world.dispatch(e);if(r)kinds.push(r.kind);});
  motion.settings.method='dwell';motion.settings.dwellGrabMs=200;motion.settings.dwellReleaseMs=200;motion.enable();
  let now=0;const target=world.items.find(i=>i.needed)!;
  const hold=(x:number,y:number,frames:number)=>{for(let i=0;i<frames;i++){now+=50;motion.update({timestamp:now,hands:[hand(x,y)],ambiguous:false});}};
  hold(target.x,target.y,8);assert.equal(world.heldBy('hand-1'),target.id);
  for(let k=1;k<=8;k++)hold(target.x+(640-target.x)*k/8,target.y+(480-target.y)*k/8,1);
  hold(640,480,8);assert.deepEqual(kinds,['picked','placed']);
  motion.useWorld(world);assert.equal(world.heldBy('hand-1'),undefined);
});

test('in the paint step a thumb + index pinch picks paint up and opening drops it on a part',()=>{
  const world=setup();const kinds:string[]=[];
  for(const item of world.items.filter(i=>i.needed))carryTo(world,item.id,640,480);
  world.dispatch(event('grab-start',workshopLayout.combine.x,workshopLayout.combine.y));world.finishCrafting();
  const motion=new MotionInput(world,e=>{const r=world.dispatch(e);if(r)kinds.push(r.kind);});motion.settings.smoothCutoff=0;motion.enable();
  let now=0;const pot=workshopLayout.pots[1];
  // In this fixture a "closed" thumb touches the index tip: a pinch, not a fist.
  const frames=(x:number,y:number,pinch:boolean,count:number)=>{for(let i=0;i<count;i++){now+=50;motion.update({timestamp:now,hands:[hand(x,y,pinch)],ambiguous:false});}};
  frames(pot.x,pot.y,false,6);frames(pot.x,pot.y,true,6);
  assert.equal(world.heldBy('hand-1'),999);assert.deepEqual(kinds,['color']);
  for(let k=1;k<=6;k++)frames(pot.x+(620-pot.x)*k/6,pot.y+(360-pot.y)*k/6,true,1);
  frames(620,360,true,3);assert.equal(world.paint.size,0);assert.equal(world.dropTargets.get('hand-1'),2);
  frames(620,360,false,6);
  assert.deepEqual(kinds,['color','painted']);assert.equal(world.paint.get(2),paintColors[1].value);
});
