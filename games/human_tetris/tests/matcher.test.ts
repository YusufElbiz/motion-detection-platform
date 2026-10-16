import {describe,expect,it} from 'vitest';
import {LANDMARKS,type Pose,type Joint} from '../src/game/poses';
import {DUO_CHALLENGES as CHALLENGES} from '../src/game/poses-duo';
import {distribute,scorePose,deltaAngle} from '../src/game/matcher';
import {GameEngine} from '../src/game/engine';
import type {Landmark} from '../src/vision/types';
const person=(pose:Pose,center=.25,ratio=16/9):Landmark[]=>{
  const points:Landmark[]=Array.from({length:33},()=>({x:.5,y:.5,visibility:1,presence:1}));
  for(const joint of Object.keys(LANDMARKS) as Joint[]){
    const [x,y]=pose[joint];
    points[LANDMARKS[joint]]={x:1-center-x*.2/ratio,y:.48+y*.2,visibility:1,presence:1};
  }
  return points;
};
describe('two-person pose matching',()=>{
 it('accepts accurate anatomical bone directions',()=>{
   const a=scorePose(person(CHALLENGES[0].left),CHALLENGES[0].left);
   const b=scorePose(person(CHALLENGES[0].right,.75),CHALLENGES[0].right);
   expect(a.accepted).toBe(true);expect(b.accepted).toBe(true);
   expect(a.score).toBeGreaterThan(.99);
 });
 it('rejects a wrong raised arm even if the other parts are correct',()=>{
   const target=CHALLENGES[0].right;
   const wrong=person(target);
   wrong[15]={...wrong[15],y:.82};
   expect(scorePose(wrong,target).accepted).toBe(false);
 });
 it('rejects invisible joints instead of guessing',()=>{
   const points=person(CHALLENGES[0].left);
   points[27].visibility=.1;
   expect(scorePose(points,CHALLENGES[0].left).visible).toBe(false);
 });
 it('assigns two players consistently by camera mirror side',()=>{
   const poses=[person(CHALLENGES[0].right,.75),person(CHALLENGES[0].left,.25)];
   const [left,right]=distribute(poses);
   expect(left).toBe(poses[1]);expect(right).toBe(poses[0]);
 });
 it('returns no identities if two players overlap',()=>{
   expect(distribute([person(CHALLENGES[0].right,.49),person(CHALLENGES[0].left,.51)])).toEqual([null,null]);
 });
 it('wraps angular difference at ±180 degrees',()=>{expect(deltaAngle(179,-179)).toBe(2)});
});
describe('wall collision and bounce loop',()=>{
 it('cannot pass a wall unless both players held correct poses',()=>{
   const engine=new GameEngine('duo');engine.start();
   engine.players[0].ready=true;engine.players[1].ready=false;
   engine.tick(100);for(let t=150;t<=8100;t+=50)engine.tick(t);
   expect(engine.hits).toBeGreaterThan(0);expect(engine.level).toBe(0);
 });
 it('passes only if both players are ready at impact',()=>{
   const engine=new GameEngine('duo');engine.start(true);
   engine.players[0].ready=true;engine.players[1].ready=true;
   engine.tick(100);for(let t=150;t<=8100;t+=50)engine.tick(t);
   expect(engine.stage==='clear'||engine.level>0).toBe(true);expect(engine.score).toBeGreaterThan(0);
 });
});
