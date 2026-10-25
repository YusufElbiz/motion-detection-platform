import test from 'node:test';import assert from 'node:assert/strict';
import {CHAPTERS,MOVES,toBody,matchMove,assignPeople} from '../.test-build/game/moves.js';
import {RhythmGame} from '../.test-build/game/engine.js';
function pose(center=.5){const arr=Array.from({length:33},()=>({x:center,y:.5,visibility:1,presence:1}));
 const at=(i,dx,y)=>arr[i]={x:center+dx,y,visibility:1,presence:1};
 at(0,0,.22);at(7,.09,.23);at(8,-.09,.23);
 at(11,.15,.38);at(12,-.15,.38);at(13,.2,.5);at(14,-.2,.5);
 at(15,.31,.65);at(16,-.31,.65);
 at(23,.12,.7);at(24,-.12,.7);at(25,.12,.87);at(26,-.12,.87);at(27,.13,.99);at(28,-.13,.99);
 return arr;}
test('10 increasingly faster stages with valid gestures',()=>{
 assert.equal(CHAPTERS.length,10);let tempo=0;
 for(const c of CHAPTERS){assert.ok(c.tempo>tempo);assert.ok(c.sequence.length>=3);for(const gesture of c.sequence)assert.ok(MOVES[gesture]);tempo=c.tempo;}
});
test('real pose matching: distinct clap / hands on hips / cross',()=>{
 const raw=pose();raw[15]={x:.5,y:.51,visibility:1};raw[16]={x:.51,y:.51,visibility:1};
 assert.equal(matchMove('clap',toBody(raw)),true);assert.equal(matchMove('cross',toBody(raw)),false);
 raw[15]={x:.62,y:.69,visibility:1};raw[16]={x:.38,y:.69,visibility:1};assert.equal(matchMove('hips',toBody(raw)),true);
 raw[15]={x:.35,y:.38,visibility:1};raw[16]={x:.65,y:.38,visibility:1};assert.equal(matchMove('cross',toBody(raw)),true);
});
test('invalid or missing pose cannot clear a beat',()=>{
 const g=new RhythmGame();g.start(1,0,'webcam');g.tick(99999,[null]);assert.equal(g.players[0].phase,'play');
 for(let t=100000;t<112000;t+=150)g.tick(t,[null]);assert.equal(g.players[0].step,0);
});
test('when same move repeats a pose release is required',()=>{
 const g=new RhythmGame();g.start(1,0,'webcam');const p=g.players[0];p.phase='play';p.step=0;
 // Override the first stage sequence in place for isolated consecutive-move test.
 const original=[...CHAPTERS[0].sequence];CHAPTERS[0].sequence=['clap','clap','hips'];
 try{let raw=pose();raw[15]={x:.5,y:.5,visibility:1};raw[16]={x:.51,y:.5,visibility:1};let body=toBody(raw);
   g.tick(250,[body]);g.tick(590,[body]);assert.equal(p.step,1);
   g.tick(760,[body]);g.tick(1100,[body]);assert.equal(p.step,1);
   g.tick(1400,[null]); // Missing player must not release a held gesture.
   assert.equal(p.step,1);assert.equal(p.mustRelease,true);
   raw[15]={x:.2,y:.6,visibility:1};raw[16]={x:.8,y:.6,visibility:1};g.tick(1600,[toBody(raw)]);assert.equal(p.mustRelease,false);
   raw[15]={x:.5,y:.5,visibility:1};raw[16]={x:.51,y:.5,visibility:1};g.tick(1800,[toBody(raw)]);g.tick(2160,[toBody(raw)]);assert.equal(p.step,2);
 }finally{CHAPTERS[0].sequence=original;}
});
test('2–3 people assigned by screen order without shifting missing identities',()=>{
 const people=[pose(.2),pose(.5),pose(.8)];let assigned=assignPeople(people,3,[null,null,null]);
 assert.equal(assigned[0],people[2]);assert.equal(assigned[1],people[1]);assert.equal(assigned[2],people[0]);
 assigned=assignPeople([people[2],people[0]],3,[.8,.5,.2]);assert.equal(assigned[0],people[2]);assert.equal(assigned[1],null);assert.equal(assigned[2],people[0]);
});
test('first player to finish wins immediately, without waiting for others',()=>{
 const g=new RhythmGame();g.start(3,0,'test');
 for(let player=0;player<3;player++){
   let now=player*2000+100;
   for(let stage=0;stage<10;stage++){
     g.debugAdvance(player,now+=100); // demo -> play
     for(let beat=0;beat<CHAPTERS[stage].sequence.length;beat++)g.debugAdvance(player,now+=100);
     if(stage<9)g.debugAdvance(player,now+=100); // celebrate -> demo
   }
 }
 g.tick(999000,[]);assert.equal(g.winner,0);assert.ok(g.players.every(p=>p.phase==='finished'));
});

test('after five seconds stuck on the third move, only the active rhythm sequence restarts',()=>{
 const g=new RhythmGame();g.start(1,0,'webcam');
 const p=g.players[0];p.phase='play';p.phaseAt=0;p.stepAt=0;
 const clap=pose();clap[15]={x:.5,y:.51,visibility:1};clap[16]={x:.51,y:.51,visibility:1};
 const hips=pose();hips[15]={x:.62,y:.69,visibility:1};hips[16]={x:.38,y:.69,visibility:1};
 const wrong=toBody(pose());
 g.tick(100,[toBody(clap)]);g.tick(450,[toBody(clap)]);assert.equal(p.step,1);
 g.tick(500,[toBody(hips)]);g.tick(850,[toBody(hips)]);assert.equal(p.step,2);
 const scoreAtSecondMove=p.score;
 g.tick(5849,[wrong]);assert.equal(p.step,2);assert.equal(p.phase,'play');
 g.tick(5850,[wrong]);assert.equal(p.step,0);assert.equal(p.phase,'demo');
 assert.equal(p.stage,0);assert.equal(p.score,scoreAtSecondMove);
 assert.equal(p.retrying,true);assert.equal(p.phaseAt,5850);
 assert.match(p.feedback,/baştan/);
 const endOfDemo=5850+g.demoDuration(p);
 g.tick(endOfDemo+1,[wrong]);
 assert.equal(p.phase,'play');assert.equal(p.step,0);assert.equal(p.stage,0);
 assert.equal(p.retrying,false);
});

test('a correct move begun just before five seconds can finish its normal hold',()=>{
 const g=new RhythmGame();g.start(1,0,'webcam');
 const p=g.players[0];p.phase='play';p.phaseAt=0;p.stepAt=0;
 const clap=pose();clap[15]={x:.5,y:.51,visibility:1};clap[16]={x:.51,y:.51,visibility:1};
 g.tick(4900,[toBody(clap)]);g.tick(5250,[toBody(clap)]);
 assert.equal(p.phase,'play');assert.equal(p.step,1);
});

test('temporary camera loss pauses the rhythm timeout',()=>{
 const g=new RhythmGame();g.start(1,0,'webcam');
 const p=g.players[0];p.phase='play';p.phaseAt=0;p.stepAt=0;
 const wrong=toBody(pose());
 g.tick(2000,[wrong]);g.tick(2500,[null]);g.tick(15000,[null]);
 g.tick(15010,[wrong]);assert.equal(p.phase,'play');
 g.tick(17499,[wrong]);assert.equal(p.phase,'play');
 g.tick(17510,[wrong]);assert.equal(p.phase,'demo');assert.equal(p.step,0);
});

test('players restart their own rhythms independently and test mode is unaffected',()=>{
 const g=new RhythmGame();g.start(2,0,'webcam');
 const [first,second]=g.players;
 first.phase='play';first.stepAt=0;
 second.phase='play';second.stepAt=4000;second.stage=3;
 const wrong=toBody(pose());g.tick(5000,[wrong,wrong]);
 assert.equal(first.phase,'demo');assert.equal(first.stage,0);
 assert.equal(second.phase,'play');assert.equal(second.stage,3);
 const t=new RhythmGame();t.start(1,0,'test');const player=t.players[0];player.phase='play';player.stepAt=0;
 t.tick(60000,[wrong]);assert.equal(player.phase,'play');assert.equal(player.step,0);
});


test('starting the right pose after the five-second deadline does not bypass retry',()=>{
 const g=new RhythmGame();g.start(1,0,'webcam');
 const p=g.players[0];p.phase='play';p.stepAt=0;
 const clap=pose();clap[15]={x:.5,y:.51,visibility:1};clap[16]={x:.51,y:.51,visibility:1};
 g.tick(5100,[toBody(clap)]);
 assert.equal(p.phase,'demo');assert.equal(p.step,0);assert.equal(p.retrying,true);
});

test('a rough imitation is rejected but a child-sized accurate target is accepted',()=>{
 const neutral=pose();
 // Wrist proximity alone cannot clear the clap if both hands rest too low.
 neutral[15]={x:.5,y:.69,visibility:1};neutral[16]={x:.505,y:.69,visibility:1};
 assert.equal(matchMove('clap',toBody(neutral)),false);
 // A correctly centered clap at the upper chest passes.
 neutral[15]={x:.5,y:.49,visibility:1};neutral[16]={x:.505,y:.49,visibility:1};
 assert.equal(matchMove('clap',toBody(neutral)),true);
 // Raising both hands should not count as one-hand-to-shoulder.
 neutral[15]={x:.35,y:.38,visibility:1};neutral[16]={x:.65,y:.38,visibility:1};
 assert.equal(matchMove('rightShoulder',toBody(neutral)),false);
 assert.equal(matchMove('cross',toBody(neutral)),true);
});

test('the winner is determined as soon as somebody finishes, other players may stay mid-rhythm',()=>{
 const g=new RhythmGame();g.start(3,0,'test');
 const first=g.players[0];first.phase='play';first.stage=9;first.step=CHAPTERS[9].sequence.length-1;
 g.debugAdvance(0,1000);
 assert.equal(first.phase,'finished');
 assert.equal(g.players[1].phase,'demo');
 g.tick(1001,[]);
 assert.equal(g.winner,0);
});
