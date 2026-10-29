import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TwoHandsReady} from '../src/motion/readyStart.ts';
import type {TrackedHand} from '../src/tracking/types.ts';
const hand=(id:number)=>({id,handedness:id===1?'Right':'Left'} as TrackedHand);
test('two visible hands start without any gesture after stable detection and calibration',()=>{
 const gate=new TwoHandsReady();
 for(let t=0;t<400;t+=100)assert.equal(gate.update({timestamp:t,hands:[hand(1),hand(2)],ambiguous:false},true),false);
 assert.equal(gate.update({timestamp:400,hands:[hand(2),hand(1)],ambiguous:false},true),true);
});
test('one hand, missing calibration, ambiguity and a lost pair never start the game',()=>{
 const gate=new TwoHandsReady();
 for(let t=0;t<600;t+=100)assert.equal(gate.update({timestamp:t,hands:[hand(1),hand(2)],ambiguous:false},false),false);
 gate.update({timestamp:700,hands:[hand(1),hand(2)],ambiguous:false},true);
 assert.equal(gate.update({timestamp:800,hands:[hand(1)],ambiguous:false},true),false);assert.equal(gate.progress,0);
 assert.equal(gate.update({timestamp:900,hands:[hand(1),hand(2)],ambiguous:true},true),false);
 gate.update({timestamp:1000,hands:[hand(1),hand(2)],ambiguous:false},true);
 assert.equal(gate.update({timestamp:1400,hands:[hand(1),hand(2)],ambiguous:false},true),false);assert.equal(gate.progress,0);
});
