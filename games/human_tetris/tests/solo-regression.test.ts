import {describe,expect,it} from 'vitest';
import {CHALLENGES,LANDMARKS,type Pose,type Joint} from '../src/game/poses';
import {scorePose} from '../src/game/matcher';
import {GameEngine} from '../src/game/engine';
import type {Landmark} from '../src/vision/types';
const person=(pose:Pose):Landmark[]=>{
 const out:Landmark[]=Array.from({length:33},()=>({x:.5,y:.5,visibility:1,presence:1}));
 for(const j of Object.keys(LANDMARKS) as Joint[]){
  const [x,y]=pose[j];out[LANDMARKS[j]]={x:.5-x*.2/(16/9),y:.43+y*.2,visibility:1,presence:1};
 }
 return out;
};
function play(engine:GameEngine,poseFactory:(level:number,time:number)=>Landmark[]|null){
 engine.start();engine.tick(16);
 for(let t=96;t<=12_000;t+=80){
  engine.updatePlayer(0,scorePose(poseFactory(engine.level,t),engine.current.left),t);
  engine.tick(t);
 }
}
describe('SOLO 1.4 progression regression',()=>{
 it('all 16 wall targets are mathematically achievable at strictest setting',()=>{
  for(const wall of CHALLENGES){
   expect(scorePose(person(wall.left),wall.left,16/9,1.35,'hard').accepted,wall.name).toBe(true);
  }
 });
 it('rejects a wrong arm and highlights it red',()=>{
  const t=CHALLENGES[0].left;
  const wrong=person(t);wrong[15].y+=.36;
  const result=scorePose(wrong,t,16/9,1.35,'hard');
  expect(result.accepted).toBe(false);
  expect(result.segmentFeedback.find(s=>s.end==='leftWrist')?.status).toBe('bad');
 });
 it('rejects a missing foot and reports visibility',()=>{
  const t=CHALLENGES[0].left;
  const missing=person(t);missing[27].visibility=.1;
  const result=scorePose(missing,t);
  expect(result.accepted).toBe(false);
  expect(result.jointFeedback.leftAnkle).toBe('missing');
 });
 it('enters level 2 when correct pose is held while camera keeps streaming',()=>{
  const engine=new GameEngine();
  play(engine,level=>person(CHALLENGES[level].left));
  expect(engine.level).toBeGreaterThanOrEqual(1);
 });
 it('returns the same wall for a persistently wrong pose',()=>{
  const engine=new GameEngine();
  play(engine,()=>{
   const wrong=person(CHALLENGES[0].left);wrong[15].y+=.36;return wrong;
  });
  expect(engine.level).toBe(0);
  expect(engine.hits).toBeGreaterThan(0);
 });
 it('tolerates occasional single-frame tracking loss without accepting missing body',()=>{
  const engine=new GameEngine();
  play(engine,(level,t)=>t%400===96?null:person(CHALLENGES[level].left));
  expect(engine.level).toBeGreaterThanOrEqual(1);
 });
});
