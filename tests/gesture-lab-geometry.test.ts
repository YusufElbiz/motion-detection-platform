import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handFixture} from '../scripts/hand-fixtures.mjs';
import {measureGeometry,classifyPose} from '../src/gesture-lab/geometry.ts';
import {GestureMachine,gestureDefaults} from '../src/gesture-lab/gesture.ts';
import {HandTracks} from '../src/gesture-lab/tracks.ts';
import type {Point,Detection} from '../src/tracking/types.ts';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

function rotate(p:Point,pitch:number,yaw:number,roll:number):Point {
  const a=pitch*Math.PI/180,b=yaw*Math.PI/180,c=roll*Math.PI/180;
  const x=p.x,y=p.y*Math.cos(a)-p.z*Math.sin(a),z=p.y*Math.sin(a)+p.z*Math.cos(a);
  const xx=x*Math.cos(b)+z*Math.sin(b),zz=-x*Math.sin(b)+z*Math.cos(b);
  return {x:xx*Math.cos(c)-y*Math.sin(c),y:xx*Math.sin(c)+y*Math.cos(c),z:zz};
}
function fixture({closed=false,pitch=0,yaw=0,roll=0,aspect=4/3,scale=1,world=true,label='None',score=.95}={}):Detection {
  const base=handFixture({closed}).map((p:Point)=>({x:(p.x-.5)*4/3,y:p.y-.5,z:p.z*4/3}));
  const points=base.map((p:Point)=>rotate(p,pitch,yaw,roll));
  return {landmarks:points.map((p:Point)=>({x:.5+p.x*scale/aspect,y:.5+p.y*scale,z:p.z*scale/aspect})),
    ...(world?{worldLandmarks:points.map((p:Point)=>({x:p.x*.3,y:p.y*.3,z:p.z*.3}))}:{}),
    handedness:'Left',handednessScore:.99,modelGesture:{label,score}};
}
test('geometry: open and fist are invariant over 3D rotation, including horizontal and edge-on poses',()=>{
  let cases=0;
  for(const closed of [false,true])for(const pitch of [-85,-60,0,60,85])for(const yaw of [-90,-45,0,45,90])for(const roll of [0,45,90,135,180,270]){
    const result=measureGeometry(fixture({closed,pitch,yaw,roll}),4/3);
    assert.equal(result.pose,closed?'CLOSED':'OPEN',JSON.stringify({closed,pitch,yaw,roll,result}));cases++;
  }
  assert.equal(cases,300);
});
test('geometry: aspect-correct image fallback handles rotation, size and wide/portrait cameras',()=>{
  for(const closed of [false,true])for(const aspect of [.75,1,4/3,16/9])for(const scale of [.3,.7,1.5])for(const roll of [0,60,90,180]){
    const result=measureGeometry(fixture({closed,aspect,scale,roll,pitch:55,yaw:70,world:false}),aspect);
    assert.equal(result.pose,closed?'CLOSED':'OPEN');assert.equal(result.space,'image');
  }
});
test('geometry: world landmarks take precedence over foreshortened/noisy image depth',()=>{
  const d=fixture({pitch:80,yaw:80});d.landmarks=d.landmarks.map(p=>({...p,z:0}));
  assert.equal(measureGeometry(d,16/9).pose,'OPEN');assert.equal(measureGeometry(d,16/9).space,'world');
});
test('geometry: relaxed open fingers and folded thumb still count as open',()=>{
  const d=fixture();
  for(const i of [5,9,13,17]){
    // Slight natural bend at both joints, rather than perfectly straight sticks.
    d.worldLandmarks![i+2].z+=.004;d.worldLandmarks![i+3].z+=.009;
  }
  d.worldLandmarks![4]={...d.worldLandmarks![9]};
  assert.equal(measureGeometry(d,4/3).pose,'OPEN');
});
test('geometry: peace, pointing and mixed bent/extended fingers remain unknown',()=>{
  const open=fixture(),closed=fixture({closed:true});
  for(const count of [1,2]){
    const d=fixture({label:'Open_Palm'});
    for(const i of [5,9,13,17].slice(count))for(let j=0;j<4;j++)d.worldLandmarks![i+j]={...closed.worldLandmarks![i+j]};
    assert.equal(measureGeometry(d,4/3).pose,'UNKNOWN');
    assert.equal(classifyPose(d,'UNKNOWN',gestureDefaults,4/3).pose,'UNKNOWN');
  }
  assert.equal(measureGeometry(open,4/3).extended,4);
});
test('geometry: degenerate, tiny, NaN or implausible chains do not manufacture a pose',()=>{
  let d=fixture();d.worldLandmarks=Array.from({length:21},()=>({x:0,y:0,z:0}));assert.equal(measureGeometry(d,4/3).valid,false);
  d=fixture({world:false,scale:.01});assert.equal(measureGeometry(d,4/3).pose,'UNKNOWN');
  d=fixture();d.landmarks[3].x=NaN;assert.equal(measureGeometry(d,4/3).valid,false);
  d=fixture();d.worldLandmarks![8].x=100;assert.equal(measureGeometry(d,4/3).valid,false);
});
test('hybrid: None and weak official categories no longer veto clear open geometry',()=>{
  for(const label of ['None','Open_Palm','Closed_Fist','Pointing_Up']){
    const evidence=classifyPose(fixture({roll:90,yaw:70,label,score:.2}),'UNKNOWN',gestureDefaults,4/3);
    assert.equal(evidence.pose,'OPEN');assert.equal(evidence.source,'geometry');
  }
});
test('hybrid: explicit model disagreement requires four-finger geometry support',()=>{
  const evidence=classifyPose(fixture({label:'Closed_Fist'}),'UNKNOWN',gestureDefaults,4/3);
  assert.equal(evidence.pose,'OPEN');assert.equal(evidence.conflict,true);assert.equal(evidence.geometry.extended,4);
  const d=fixture({label:'Closed_Fist'});d.worldLandmarks![8].z+=.04;
  const uncertain=classifyPose(d,'UNKNOWN',gestureDefaults,4/3);assert.equal(uncertain.geometry.extended,3);assert.equal(uncertain.pose,'UNKNOWN');
});
test('hybrid: agreement and model-only fallback keep official model confidence semantics',()=>{
  const d=fixture({label:'Open_Palm'});assert.equal(classifyPose(d,'UNKNOWN',gestureDefaults,4/3).source,'agreement');
  d.worldLandmarks=undefined;d.landmarks=d.landmarks.map(()=>({x:.5,y:.5,z:0}));
  const result=classifyPose(d,'UNKNOWN',gestureDefaults,4/3);assert.equal(result.source,'model');assert.equal(result.pose,'OPEN');
});
test('hybrid: horizontal open → fist → open works through None output without sticking',()=>{
  const tracks=new HandTracks();
  for(const t of [0,40,80])tracks.update([fixture({roll:90,yaw:65})],t);
  assert.equal(tracks.tracks[0].gesture.state,'OPEN');assert.equal(tracks.tracks[0].evidence!.source,'geometry');
  for(const t of [120,160,200])tracks.update([fixture({closed:true,roll:90,yaw:65})],t);
  assert.equal(tracks.tracks[0].gesture.state,'CLOSED');
  for(const t of [240,280,320])tracks.update([fixture({roll:90,yaw:65})],t);
  assert.equal(tracks.tracks[0].gesture.state,'OPEN');
});
test('hybrid: two rotated hands preserve independent states and timestamp confirmation',()=>{
  const tracks=new HandTracks();
  for(const t of [0,40,80]){
    const left=fixture({roll:90}),right=fixture({closed:true,roll:270});
    left.landmarks=left.landmarks.map(p=>({...p,x:p.x-.22}));right.landmarks=right.landmarks.map(p=>({...p,x:p.x+.22}));
    tracks.update([left,right],t);
  }
  assert.deepEqual(tracks.tracks.map(t=>t.gesture.state),['OPEN','CLOSED']);
  const m=new GestureMachine();m.updatePose('OPEN',0,gestureDefaults);m.updatePose('OPEN',59,gestureDefaults);assert.equal(m.state,'OPENING');m.updatePose('OPEN',60,gestureDefaults);assert.equal(m.state,'OPEN');
});
test('worker boundary: GPU init failure falls back to CPU and preserves world landmarks/category',async()=>{
  const d=fixture({roll:90}),messages:any[]=[];let closed=false;
  const self:any={location:{href:'http://127.0.0.1/tracking/inference-worker.js',origin:'http://127.0.0.1'},fetch:async()=>{},postMessage:(message:unknown)=>messages.push(message),close(){}};
  const task={recognizeForVideo:()=>({landmarks:[d.landmarks],worldLandmarks:[d.worldLandmarks],handedness:[[{categoryName:'Left',score:.99}]],gestures:[[{categoryName:'None',score:.95}]]})};
  const source=await readFile(new URL('../public/tracking/inference-worker.js',import.meta.url),'utf8');
  const delegates:string[]=[];
  runInNewContext(source,{self,URL,Request,XMLHttpRequest:class{open(){}},console,importScripts(){},OffscreenCanvas:class{},performance,Vision:{FilesetResolver:{forVisionTasks:async()=>({})},GestureRecognizer:{createFromOptions:async(_files:unknown,options:any)=>{delegates.push(options.baseOptions.delegate);if(options.baseOptions.delegate==='GPU')throw new Error('GPU unavailable');return task;}}}});
  await self.onmessage({data:{kind:'init',base:'http://127.0.0.1/tracking/',delegate:'GPU',engine:'gestures',thresholds:{detection:.5,presence:.5,tracking:.5}}});
  assert.deepEqual(delegates,['GPU','CPU']);assert.equal(messages.find(m=>m.kind==='ready').delegate,'CPU');
  await self.onmessage({data:{kind:'frame',timestamp:100,frame:{close(){closed=true;}}}});
  const transported=messages.find(m=>m.kind==='result').result.detections[0];
  assert.equal(JSON.stringify(transported.worldLandmarks),JSON.stringify(d.worldLandmarks));assert.equal(transported.modelGesture.label,'None');assert.equal(measureGeometry(transported,4/3).pose,'OPEN');assert.equal(closed,true);
});
