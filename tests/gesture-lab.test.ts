import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GestureMachine,gestureDefaults} from '../src/gesture-lab/gesture.ts';
import {HandTracks} from '../src/gesture-lab/tracks.ts';
import {OneEuro,PalmFilter} from '../src/gesture-lab/filter.ts';
import {project,videoTransform} from '../src/gesture-lab/mapping.ts';
import {LabSession} from '../src/gesture-lab/session.ts';
import {CameraManager} from '../src/tracking/camera.ts';
import type {Detection,TrackingBackend} from '../src/tracking/types.ts';

const model=(label:string,score=.95)=>({label,score});
function detection(x:number,label='Open_Palm',handedness='Left',y=.5):Detection {
  return {landmarks:Array.from({length:21},(_,i)=>({x:x+(i%4-.5)*.002,y:y+(i%3-.5)*.002,z:0})),handedness,handednessScore:.99,modelGesture:model(label)};
}
test('lab: ID persists independently of detection order and handedness flip',()=>{
  const tracks=new HandTracks();tracks.update([detection(.2),detection(.8,'Closed_Fist','Right')],0);
  const ids=tracks.tracks.map(t=>t.id);
  tracks.update([detection(.79,'Closed_Fist','Left'),detection(.21,'Open_Palm','Right')],40);
  assert.equal(tracks.tracks.find(t=>t.raw.x<.5)!.id,ids[0]);assert.equal(tracks.tracks.find(t=>t.raw.x>.5)!.id,ids[1]);
});
test('lab: temporary loss keeps identity and exposes lost rather than stale data',()=>{
  const tracks=new HandTracks();tracks.update([detection(.3)],0);const id=tracks.tracks[0].id;
  tracks.update([],50);assert.equal(tracks.tracks[0].status,'lost');assert.equal(tracks.tracks[0].detection,undefined);assert.equal(tracks.tracks[0].gesture.state,'UNKNOWN');
  tracks.update([detection(.31)],110);assert.equal(tracks.tracks[0].id,id);assert.equal(tracks.tracks[0].status,'visible');
});
test('lab: expiry gives a new monotonic ID, even after stop/reset',()=>{
  const tracks=new HandTracks();tracks.update([detection(.3)],0);const id=tracks.tracks[0].id;
  tracks.age(650);assert.equal(tracks.tracks.length,0);tracks.update([detection(.3)],700);assert.ok(tracks.tracks[0].id>id);
  const next=tracks.tracks[0].id;tracks.reset();tracks.update([detection(.3)],800);assert.ok(tracks.tracks[0].id>next);
});
test('lab: gated jumps do not inherit gesture state',()=>{
  const tracks=new HandTracks();tracks.update([detection(.1)],0);tracks.update([detection(.1)],70);const id=tracks.tracks[0].id;
  tracks.update([detection(.9,'Closed_Fist')],100);const visible=tracks.tracks.find(t=>t.status==='visible')!;
  assert.notEqual(visible.id,id);assert.equal(visible.gesture.state,'CLOSING');
});
test('lab: full assignment protects surviving hand when new hand appears first',()=>{
  const tracks=new HandTracks();tracks.update([detection(.1),detection(.8,'Open_Palm','Right')],0);const right=tracks.tracks[1].id;
  tracks.update([detection(.45),detection(.79,'Open_Palm','Right')],40);
  assert.equal(tracks.tracks.length,2);assert.equal(tracks.tracks.find(t=>t.raw.x>.6)!.id,right);assert.ok(tracks.tracks.every(t=>t.status==='visible'));
});
test('lab: crossing with separated measurements follows velocity, not left/right order',()=>{
  const tracks=new HandTracks();tracks.update([detection(.2),detection(.8,'Closed_Fist','Right')],0);
  const id=tracks.tracks[0].id;
  tracks.update([detection(.35),detection(.65,'Closed_Fist','Right')],70);
  tracks.update([detection(.65),detection(.35,'Closed_Fist','Right')],210);
  assert.equal(tracks.uncertain,false);assert.equal(tracks.tracks.find(t=>t.id===id)!.raw.x>.6,true);
});
test('lab: overlapping hands invalidate evidence and explicitly acquire fresh IDs',()=>{
  const tracks=new HandTracks();tracks.update([detection(.3),detection(.7,'Closed_Fist','Right')],0);tracks.update([detection(.3),detection(.7,'Closed_Fist','Right')],70);
  const ids=tracks.tracks.map(t=>t.id);
  tracks.update([detection(.49),detection(.51,'Closed_Fist','Right')],120);
  assert.equal(tracks.uncertain,true);assert.ok(tracks.tracks.every(t=>t.status==='uncertain'&&t.gesture.state==='UNKNOWN'&&!t.detection));
  tracks.update([detection(.3),detection(.7,'Closed_Fist','Right')],180);
  assert.equal(tracks.identityResets,1);assert.ok(tracks.tracks.every(t=>!ids.includes(t.id)));
});
test('lab: one occluding hand equally close to two tracks reports uncertainty',()=>{
  const tracks=new HandTracks();tracks.update([detection(.42),detection(.58)],0);tracks.update([detection(.5)],40);assert.equal(tracks.uncertain,true);
});
test('lab: gesture machines for two hands are independent',()=>{
  const tracks=new HandTracks();for(const t of [0,40,80])tracks.update([detection(.2),detection(.8,'Closed_Fist','Right')],t);
  assert.equal(tracks.tracks[0].gesture.state,'OPEN');assert.equal(tracks.tracks[1].gesture.state,'CLOSED');
  for(const t of [120,160,200])tracks.update([detection(.2,'Closed_Fist'),detection(.8,'Open_Palm','Right')],t);
  assert.equal(tracks.tracks[0].gesture.state,'CLOSED');assert.equal(tracks.tracks[1].gesture.state,'OPEN');
});
test('lab: OPEN → CLOSED → OPEN confirms in milliseconds',()=>{
  const machine=new GestureMachine();const s={...gestureDefaults,openMs:50,closedMs:70};
  machine.update(model('Open_Palm'),0,s);machine.update(model('Open_Palm'),50,s);assert.equal(machine.state,'OPEN');
  machine.update(model('Closed_Fist'),60,s);assert.equal(machine.state,'CLOSING');machine.update(model('Closed_Fist'),129,s);assert.equal(machine.state,'CLOSING');machine.update(model('Closed_Fist'),130,s);assert.equal(machine.state,'CLOSED');
  machine.update(model('Open_Palm'),140,s);assert.equal(machine.state,'OPENING');machine.update(model('Open_Palm'),190,s);assert.equal(machine.state,'OPEN');assert.equal(machine.confirmationMs,50);
});
test('lab: UNKNOWN recovers without locks and prolonged unknown clears stable pose',()=>{
  const machine=new GestureMachine();machine.update(model('Closed_Fist'),0,gestureDefaults);machine.update(model('Closed_Fist'),60,gestureDefaults);
  machine.update(model('None'),90,gestureDefaults);assert.equal(machine.state,'CLOSED');machine.update(model('None'),210,gestureDefaults);assert.equal(machine.state,'UNKNOWN');
  machine.update(model('Open_Palm'),240,gestureDefaults);machine.update(model('Open_Palm'),300,gestureDefaults);assert.equal(machine.state,'OPEN');
});
test('lab: alternating classes cannot accumulate confirmation',()=>{
  const machine=new GestureMachine();for(let t=0;t<1000;t+=20)machine.update(model(t%40?'Open_Palm':'Closed_Fist'),t,gestureDefaults);
  assert.equal(machine.stable,'UNKNOWN');machine.update(model('Open_Palm'),1000,gestureDefaults);machine.update(model('Open_Palm'),1060,gestureDefaults);assert.equal(machine.state,'OPEN');
});
test('lab: low confidence and non-fist official gestures are unknown, with hysteresis',()=>{
  const machine=new GestureMachine();machine.update(model('Open_Palm'),0,gestureDefaults);machine.update(model('Open_Palm'),60,gestureDefaults);
  machine.update(model('Open_Palm',.5),90,gestureDefaults);assert.equal(machine.state,'OPEN');machine.update(model('Closed_Fist',.5),100,gestureDefaults);assert.equal(machine.state,'OPEN');
  machine.update(model('Thumb_Up'),240,gestureDefaults);assert.equal(machine.state,'UNKNOWN');
});
test('lab: clock gaps and backwards timestamps reset confirmation',()=>{
  const m=new GestureMachine();m.update(model('Open_Palm'),0,gestureDefaults);m.update(model('Open_Palm'),400,gestureDefaults);assert.equal(m.stable,'UNKNOWN');m.update(model('Open_Palm'),460,gestureDefaults);assert.equal(m.state,'OPEN');m.update(model('Open_Palm'),100,gestureDefaults);assert.equal(m.stable,'UNKNOWN');
});
test('lab: exact mirrored mapping, contain letterboxing, cover cropping and resize',()=>{
  let transform=videoTransform(640,480,800,600);assert.deepEqual(project({x:.2,y:.25},transform),{x:640,y:150});assert.deepEqual(project({x:.2,y:.25},transform,false),{x:160,y:150});
  transform=videoTransform(640,480,1000,600);assert.deepEqual(project({x:0,y:0},transform),{x:900,y:0});
  transform=videoTransform(640,480,1000,600,'cover');assert.deepEqual(project({x:0,y:0},transform),{x:1000,y:-75});
  transform=videoTransform(640,480,400,300);assert.deepEqual(project({x:.2,y:.25},transform),{x:320,y:75});assert.throws(()=>videoTransform(0,480,400,300));
});
test('lab: One Euro reduces stationary jitter while adaptive cutoff reduces motion lag',()=>{
  const f=new OneEuro();f.minCutoff=1;f.beta=12;const slow=new OneEuro();slow.minCutoff=1;slow.beta=0;
  const raw:number[]=[],filtered:number[]=[];
  for(let i=0;i<120;i++){const x=.5+(i%2?.005:-.005);raw.push(x);filtered.push(f.update(x,i*33));}
  const spread=(xs:number[])=>Math.max(...xs.slice(30))-Math.min(...xs.slice(30));assert.ok(spread(filtered)<spread(raw)*.4);
  f.reset();slow.reset();for(let i=0;i<10;i++){f.update(0,i*33);slow.update(0,i*33);}const adaptive=f.update(1,330),fixed=slow.update(1,330);assert.ok(adaptive>fixed+.4);
});
test('lab: filter reset and disable do not retain stale positions',()=>{
  const f=new PalmFilter();f.update({x:0,y:0,z:0},0,true,2);assert.equal(f.update({x:1,y:1,z:0},200,true,2).x,1);
  assert.equal(f.update({x:.2,y:.3,z:0},230,false,2).x,.2);assert.equal(f.update({x:.8,y:.9,z:0},260,true,2).x,.8);f.reset();assert.equal(f.update({x:.1,y:.1,z:0},290,true,2).x,.1);
});
test('lab: long loss resets filter but short loss keeps ID',()=>{
  const tracks=new HandTracks();tracks.update([detection(.2)],0);const id=tracks.tracks[0].id;tracks.update([],40);tracks.update([detection(.29)],250);
  assert.equal(tracks.tracks[0].id,id);assert.deepEqual(tracks.tracks[0].position,tracks.tracks[0].raw);assert.equal(tracks.tracks[0].gesture.stable,'UNKNOWN');
});
test('lab: age hides stale data without requiring another model result',()=>{
  const tracks=new HandTracks();tracks.update([detection(.3)],0);tracks.age(181);assert.equal(tracks.tracks[0].status,'lost');assert.equal(tracks.tracks[0].detection,undefined);
});
test('lab: lifecycle start is single-owner; stop during model loading cannot reactivate',async()=>{
  const previous=globalThis.cancelAnimationFrame;globalThis.cancelAnimationFrame=()=>{};
  try{
    let finish!:(value:'CPU')=>void,initializations=0,stops=0;
    const camera={active:true,async start(){return true;},stop(){stops++;}};
    const backend:TrackingBackend={initialize:async()=>{initializations++;return await new Promise(resolve=>{finish=resolve;});},infer:async()=>{throw new Error('not used');},close(){}};
    const session=new LabSession({} as HTMLVideoElement,camera,backend);const start=session.start();await Promise.resolve();await session.start();assert.equal(initializations,1);session.stop();finish('CPU');await start;assert.equal(session.active,false);assert.equal(session.loading,false);assert.ok(stops>=2);
  }finally{globalThis.cancelAnimationFrame=previous;}
});
test('lab: CameraManager stops late permission stream and detaches active stream',async()=>{
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');let resolve!:(stream:MediaStream)=>void,stopped=0;
  const track={readyState:'live',stop(){stopped++;},onended:null};const stream={getTracks:()=>[track],getVideoTracks:()=>[track]} as unknown as MediaStream;
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:()=>new Promise(r=>{resolve=r;})}}});
  try{
    const video={srcObject:null,pause(){},async play(){}} as unknown as HTMLVideoElement;const camera=new CameraManager(video);const pending=camera.start('',640);camera.stop();resolve(stream);assert.equal(await pending,false);assert.equal(stopped,1);assert.equal(video.srcObject,null);
    const next=camera.start('',640);resolve(stream);assert.equal(await next,true);assert.equal(camera.active,true);camera.stop();assert.equal(video.srcObject,null);assert.equal(stopped,2);
  }finally{if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);}
});
