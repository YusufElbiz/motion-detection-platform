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

// Fixture note: hand(x,'Left') mirrors the drawing, so its thumb points to raw
// +x: anatomically a RIGHT palm facing the camera. The labels below follow the
// model's own (mirrored) convention, exactly like the fixture's names.
const rightPalm=(x:number,label='Left')=>{const d=hand(x,'Left');d.handedness=label;return d;};
const leftPalm=(x:number,label='Right')=>{const d=hand(x,'Right');d.handedness=label;return d;};
test('a right hand reaching into the screen-left half keeps the right arm (thumb direction)',()=>{
 const processor=new TrackingProcessor();processor.predictive=true;
 let frame=processor.update([rightPalm(.3)],0);
 for(let i=1;i<=12;i++)frame=processor.update([rightPalm(.3+i*.045)],i*40); // raw .84 = screen left
 assert.equal(frame.hands[0].colorSlot,1,'right hand → arm from the right edge');
 // Even with the model label flipping to the other side on a fist.
 frame=processor.update([rightPalm(.85,'Right')],13*40);assert.equal(frame.hands[0].colorSlot,1);
});
test('the model label convention is learned from the thumb, then helps when the thumb is hidden',()=>{
 const processor=new TrackingProcessor();processor.predictive=true;
 for(let i=0;i<10;i++)processor.update([leftPalm(.75),rightPalm(.25)],i*40);
 assert.ok(processor.labelConvention<=-8,`mirrored model convention must be detected (${processor.labelConvention})`);
 const p2=new TrackingProcessor();p2.predictive=true;p2.labelConvention=-20;
 // Thumb hidden (all points stacked): only the learned label decides the side.
 const flat=(x:number,label:string)=>({landmarks:Array.from({length:21},()=>({x,y:.5,z:0})),handedness:label,handednessScore:.9});
 let frame=p2.update([flat(.3,'Left')],0);for(let i=1;i<5;i++)frame=p2.update([flat(.3,'Left')],i*40);
 assert.equal(frame.hands[0].colorSlot,1,'label Left under the mirrored convention is the right hand');
});
test('two hands arriving continuously at an overlap with the same label keep the carrier identity',()=>{
 const processor=new TrackingProcessor();processor.predictive=true;
 let frame=processor.update([rightPalm(.3,'Left'),leftPalm(.7,'Left')],0);
 const carrier=frame.hands.find(h=>h.raw[0].x<.5)!.id;processor.priority=new Set([carrier]);
 for(let i=1;i<=9;i++)frame=processor.update([rightPalm(.3+i*.02,'Left'),leftPalm(.7-i*.02,'Left')],i*40);
 assert.ok(frame.hands.some(h=>h.id===carrier),'the carrying hand must still be tracked during the overlap');
});
