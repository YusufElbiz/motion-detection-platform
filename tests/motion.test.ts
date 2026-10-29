import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createState,spawn,advance} from '../src/game.ts';
import {InteractionController,binAt,objectContains} from '../src/interaction.ts';
import {PinchRecognizer,pinchRatio} from '../src/motion/pinch.ts';
import {DwellTimer} from '../src/motion/dwell.ts';
import {MotionInput,mapHandPoint} from '../src/motion/input.ts';
import {palmCenter} from '../src/tracking/coordinates.ts';
import type {GameInputEvent} from '../src/input.ts';
import type {TrackedHand,TrackingFrame} from '../src/tracking/types.ts';
function setup(){const state=createState();spawn(state,()=>0);state.objects[0].x=200;state.objects[0].y=200;const world=new InteractionController(state);world.enable();return {state,world};}
const event=(type:GameInputEvent['type'],pointerId='a',x=200,y=200):GameInputEvent=>({type,pointerId,source:'hand',position:{x,y}});
function hand(x:number,y:number,id=1,closed=false):TrackedHand {
  const p={x:1-x/1280,y:y/720,z:0};const points=Array.from({length:21},()=>({...p}));
  points[0].y+=.16;points[9].y+=.04;points[5].x-=.05;points[17].x+=.05;
  points[4].x+=closed?.012:.12;
  return {id,colorSlot:id-1,landmarks:points,raw:structuredClone(points),indexTip:points[8],thumbTip:points[4],wrist:points[0],palmCenter:palmCenter(points),handedness:'Right',handednessScore:.9};
}
function driver(method:'dwell'|'pinch'='dwell'){
  const {state,world}=setup();const results:string[]=[];
  const motion=new MotionInput(world,event=>{const result=world.dispatch(event);if(result)results.push(result.kind);});motion.settings.method=method;motion.settings.dwellGrabMs=300;motion.settings.dwellReleaseMs=250;motion.enable();
  let now=0;
  const step=(hands:TrackedHand[],ambiguous=false,ms=50)=>{now+=ms;motion.update({timestamp:now,hands,ambiguous});};
  const hold=(x:number,y:number,frames=12,closed=false)=>{for(let i=0;i<frames;i++)step([hand(x,y,1,closed)]);};
  return {state,world,motion,results,step,hold,time:()=>now};
}
test('collision boundaries include forgiving hand radius and nearest padded bin',()=>{
  const object={id:1,category:'plastic' as const,x:200,y:200};
  assert.equal(objectContains(object,{x:282,y:200},'hand'),true);assert.equal(objectContains(object,{x:282.1,y:200},'hand'),false);
  assert.equal(binAt({x:304,y:520}), 'plastic');assert.equal(binAt({x:304,y:505},14),undefined);assert.equal(binAt({x:304,y:506},14),'plastic');
  assert.equal(binAt({x:416,y:590},18),'plastic');assert.equal(binAt({x:417,y:590},18),'paper');
});
test('shared input keeps one owner and ignores duplicate grabs and releases',()=>{
  const {state,world}=setup();world.dispatch(event('grab-start'));world.dispatch(event('grab-start','b'));world.dispatch(event('grab-start'));
  assert.equal(world.heldBy('a'),1);assert.equal(world.heldBy('b'),undefined);
  assert.equal(world.dispatch(event('grab-release','b',304,590)),undefined);assert.equal(state.score,0);
  assert.equal(world.dispatch(event('grab-release','a',304,590))?.kind,'correct');
  assert.equal(world.dispatch(event('grab-release','a',304,590)),undefined);assert.equal(state.score,1);
});

test('off-centre mouse drop scores by the visible object centre and highlights the same bin',()=>{
 const {state,world}=setup();
 world.dispatch({...event('grab-start','a',245,200),source:'mouse'});
 world.dispatch({...event('grab-held','a',440,590),source:'mouse'});
 assert.equal(state.objects[0].x,395);assert.equal(world.binHighlights.get('a'),'plastic');
 assert.equal(world.dispatch({...event('grab-release','a',440,590),source:'mouse'})?.kind,'correct');assert.equal(state.score,1);
});
test('hand drops near the visible top rim are accepted without changing wrong-material classification',()=>{
 const {state,world}=setup();world.dispatch(event('grab-start'));
 assert.equal(world.dispatch(event('grab-release','a',304,495))?.kind,'correct');assert.equal(state.score,1);
 const next=setup();next.world.dispatch(event('grab-start'));
 assert.equal(next.world.dispatch(event('grab-release','a',752,495))?.kind,'incorrect');assert.equal(next.state.score,0);
});
test('two hands hold independent objects and both stop falling',()=>{
  const {state,world}=setup();spawn(state,()=>0);state.objects[1].x=600;state.objects[1].y=200;
  world.dispatch(event('grab-start'));world.dispatch(event('grab-start','b',600,200));advance(state,.05,'normal',world.heldIds);
  assert.equal(world.heldIds.size,2);assert.deepEqual(state.objects.map(o=>o.y),[200,200]);
  world.dispatch(event('grab-release','b',528,590));world.dispatch(event('grab-release','a',304,590));assert.equal(state.score,2);
});
test('incorrect/outside release and lost cancellation recover objects without scoring',()=>{
  const {state,world}=setup();world.dispatch(event('grab-start'));assert.equal(world.dispatch(event('grab-release','a',752,590))?.kind,'incorrect');assert.equal(state.score,0);assert.equal(state.objects[0].y,430);
  world.dispatch(event('grab-start','a',752,430));world.dispatch(event('grab-held','a',200,650));world.dispatch(event('pointer-lost'));assert.equal(state.objects[0].y,650);assert.equal(state.score,0);
  world.dispatch(event('input-disabled'));assert.equal(state.objects[0].y,476);assert.equal(world.heldIds.size,0);
  world.dispatch(event('grab-start','a',200,476));assert.equal(world.dispatch(event('grab-release','a',1000,300))?.kind,'recovered');assert.equal(state.score,0);
});
test('pause/disable cancels carry, rejects stale release, resume needs a new grab',()=>{
  const {state,world}=setup();world.dispatch(event('grab-start'));world.disable();world.dispatch(event('grab-release','a',304,590));assert.equal(state.score,0);assert.equal(world.heldIds.size,0);
  world.enable();world.dispatch(event('grab-release','a',304,590));assert.equal(state.score,0);
});
test('restart during carry drops old ownership and prevents old events scoring new state',()=>{
  const {world}=setup();world.dispatch(event('grab-start'));const next=createState();spawn(next,()=>0);world.replaceState(next);world.enable();world.dispatch(event('grab-release','a',304,590));assert.equal(next.score,0);assert.equal(next.objects.length,1);assert.equal(world.heldIds.size,0);
});
test('pinch normalization is size invariant and rejects tiny/invalid hands',()=>{
  const h=hand(200,200);const original=pinchRatio(h.raw)!;const scaled=h.raw.map(p=>({x:p.x*.5,y:p.y*.5,z:0}));assert.ok(Math.abs(original-pinchRatio(scaled)!)<1e-8);
  assert.ok(pinchRatio(hand(200,200,1,true).raw)!<.35);assert.equal(pinchRatio(Array.from({length:21},()=>({x:0,y:0,z:0}))),undefined);
});
test('pinch requires open rearm, temporal closure and separate hysteresis release',()=>{
  const p=new PinchRecognizer();for(let t=0;t<500;t+=50)assert.equal(p.update(.1,t).started,false);
  p.update(.8,500);p.update(.8,600);p.update(.2,650);assert.equal(p.state,'CLOSING');p.update(.4,700);assert.equal(p.state,'OPEN');
  p.update(.2,750);assert.equal(p.update(.2,900).started,true);assert.equal(p.state,'GRABBED');assert.equal(p.update(.45,950).released,false);
  p.update(.7,1000);assert.equal(p.state,'RELEASING');p.update(.5,1050);assert.equal(p.state,'GRABBED');
  p.update(.7,1100);assert.equal(p.update(.7,1300).released,true);assert.equal(p.update(.7,1350).released,false);
});
test('dwell timer resets on target changes, missing evidence and long gaps and fires once',()=>{
  const d=new DwellTimer();assert.equal(d.update('a',0,300).complete,false);d.update('a',100,300);d.update('a',200,300);assert.equal(d.update('a',300,300).complete,true);assert.equal(d.update('a',400,300).complete,false);
  assert.equal(d.update('b',450,300).progress,0);assert.equal(d.update('b',800,300).progress,0);assert.equal(d.update(undefined,850,300).progress,0);
});
test('calibrated mirrored mapping expands smaller reach region and sensitivity remains bounded',()=>{
  const bounds={left:.2,right:.8,top:.2,bottom:.8};assert.deepEqual(mapHandPoint({x:.8,y:.2,z:0},bounds,1),{x:0,y:0});assert.deepEqual(mapHandPoint({x:.2,y:.8,z:0},bounds,1),{x:1280,y:720});
  assert.ok(Math.abs(mapHandPoint({x:.3,y:.5,z:0},undefined,1.5).x-1024)<1e-8);
});
test('dwell integrates hover, grab, carry, release and single classification',()=>{
  const d=driver();d.hold(200,200);assert.equal(d.world.heldBy('hand-1'),1);assert.equal(d.motion.cursors[0].state,'CARRYING');
  for(const [x,y]of [[220,300],[250,420],[280,510],[304,590]])d.hold(x,y,2);
  d.hold(304,590,8);assert.equal(d.state.score,1);assert.equal(d.results.filter(r=>r==='correct').length,1);d.hold(304,590,20);assert.equal(d.state.score,1);
});
test('pinch integrates intentional grab, hysteresis carry and one release',()=>{
  const d=driver('pinch');d.hold(200,200,7);d.hold(200,200,5,true);assert.equal(d.world.heldBy('hand-1'),1);
  for(const [x,y]of [[220,300],[250,420],[280,510],[304,590]])d.hold(x,y,2,true);
  d.hold(304,590,6,false);assert.equal(d.state.score,1);d.hold(304,590,10,false);assert.equal(d.state.score,1);
});
test('tracking loss freezes then cancels without a score, including while above a bin',()=>{
  const d=driver();d.hold(200,200);for(const [x,y]of [[240,330],[280,460],[304,590]])d.hold(x,y,1);
  d.step([]);assert.equal(d.motion.cursors[0].state,'TRACKING_LOST');assert.equal(d.world.heldIds.size,1);assert.equal(d.state.score,0);
  d.motion.tick(d.time()+800);assert.equal(d.world.heldIds.size,0);assert.equal(d.state.score,0);assert.equal(d.state.objects[0].y,476);
});
test('short loss recovery requires stability and restarts dwell release evidence',()=>{
  const d=driver();d.hold(200,200);d.step([]);d.hold(200,200,5);assert.equal(d.world.heldIds.size,1);assert.equal(d.motion.cursors[0].state,'CARRYING');assert.equal(d.state.score,0);
});
test('open pinch on reappearance cancels safely rather than recycling',()=>{
  const d=driver('pinch');d.hold(200,200,7);d.hold(200,200,5,true);assert.equal(d.world.heldIds.size,1);d.step([]);d.hold(200,200,6,false);assert.equal(d.world.heldIds.size,0);assert.equal(d.state.score,0);
});
test('overlap cancels ownership; a new track ID never inherits an object',()=>{
  const d=driver();d.hold(200,200);d.step([hand(200,200),hand(220,200,2)],true);assert.equal(d.world.heldIds.size,0);assert.equal(d.state.score,0);
  const next:TrackingFrame={timestamp:d.time()+50,hands:[{...hand(304,590),id:99}],ambiguous:false};d.motion.update(next);assert.equal(d.state.score,0);assert.equal(d.world.heldBy('hand-99'),undefined);
});
test('large jumps and disabled input cannot cause a release or score',()=>{
  const d=driver();d.hold(200,200);d.hold(304,650,1);assert.equal(d.world.heldIds.size,0);assert.equal(d.state.score,0);
  d.motion.disable();d.hold(200,200,20);assert.equal(d.world.heldIds.size,0);
});
