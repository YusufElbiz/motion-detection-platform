import {test} from 'node:test';
import assert from 'node:assert/strict';
import {thumbSignature} from '../src/tracking/thumbIdentity.ts';
import {TrackingProcessor} from '../src/tracking/processor.ts';
import {handFixture} from '../scripts/hand-fixtures.mjs';
import type {Detection} from '../src/tracking/types.ts';
function hand(x:number,side='Right',rotation=0,tilt=0,closed=false):Detection {
 const landmarks=handFixture({x,y:.5,rotation,tilt,closed});
 if(side==='Left')for(const point of landmarks)point.x=x-(point.x-x);
 return {landmarks,handedness:side,handednessScore:.95};
}
test('thumb check uses palm-relative direction and survives translation, roll and fist closure',()=>{
 const right=thumbSignature(hand(.2))!.side;
 for(const x of [.1,.5,.9])for(const rotation of [0,45,90,180,270])for(const closed of [false,true]){
  assert.equal(thumbSignature(hand(x,'Right',rotation,0,closed))!.side,right);
  assert.equal(thumbSignature(hand(x,'Left',rotation,0,closed))!.side,-right);
 }
 assert.equal(thumbSignature(hand(.5,'Right',0,85)),undefined,'edge-on palm must not cast a side vote');
 const invalid=hand(.5);invalid.landmarks[2].x=NaN;assert.equal(thumbSignature(invalid),undefined);
});
test('crossed hands with swapped model labels retain IDs using thumbs rather than nearest x',()=>{
 const processor=new TrackingProcessor();processor.predictive=true;
 const first=processor.update([hand(.2,'Right'),hand(.8,'Left')],0);
 const right=hand(.6,'Right'),left=hand(.4,'Left');right.handedness='Left';left.handedness='Right';
 const next=processor.update([right,left],80);
 assert.equal(next.ambiguous,false);assert.equal(next.hands[0].id,first.hands[0].id);
 assert.equal(next.hands[0].handedness,'Right');assert.equal(next.hands[1].id,first.hands[1].id);
 assert.equal(next.hands[1].handedness,'Left');
});
test('unobservable thumb contradiction does not transfer an existing identity to another hand',()=>{
 const processor=new TrackingProcessor();processor.update([hand(.2,'Right'),hand(.8,'Left')],0);
 const wrong=hand(.21,'Left');wrong.handedness='Right';
 const next=processor.update([wrong],20);
 assert.equal(next.ambiguous,true);assert.equal(next.hands.length,0);
});
