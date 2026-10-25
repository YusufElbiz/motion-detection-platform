import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FistRecognizer,landmarkPose,modelPose} from '../src/motion/fist.ts';
import {MotionInput,clampPalmAnchor} from '../src/motion/input.ts';
import {InteractionController} from '../src/interaction.ts';
import {createState,spawn} from '../src/game.ts';
import {palmCenter} from '../src/tracking/coordinates.ts';
import {smoothPoints,adaptiveTimeConstant} from '../src/tracking/smoothing.ts';
import {handFixture} from '../scripts/hand-fixtures.mjs';
import type {TrackedHand} from '../src/tracking/types.ts';
import {TrackingProcessor} from '../src/tracking/processor.ts';
function fixture(x=200,y=200,closed=false,id=1,score?:number):TrackedHand{
 const raw=handFixture({x:1-x/1280,y:y/720,closed});
 return {raw,landmarks:raw,palmCenter:palmCenter(raw),wrist:raw[0],thumbTip:raw[4],indexTip:raw[8],id,colorSlot:id-1,handedness:'Right',handednessScore:.9,...(score!==undefined?{modelGesture:{label:closed?'Closed_Fist':'Open_Palm',score}}:{})};
}
function driver(){const state=createState();spawn(state,()=>0);state.objects[0].x=200;state.objects[0].y=200;const world=new InteractionController(state);world.enable();const results:string[]=[];const motion=new MotionInput(world,e=>{const r=world.dispatch(e);if(r)results.push(r.kind);});motion.enable();let time=0;return {state,world,motion,results,step(hands:TrackedHand[],delta=40,ambiguous=false){time+=delta;motion.update({timestamp:time,hands,ambiguous});return time;}};}
test('four-finger geometry recognizes open/fist independently of scale and 3D rotation',()=>{
 for(const closed of [false,true])for(const rotation of [0,45,90,180,270])for(const tilt of [-40,0,40])for(const scale of [.5,1,1.5]){
  const result=landmarkPose(handFixture({closed,rotation,tilt,scale}));assert.equal(result.pose,closed?'CLOSED':'OPEN',`${closed}/${rotation}/${tilt}/${scale}`);assert.equal(result.fingers.length,4);
 }
});
test('mixed or invalid fingers are UNKNOWN, not an overall confidence guess',()=>{
 const open=handFixture(),closed=handFixture({closed:true});for(let i=5;i<=8;i++)closed[i]=open[i];assert.equal(landmarkPose(closed).pose,'UNKNOWN');
 const invalid=handFixture();invalid[6].x=NaN;assert.equal(landmarkPose(invalid).pose,'UNKNOWN');assert.equal(landmarkPose([]).pose,'UNKNOWN');assert.equal(landmarkPose(open).source,'heuristic');
});
test('model score has separate enter/keep thresholds and labels outside two poses are UNKNOWN',()=>{
 assert.equal(modelPose({label:'Closed_Fist',score:.65},'OPEN').pose,'UNKNOWN');assert.equal(modelPose({label:'Closed_Fist',score:.65},'CLOSED').pose,'CLOSED');assert.equal(modelPose({label:'Victory',score:.99},'OPEN').pose,'UNKNOWN');assert.equal(modelPose(undefined,'OPEN').source,'model');
});
test('verified OPEN-CLOSED-OPEN emits single edges, closed appearance is not armed',()=>{
 const f=new FistRecognizer();f.update('CLOSED',0);assert.equal(f.update('CLOSED',80).grabbed,false);assert.equal(f.armed,false);
 f.update('OPEN',120);assert.equal(f.update('OPEN',200).released,false);assert.equal(f.armed,true);
 f.update('CLOSED',240);assert.equal(f.state,'CLOSING');assert.equal(f.update('CLOSED',320).grabbed,true);assert.equal(f.update('CLOSED',360).grabbed,false);
 f.update('OPEN',400);assert.equal(f.state,'OPENING');assert.equal(f.update('OPEN',480).released,true);assert.equal(f.update('OPEN',520).released,false);assert.equal(f.lastConfirmationMs,80);
});
test('one noisy frame, UNKNOWN and long evidence gaps cannot complete a transition',()=>{
 const f=new FistRecognizer();f.update('OPEN',0);f.update('OPEN',80);f.update('CLOSED',120);f.update('UNKNOWN',160);assert.equal(f.update('CLOSED',200).grabbed,false);assert.equal(f.update('OPEN',240).released,false);
 f.update('CLOSED',280);assert.equal(f.update('CLOSED',600).grabbed,false);assert.equal(f.armed,false);
});
test('palm, not index tip, anchors fist input and object stays exactly attached',()=>{
 const d=driver();for(let i=0;i<6;i++)d.step([fixture()]);for(let i=0;i<4;i++)d.step([fixture(200,200,true)]);assert.equal(d.world.heldIds.size,1);
 for(const [x,y]of [[220,300],[250,420],[280,510],[304,590]]){d.step([fixture(x,y,true)]);assert.ok(Math.abs(d.state.objects[0].x-x)<1e-8);assert.ok(Math.abs(d.state.objects[0].y-y)<1e-8);}
 for(let i=0;i<4;i++)d.step([fixture(304,590,false)]);assert.equal(d.state.score,1);for(let i=0;i<5;i++)d.step([fixture(304,590,false)]);assert.equal(d.state.score,1);
});
test('closed reappearance, overlap, pause and restart never transfer ownership or score',()=>{
 const d=driver();for(let i=0;i<6;i++)d.step([fixture(200,200,true)]);assert.equal(d.world.heldIds.size,0);
 for(let i=0;i<4;i++)d.step([fixture()]);for(let i=0;i<4;i++)d.step([fixture(200,200,true)]);assert.equal(d.world.heldIds.size,1);
 d.step([]);d.step([fixture(304,590,false)],80);assert.equal(d.state.score,0);assert.equal(d.world.heldIds.size,0);
 d.motion.disable();d.world.disable();d.step([fixture(304,590,false)]);assert.equal(d.state.score,0);
 const next=createState();spawn(next,()=>0);d.world.replaceState(next);d.world.enable();d.motion.enable();for(let i=0;i<5;i++)d.step([fixture(200,155,true)]);assert.equal(d.world.heldIds.size,0);assert.equal(next.score,0);
});
test('two independent model-guided fists own separate objects; ambiguous overlap cancels both',()=>{
 const d=driver();spawn(d.state,()=>0);d.state.objects[1].x=600;d.state.objects[1].y=200;
 for(let i=0;i<6;i++)d.step([fixture(200,200,false,1,.95),fixture(600,200,false,2,.95)]);
 for(let i=0;i<4;i++)d.step([fixture(200,200,true,1,.95),fixture(600,200,true,2,.95)]);
 assert.equal(d.world.heldIds.size,2);assert.notEqual(d.world.heldBy('hand-1'),d.world.heldBy('hand-2'));
 d.step([fixture(400,200,true,1,.95),fixture(420,200,true,2,.95)],40,true);assert.equal(d.world.heldIds.size,0);assert.equal(d.state.score,0);
});
test('adaptive smoothing reduces large-step lag but filters stationary jitter',()=>{
 assert.ok(adaptiveTimeConstant(1)<adaptiveTimeConstant(.01));
 const previous=[{x:0,y:0,z:0}],current=[{x:.2,y:0,z:0}];
 const fixed=smoothPoints(previous,current,50,65),fast=smoothPoints(previous,current,50,adaptiveTimeConstant(4));assert.ok(fast[0].x>.19);assert.ok(fixed[0].x<.12);
 const jitter=smoothPoints(previous,[{x:.001,y:0,z:0}],50,adaptiveTimeConstant(.02));assert.ok(jitter[0].x<.001);
});
test('ambiguous temporal association is explicit; a remaining midpoint hand cannot inherit either identity',()=>{
 const processor=new TrackingProcessor();processor.update([fixture(450,300),fixture(650,300,false,2)],0);
 assert.equal(processor.update([fixture(550,300)],40).ambiguous,true);
});
test('palm and carried object share visible-center limits at every playfield edge',()=>{
 assert.deepEqual(clampPalmAnchor({x:0,y:0}),{x:50,y:130});assert.deepEqual(clampPalmAnchor({x:1280,y:720}),{x:1230,y:675});
 const d=driver();for(let i=0;i<6;i++)d.step([fixture()]);for(let i=0;i<4;i++)d.step([fixture(200,200,true)]);
 for(const [x,y]of [[100,150],[0,0]])d.step([fixture(x,y,true)]);
 assert.deepEqual(d.motion.cursors[0].position,{x:50,y:130});assert.equal(d.state.objects[0].x,50);assert.equal(d.state.objects[0].y,130);
});
test('fresh result arrival is not mistaken for tracking loss just because capture was delayed',()=>{
 const state=createState();spawn(state,()=>0);const world=new InteractionController(state);world.enable();const motion=new MotionInput(world,e=>world.dispatch(e));motion.enable();
 motion.update({timestamp:100,hands:[fixture()],ambiguous:false},220);motion.tick(360);
 assert.notEqual(motion.cursors[0].state,'TRACKING_LOST');motion.tick(400);assert.equal(motion.cursors[0].state,'TRACKING_LOST');
});

test('game uses laboratory geometry: tilted horizontal hands grab and release despite model None',()=>{
 const d=driver();
 const hand=(x:number,y:number,closed:boolean,id=1):TrackedHand=>{
  const raw=handFixture({x:1-x/1280,y:y/720,closed,rotation:90,tilt:75});
  return {...fixture(x,y,closed,id),raw,landmarks:raw,worldLandmarks:raw.map(p=>({x:p.x*4/3*.3,y:p.y*.3,z:p.z*4/3*.3})),palmCenter:palmCenter(raw),wrist:raw[0],indexTip:raw[8],thumbTip:raw[4],modelGesture:{label:'None',score:.99}};
 };
 for(let i=0;i<6;i++)d.step([hand(200,200,false)]);
 assert.equal(d.motion.cursors[0].gesture,'OPEN');
 for(let i=0;i<4;i++)d.step([hand(200,200,true)]);
 assert.equal(d.world.heldIds.size,1);assert.equal(d.motion.diagnostics[0].measurement.source,'heuristic');
 for(const [x,y]of [[220,300],[250,420],[280,510],[304,590]])d.step([hand(x,y,true)]);
 for(let i=0;i<4;i++)d.step([hand(304,590,false)]);
 assert.equal(d.state.score,1);assert.equal(d.world.heldIds.size,0);assert.equal(d.motion.cursors[0].gesture,'OPEN');
 for(let i=0;i<5;i++)d.step([hand(304,590,false)]);assert.equal(d.state.score,1);
});

test('game cancels hybrid carry on ambiguous identities instead of transferring the object',()=>{
 const d=driver();
 const hand=(closed:boolean)=>({...fixture(200,200,closed),modelGesture:{label:'None',score:.99}});
 for(let i=0;i<6;i++)d.step([hand(false)]);for(let i=0;i<4;i++)d.step([hand(true)]);
 assert.equal(d.world.heldIds.size,1);d.step([hand(true)],40,true);
 assert.equal(d.world.heldIds.size,0);assert.equal(d.state.score,0);
});

test('fast carry tolerates the same motion speed at 10 FPS without relaxing lost-hand evidence',()=>{
 const d=driver();for(let i=0;i<6;i++)d.step([fixture()]);for(let i=0;i<4;i++)d.step([fixture(200,200,true)]);
 assert.equal(d.world.heldIds.size,1);
 d.step([fixture(600,200,true)],100);assert.equal(d.world.heldIds.size,1);assert.ok(Math.abs(d.state.objects[0].x-600)<1e-8);
 assert.equal(d.motion.cursors[0].gesture,'CLOSED');
 d.step([fixture(304,590,true)],100);assert.equal(d.world.heldIds.size,1);
 for(let i=0;i<3;i++)d.step([fixture(304,590,false)]);assert.equal(d.state.score,1);
});

test('instant teleport still cancels fist ownership without recycling',()=>{
 const d=driver();for(let i=0;i<6;i++)d.step([fixture()]);for(let i=0;i<4;i++)d.step([fixture(200,200,true)]);
 d.step([fixture(1100,590,true)],100);assert.equal(d.world.heldIds.size,0);assert.equal(d.state.score,0);
});

test('fast carry survives both camera-space association and game-space movement at 10 FPS',()=>{
 const d=driver(),processor=new TrackingProcessor();processor.predictive=true;processor.smoothing=false;let time=0;
 const step=(x:number,y:number,closed:boolean,delta=40)=>{time+=delta;const frame=processor.update([fixture(x,y,closed)],time);d.step(frame.hands,delta,frame.ambiguous);return frame;};
 for(let i=0;i<6;i++)step(200,200,false);for(let i=0;i<4;i++)step(200,200,true);
 const id=d.motion.cursors[0].id;step(600,200,true,100);
 assert.equal(d.motion.cursors[0].id,id);assert.equal(d.world.heldIds.size,1);assert.ok(Math.abs(d.state.objects[0].x-600)<1e-8);
 step(500,300,true,100);assert.equal(d.motion.cursors[0].id,id);assert.equal(d.world.heldIds.size,1);
 for(const [x,y]of [[400,400],[304,500],[304,590]])step(x,y,true,100);
 for(let i=0;i<4;i++)step(304,590,false);assert.equal(d.state.score,1);
});
