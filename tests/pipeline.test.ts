import {test} from 'node:test';
import assert from 'node:assert/strict';
import {permittedJump} from '../src/motion/continuity.ts';
import {PipelineMetrics} from '../src/tracking/pipelineMetrics.ts';
import {associateTemporal} from '../src/tracking/association.ts';
const point=(x:number,y=.5)=>({x,y,z:0});

test('motion jump bound is time-based, capped and does not permit arbitrary teleports',()=>{
  assert.equal(permittedJump(320,40),320);assert.equal(permittedJump(320,50),320);
  assert.equal(permittedJump(320,75),480);assert.equal(permittedJump(320,100),640);
  assert.equal(permittedJump(320,1000),640);assert.equal(permittedJump(320,NaN),320);
});
test('pipeline metrics separate model P95, source-data age and busy-frame skipping',()=>{
  const metrics=new PipelineMetrics();metrics.skippedBusy=3;metrics.skippedRate=2;
  for(let i=0;i<20;i++)metrics.record(i*50,i*50+25,i===19?80:20);
  const snapshot=metrics.snapshot(1000);
  assert.equal(snapshot.p95ModelMs,20);assert.equal(snapshot.landmarkAgeMs,50);
  assert.equal(snapshot.lastResultAgeMs,25);assert.equal(snapshot.sampleIntervalMs,50);
  assert.equal(snapshot.skippedBusy,3);assert.equal(snapshot.skippedRate,2);
  assert.equal(metrics.snapshot(4000).p95ModelMs,0);
  metrics.reset();assert.equal(metrics.snapshot(4000).landmarkAgeMs,null);assert.equal(metrics.skippedBusy,0);
});
test('temporal association follows fast motion and clear crossing rather than array order',()=>{
  const history=[{id:1,rawCenter:point(.35),lastSeen:0,velocity:point(2.1,0)},{id:2,rawCenter:point(.65),lastSeen:0,velocity:point(-2.1,0)}];
  const result=associateTemporal(history,[point(.44),point(.56)],100);
  assert.equal(result.ambiguous,false);assert.equal(result.matches.get(0)?.id,2);assert.equal(result.matches.get(1)?.id,1);
});
test('temporal association exposes overlap/ties, gates teleports and keeps missing detections absent',()=>{
  const history=[{id:1,rawCenter:point(.3),lastSeen:0,velocity:point(0,0)},{id:2,rawCenter:point(.7),lastSeen:0,velocity:point(0,0)}];
  assert.equal(associateTemporal(history,[point(.49),point(.51)],100).ambiguous,true);
  assert.equal(associateTemporal(history,[point(.5)],100).ambiguous,true);
  assert.equal(associateTemporal([history[0]],[point(.95)],40).matches.size,0);
  assert.equal(associateTemporal(history,[],100).matches.size,0);
});
test('temporal association permits a fast deliberate reversal without making up an extra track',()=>{
  const history=[{id:1,rawCenter:point(.5),lastSeen:0,velocity:point(3,0)}];
  const result=associateTemporal(history,[point(.3)],100);assert.equal(result.matches.get(0)?.id,1);assert.equal(result.ambiguous,false);
});
