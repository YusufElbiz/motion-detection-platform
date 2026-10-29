import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clamp01,mapPoint,mirrorPoint,normalizePoint,palmCenter} from '../src/tracking/coordinates.ts';
import {smoothPoints} from '../src/tracking/smoothing.ts';
import {TrackingProcessor} from '../src/tracking/processor.ts';
import {CalibrationManager} from '../src/tracking/calibration.ts';
import {TrackingMetrics} from '../src/tracking/metrics.ts';
import {CameraManager,cameraError} from '../src/tracking/camera.ts';
import {FrameGate} from '../src/tracking/frameGate.ts';
import type {Detection} from '../src/tracking/types.ts';
const point=(x:number,y=.5)=>({x,y,z:-.01});
const detection=(x:number,handedness='Left'):Detection=>({landmarks:Array.from({length:21},()=>point(x)),handedness,handednessScore:.9});

test('anatomical side persists across screen center, reversed result order and brief model errors',()=>{
  const p=new TrackingProcessor();p.predictive=true;
  const first=p.update([detection(.8,'Right')],0).hands[0];
  assert.equal(first.colorSlot,0,'raw x .8 is the screen-left half: left arm');
  for(let i=1;i<=7;i++){
    const hand=p.update([detection(.8-i*.09,i===4?'Left':'Right')],i*33).hands[0];
    assert.equal(hand.id,first.id);assert.equal(hand.handedness,'Right');assert.equal(hand.colorSlot,0);
  }
  const other=p.update([detection(.2,'Right'),detection(.8,'Left')],280);
  assert.equal(other.hands[0].id,first.id);assert.equal(other.hands[1].colorSlot,0);
});

test('overlap keeps larger foreground palm, suppresses only the other identity, and restores sides',()=>{
  const p=new TrackingProcessor();p.predictive=true;
  const palm=(x:number,side:string,size:number)=>{
    const d=detection(x,side);d.landmarks[5]={x:x-size,y:.5,z:0};d.landmarks[17]={x:x+size,y:.5,z:0};
    d.landmarks[0]={x,y:.5+size,z:0};d.landmarks[9]={x,y:.5-size,z:0};return d;
  };
  const initial=p.update([palm(.3,'Left',.05),palm(.7,'Right',.08)],0);
  const overlap=p.update([palm(.49,'Left',.05),palm(.51,'Right',.08)],40);
  assert.equal(overlap.ambiguous,false);assert.equal(overlap.hands.length,1);
  assert.equal(overlap.hands[0].id,initial.hands[1].id);
  assert.deepEqual(overlap.suppressedHandIds,[initial.hands[0].id]);
  const swapped=p.update([palm(.51,'Right',.08),palm(.49,'Left',.05)],80);
  assert.equal(swapped.hands[0].id,initial.hands[1].id);
  const separated=p.update([palm(.7,'Left',.05),palm(.3,'Right',.08)],120);
  assert.equal(separated.hands.length,2);assert.equal(separated.hands[0].colorSlot,0);assert.equal(separated.hands[1].colorSlot,1);
});

test('normalization bounds x/y, preserves signed depth, handles non-finite input',()=>{
  assert.deepEqual(normalizePoint({x:-.2,y:1.4,z:-.2}),{x:0,y:1,z:-.2});
  assert.deepEqual(normalizePoint({x:NaN,y:Infinity,z:NaN}),{x:0,y:0,z:0});assert.equal(clamp01(.3),.3);
});
test('display mirroring flips x once without swapping handedness or y/depth',()=>{
  assert.deepEqual(mirrorPoint(point(.2),true),point(.8));assert.deepEqual(mirrorPoint(point(.2),false),point(.2));
  assert.ok(Math.abs(mirrorPoint(mirrorPoint(point(.2),true),true).x-.2)<1e-10);
});
test('screen mapping respects mirror, calibration, clipping and degenerate bounds',()=>{
  assert.deepEqual(mapPoint(point(.25),1280,720,true),{x:960,y:360});
  const b={left:.2,right:.8,top:.2,bottom:.8};
  assert.ok(Math.abs(mapPoint(point(.5),100,100,false,b).x-50)<1e-10);
  assert.deepEqual(mapPoint(point(.1,.9),100,100,false,b),{x:0,y:100});
  assert.ok(Number.isFinite(mapPoint(point(.5),100,100,false,{left:.5,right:.5,top:0,bottom:0}).x));
});
test('palm center averages wrist and four MCP joints',()=>{
  const points=detection(.5).landmarks;points[0].x=0;assert.equal(palmCenter(points).x,.4);
});
test('EMA reduces abrupt motion, converges, is time based, and bypasses cleanly',()=>{
  const a=[point(0)],b=[point(1)];const s=smoothPoints(a,b,33,65);assert.ok(s[0].x>0&&s[0].x<1);
  const two=smoothPoints(s,b,33,65);const one=smoothPoints(a,b,66,65);assert.ok(Math.abs(two[0].x-one[0].x)<1e-10);
  assert.deepEqual(smoothPoints(a,b,33,0),b);assert.deepEqual(smoothPoints([],b,33,65),b);
  assert.equal(smoothPoints(a,b,-10,65)[0].x,0);
});
test('temporal association follows geometry through result reordering and handedness flips',()=>{
  const p=new TrackingProcessor();const initial=p.update([detection(.2,'Left'),detection(.8,'Right')],0);
  const next=p.update([detection(.79,'Left'),detection(.21,'Right')],40);
  assert.equal(next.hands[0].id,initial.hands[1].id);assert.equal(next.hands[1].id,initial.hands[0].id);
  assert.equal(next.hands[0].handedness,'Right');assert.notEqual(next.hands[0].colorSlot,next.hands[1].colorSlot);
});
test('loss immediately removes active output; short occlusion reassociates, long loss starts fresh',()=>{
  const p=new TrackingProcessor();const first=p.update([detection(.2)],0).hands[0];
  assert.equal(p.update([],50).hands.length,0);
  assert.equal(p.update([detection(.21)],100).hands[0].id,first.id);
  assert.equal(p.update([],500).hands.length,0);
  const fresh=p.update([detection(.22)],550).hands[0];assert.notEqual(fresh.id,first.id);assert.equal(fresh.indexTip.x,.22);
});
test('overlapping palms reset ambiguous filters and do not claim stable identities',()=>{
  const p=new TrackingProcessor();const initial=p.update([detection(.2),detection(.8)],0);
  const overlap=p.update([detection(.49),detection(.51)],50);assert.equal(overlap.ambiguous,true);
  assert.ok(overlap.hands.every(h=>!initial.hands.some(old=>old.id===h.id)));
});
test('invalid landmarks rejected; smoothing disable uses raw data; processor reset clears history',()=>{
  const p=new TrackingProcessor();p.update([detection(.2)],0);p.smoothing=false;
  assert.equal(p.update([detection(.3)],30).hands[0].indexTip.x,.3);
  const bad=detection(.2);bad.landmarks[1].x=NaN;assert.equal(p.update([bad],50).hands.length,0);
  p.reset();assert.equal(p.update([detection(.8)],80).hands[0].indexTip.x,.8);
});
test('calibration requires stable one/two-hand steps and enough reach, then resets completely',()=>{
  const c=new CalibrationManager();c.start();assert.equal(c.stage,'one');c.observe([point(.5)],0);c.observe([],600);assert.equal(c.progress,0);
  c.observe([point(.5)],700);c.observe([point(.5)],1400);assert.equal(c.stage,'two');
  c.observe([point(.3),point(.7)],1500);c.observe([point(.3),point(.7)],2200);assert.equal(c.stage,'reach');
  assert.equal(c.finish(),false);
  for(let i=0;i<40;i++)c.observe([point(i%2?.8:.2,i%4<2?.8:.2)],2300+i*40);
  assert.equal(c.finish(),true);assert.deepEqual(c.bounds,{left:.2,right:.8,top:.2,bottom:.8});
  c.reset();assert.equal(c.stage,'idle');assert.equal(c.bounds,undefined);assert.equal(c.progress,0);assert.equal(c.finish(),false);
});
test('tiny calibration range is rejected',()=>{
  const c=new CalibrationManager();c.start();c.stage='reach';for(let i=0;i<30;i++)c.observe([point(.5)],i*30);assert.equal(c.finish(),false);assert.equal(c.bounds,undefined);
});
test('camera and inference rates are measured separately and stale metrics expire',()=>{
  const m=new TrackingMetrics();for(let i=0;i<=30;i++)m.cameraFrame(i*1000/30);
  for(let i=0;i<=15;i++)m.inferenceFrame(i*1000/15,12);
  const values=m.snapshot(1000);assert.ok(Math.abs(values.cameraFps-30)<.001);assert.ok(Math.abs(values.inferenceFps-15)<.001);assert.equal(values.latencyMs,12);
  assert.deepEqual(m.snapshot(5000),{cameraFps:0,inferenceFps:0,latencyMs:0});
});
test('camera stop cancels pending permission and disposes late stream',async()=>{
  let resolve!:(stream:MediaStream)=>void;let stopped=0;
  const track={stop(){stopped++;},readyState:'live',onended:null};const stream={getTracks:()=>[track],getVideoTracks:()=>[track]};
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:()=>new Promise(r=>{resolve=r;})}});
  const video={pause(){},srcObject:null,play:async()=>{}} as unknown as HTMLVideoElement;
  const c=new CameraManager(video);const pending=c.start('',640);c.stop();resolve(stream as unknown as MediaStream);
  assert.equal(await pending,false);assert.equal(stopped,1);assert.equal(video.srcObject,null);
  delete (navigator as unknown as Record<string,unknown>).mediaDevices;
});
test('camera success, repeated cleanup and externally ended track release the stream',async()=>{
  let stopped=0;let disconnects=0;const track={stop(){stopped++;},readyState:'live',onended:null as null|(()=>void)};
  const stream={getTracks:()=>[track],getVideoTracks:()=>[track]};
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>stream}});
  const video={pause(){},srcObject:null,play:async()=>{}} as unknown as HTMLVideoElement;
  const c=new CameraManager(video);c.onDisconnect=()=>disconnects++;
  assert.equal(await c.start('',640),true);assert.equal(c.active,true);track.onended!();assert.equal(disconnects,1);assert.equal(video.srcObject,null);c.stop();assert.equal(stopped,1);
  delete (navigator as unknown as Record<string,unknown>).mediaDevices;
});
test('camera errors have Turkish recovery instructions',()=>{
  assert.match(cameraError(new DOMException('denied','NotAllowedError')),/izin/);
  assert.match(cameraError(new DOMException('missing','NotFoundError')),/bulunamadı/);
  assert.match(cameraError(new DOMException('busy','NotReadableError')),/diğer uygulamaları/);
});
test('frame gate schedules approximately 24 from 30 FPS without duplicate inference or queued busy frames',()=>{
  const gate=new FrameGate();let count=0;
  for(let i=0;i<300;i++){
    const accepted=gate.accept(i/30,i*1000/30,24,false);if(accepted.due)count++;
    assert.deepEqual(gate.accept(i/30,i*1000/30,24,false),{fresh:false,due:false});
  }
  assert.ok(count>=239&&count<=241,`expected ~240 inferences in 10 s; got ${count}`);
  gate.reset();assert.deepEqual(gate.accept(0,0,24,true),{fresh:true,due:false});
  assert.equal(gate.accept(1/30,1000/30,24,false).due,true);
});

test('both labels swapping while two separated hands close into fists keeps identities and sides',()=>{
  const p=new TrackingProcessor();p.predictive=true;
  const initial=p.update([detection(.3,'Right'),detection(.7,'Left')],0);
  for(let i=1;i<=6;i++){
    // The model swaps both labels on alternating frames; the hands barely move.
    const swap=i%2===1;
    const frame=p.update([detection(.3+i*.005,swap?'Left':'Right'),detection(.7-i*.005,swap?'Right':'Left')],i*40);
    assert.equal(frame.ambiguous,false);
    assert.equal(frame.hands[0].id,initial.hands[0].id);assert.equal(frame.hands[1].id,initial.hands[1].id);
    assert.equal(frame.hands[0].colorSlot,initial.hands[0].colorSlot);assert.equal(frame.hands[0].handedness,'Right');
  }
});

test('a new second hand cannot take the label of the continuing hand',()=>{
  const p=new TrackingProcessor();p.predictive=true;
  const first=p.update([detection(.7,'Left')],0).hands[0];
  const frame=p.update([detection(.71,'Left'),detection(.25,'Left')],40);
  assert.equal(frame.hands[0].id,first.id);assert.equal(frame.hands[1].handedness,'Right');
  assert.notEqual(frame.hands[0].colorSlot,frame.hands[1].colorSlot);
});

test('arm slots follow the screen side, whatever the model labels say',()=>{
  const p=new TrackingProcessor();p.predictive=true;
  // Labels opposite to anatomy: the arm side must still match the screen.
  let frame=p.update([detection(.25,'Left'),detection(.75,'Right')],0);
  assert.equal(frame.hands.find(h=>h.raw[0].x===.75)!.colorSlot,0);assert.equal(frame.hands.find(h=>h.raw[0].x===.25)!.colorSlot,1);
  // Hands swap sides gradually (crossing): once clearly apart, arms swap too.
  for(let i=1;i<=10;i++)frame=p.update([detection(.25+i*.05,'Left'),detection(.75-i*.05,'Right')],i*40);
  const left=frame.hands.find(h=>h.raw[0].x>.5)!,right=frame.hands.find(h=>h.raw[0].x<.5)!;
  assert.equal(left.colorSlot,0);assert.equal(right.colorSlot,1);assert.notEqual(left.id,right.id);
});
test('overlap keeps the hand that carries an object even when its palm looks smaller',()=>{
  const p=new TrackingProcessor();p.predictive=true;
  const palm=(x:number,side:string,size:number)=>{
    const d=detection(x,side);d.landmarks[5]={x:x-size,y:.5,z:0};d.landmarks[17]={x:x+size,y:.5,z:0};
    d.landmarks[0]={x,y:.5+size,z:0};d.landmarks[9]={x,y:.5-size,z:0};return d;
  };
  const initial=p.update([palm(.3,'Left',.05),palm(.7,'Right',.08)],0);
  p.priority=new Set([initial.hands[0].id]);
  const overlap=p.update([palm(.49,'Left',.05),palm(.51,'Right',.08)],40);
  assert.equal(overlap.hands.length,1);assert.equal(overlap.hands[0].id,initial.hands[0].id);
});
