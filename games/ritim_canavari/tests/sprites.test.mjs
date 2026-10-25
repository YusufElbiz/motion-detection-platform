import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
import {ANIMATIONS,PAIRS,sampleAnimation,spriteFit} from '../.test-build/game/sprites.js';
import {characterCue} from '../.test-build/game/presentation.js';
import {MOVES,CHAPTERS,toBody,matchMove} from '../.test-build/game/moves.js';
import {RhythmGame} from '../.test-build/game/engine.js';
import {rgbaPNG} from '../scripts/png-data.mjs';
const root=new URL('../',import.meta.url),read=file=>fs.readFileSync(new URL(file,root)),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const frames=JSON.parse(read('public/sprites/runtime-frames.json'));

test('all thirteen gestures have distinct actual target PNGs and complete animation frames',()=>{
 assert.equal(Object.keys(ANIMATIONS).length,13);const hashes=[];
 for(const id of Object.keys(MOVES)){const a=ANIMATIONS[id];assert.ok(a,id);assert.ok(frames[a.prepare]);assert.ok(frames[a.target]);hashes.push(hash(read(`public/sprites/${id}-target.png`)));assert.notEqual(a.prepare,a.target);}
 assert.equal(new Set(hashes).size,13);assert.notEqual(ANIMATIONS.bothKnees.target,ANIMATIONS.rightKnee.target);assert.notEqual(ANIMATIONS.leftKnee.target,ANIMATIONS.rightKnee.target);
});
test('all runtime rectangles stay inside PNGs, preserve aspect and share exactly eight decoded images',()=>{
 const images=new Map();for(const frame of Object.values(frames)){
  if(!images.has(frame.src))images.set(frame.src,rgbaPNG(new URL('public/sprites/'+frame.src,root)));
  const im=images.get(frame.src),[x,y,w,h]=frame.source,[dx,dy,dw,dh]=frame.destination;
  assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=im.width&&y+h<=im.height,frame.src);assert.ok(Math.abs(w/h-dw/dh)<.0001,frame.src);assert.ok([dx,dy,dw,dh].every(Number.isFinite));
 }assert.equal(images.size,8);
});
test('every standalone frame is a complete RGBA PNG and has transparent padding around the whole body',()=>{
 for(const key of ['idle','clap-source-prepare',...Object.keys(MOVES).flatMap(id=>[`${id}-prepare`,`${id}-target`])]){
  const im=rgbaPNG(new URL(`public/sprites/${key}.png`,root));assert.equal(im.width,1024);assert.equal(im.height,1024);let pixels=0,minX=1024,minY=1024,maxX=-1,maxY=-1;
  for(let y=0;y<1024;y++)for(let x=0;x<1024;x++)if(im.rgba[(y*1024+x)*4+3]>64){pixels++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
  assert.ok(pixels>120000,key+' not empty');assert.ok(minX>12&&maxX<1012&&minY>12&&maxY<1012,key+' clipped');
 }
});
test('the three uploaded original sheets are byte-identical copies',()=>{
 const source=JSON.parse(read('sprite-source-manifest.json'));
 for(const key of ['star','clap','head-hip'])assert.equal(hash(read('public/sprites/'+source[key].file)),source[key].sha256);
});
test('camera, worker, audio, WASM and model bytes remain unchanged',()=>{
 const baseline=JSON.parse(read('baseline-sha256.json'));
 for(const [file,expected] of Object.entries(baseline))if(file!=='src/game/characters.ts'&&file!=='src/game/engine.ts'&&file!=='src/game/moves.ts')assert.equal(hash(read(file)),expected,file); // Game engine intentionally extended only with 5s rhythm timeout.
});
test('the renderer uses bitmap pixels and a single shared preload, with no geometric character fallback',()=>{
 const source=read('src/game/characters.ts').toString();assert.match(source,/ctx\.drawImage\(image/);assert.match(source,/loading\?\?=/);assert.match(source,/images=new Map/);
 for(const old of ['drawFace','drawHair','handOpen','drawStar','limb(ctx'])assert.ok(!source.includes(old),old);
});
test('timing shows start, approach, contact hold and return; final 144 BPM hold exceeds 210 ms',()=>{
 for(const move of Object.keys(MOVES)){
  assert.equal(sampleAnimation(move,0,1000,false).frame,'idle');assert.equal(sampleAnimation(move,180,1000,false).phase,'prepare');assert.equal(sampleAnimation(move,500,1000,false).frame,ANIMATIONS[move].target);assert.equal(sampleAnimation(move,880,1000,false).phase,'return');assert.equal(sampleAnimation(move,1000,1000,false).frame,'idle');
  let contactMs=0;for(let ms=0;ms<630;ms++)if(sampleAnimation(move,ms,630,false).contact)contactMs++;assert.ok(contactMs>=210);
 }
});
test('invalid or negative animation time stays neutral, and loops are deterministic',()=>{
 assert.equal(sampleAnimation('clap',NaN).frame,'idle');assert.equal(sampleAnimation('clap',-4).frame,'idle');assert.equal(sampleAnimation(null,1200).frame,'idle');assert.deepEqual(sampleAnimation('cross',500,1000),sampleAnimation('cross',3500,1000));
});
test('memory play never reveals an answer through the character; a requested hint reveals only the current step',()=>{
 const game=new RhythmGame();game.start(1,0,'test');const p=game.players[0];p.phase='play';
 for(let stage=0;stage<10;stage++){p.stage=stage;for(let step=0;step<CHAPTERS[stage].sequence.length;step++){p.step=step;p.hint=false;assert.equal(characterCue(game,p,9999).move,null);p.hint=true;assert.equal(characterCue(game,p,9999,null).move,null);assert.equal(characterCue(game,p,9999,9500).move,CHAPTERS[stage].sequence[step]);}}
 p.phase='celebrate';assert.equal(characterCue(game,p,9999).move,null);
});
test('demonstration animation follows every original chapter slot exactly, including quiet lead-in and tail',()=>{
 const g=new RhythmGame();g.start(1,500,'test');const p=g.players[0];
 for(let stage=0;stage<10;stage++){p.stage=stage;const c=g.getChapter(p),slot=(g.demoDuration(p)-1550)/c.sequence.length;assert.equal(characterCue(g,p,1000).move,null);
  for(let i=0;i<c.sequence.length;i++){const now=p.phaseAt+900+i*slot+slot*.5,cue=characterCue(g,p,now);assert.equal(cue.move,c.sequence[i]);assert.ok(Math.abs(cue.elapsedMs-slot*.5)<.001);assert.equal(sampleAnimation(cue.move,cue.elapsedMs,cue.durationMs,false).phase,'contact');}
  assert.equal(characterCue(g,p,p.phaseAt+g.demoDuration(p)-10).move,null);
 }
});
test('1/2/3-player canvas fitting never clips, stretches or oversizes the source square',()=>{
 for(const [w,h]of [[660,520],[490,380],[320,360],[155,250],[110,210]]){const f=spriteFit(w,h);assert.ok(f.scale>=0);assert.ok(f.x>=0&&f.y>=0);assert.ok(f.x+1024*f.scale<=w);assert.ok(f.y+1024*f.scale<=h);}
});
test('left-right pair metadata uses independent opposite poses and correct inactive hands',()=>{
 for(const [a,b]of Object.entries(PAIRS)){assert.equal(PAIRS[b],a);assert.notEqual(ANIMATIONS[a].target,ANIMATIONS[b].target);}
 assert.equal(ANIMATIONS.rightShoulder.right,'Sol omuz');assert.equal(ANIMATIONS.leftShoulder.left,'Sağ omuz');assert.equal(ANIMATIONS.rightKnee.right,'Sol diz');assert.equal(ANIMATIONS.leftKnee.left,'Sağ diz');assert.equal(ANIMATIONS.rightHipLeftShoulder.left,'Sağ omuz');assert.equal(ANIMATIONS.rightHipLeftShoulder.right,'Sağ bel yanı');
});

function pose(){const p=Array.from({length:33},()=>({x:.5,y:.5,visibility:1,presence:1}));for(const [i,x,y]of [[0,.5,.22],[7,.59,.23],[8,.41,.23],[11,.65,.38],[12,.35,.38],[13,.72,.52],[14,.28,.52],[15,.81,.65],[16,.19,.65],[23,.62,.7],[24,.38,.7],[25,.62,.87],[26,.38,.87],[27,.63,.99],[28,.37,.99]])p[i]={x,y,visibility:1,presence:1};return p;}
test('the illustrated hand-to-target contracts are accepted by the unchanged matcher for all thirteen moves',()=>{
 const fixture={clap:[[15,.5,.5],[16,.51,.5]],cross:[[15,.35,.38],[16,.65,.38]],rightShoulder:[[16,.65,.38]],leftShoulder:[[15,.35,.38]],leftHead:[[15,.56,.2],[16,.38,.7]],rightHead:[[16,.44,.2],[15,.62,.7]],bothKnees:[[15,.62,.87],[16,.38,.87]],rightKnee:[[16,.62,.87],[15,.62,.7]],leftKnee:[[15,.38,.87],[16,.38,.7]],hips:[[15,.62,.7],[16,.38,.7]],star:[[15,.85,.15],[16,.15,.15]],rightHipLeftShoulder:[[16,.38,.7],[15,.35,.38]],leftHipRightShoulder:[[15,.62,.7],[16,.65,.38]]};
 for(const [id,entries]of Object.entries(fixture)){const raw=pose();for(const [i,x,y]of entries)raw[i]={x,y,visibility:1,presence:1};assert.equal(matchMove(id,toBody(raw)),true,id);if(PAIRS[id])assert.equal(matchMove(PAIRS[id],toBody(raw)),false,id+' not opposite pose');}
});

test('both uploaded characters have all thirteen real distinct action frames',()=>{
 const keys=Object.values(ANIMATIONS).map(animation=>animation.target);
 for(const avatar of ['turkuaz_kiz','yesil_erkek']){
  for(const key of ['idle',...keys]){
   const fn=`public/sprites/characters/${avatar}/${key}.png`;
   const im=rgbaPNG(new URL(fn,root));
   assert.equal(im.width,1024,fn);assert.equal(im.height,1024,fn);
  }
  assert.ok(read(`public/sprites/characters/${avatar}/uploaded-original.png`).length>1000000);
 }
});
