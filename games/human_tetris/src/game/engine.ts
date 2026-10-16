import {CHALLENGES as SOLO_CHALLENGES,type Challenge as SoloChallenge} from './poses';
import {DUO_CHALLENGES,type Challenge as DuoChallenge} from './poses-duo';
export type Mode='solo'|'duo';
export type Challenge=SoloChallenge|DuoChallenge;
export const challengesFor=(mode:Mode):readonly Challenge[]=>mode==='solo'?SOLO_CHALLENGES:DUO_CHALLENGES;
import type {MatchResult} from './matcher';
export type Stage='idle'|'approach'|'bounce'|'clear'|'complete';
export interface PlayerState {match:MatchResult|null;holdMs:number;ready:boolean;updatedAt:number;lastAcceptedAt:number;}
export interface GameSnapshot { mode:Mode; stage:Stage; level:number;score:number;hits:number;progress:number;players:[PlayerState,PlayerState];current:Challenge;demo:boolean; message:string }
const empty=():PlayerState=>({match:null,holdMs:0,ready:false,updatedAt:0,lastAcceptedAt:0});
export class GameEngine {
  mode:Mode='solo';
  constructor(mode:Mode='solo'){this.mode=mode;}
  selectMode(mode:Mode){this.mode=mode;this.reset();}
  get count(){return challengesFor(this.mode).length;}
  stage:Stage='idle';level=0;score=0;hits=0;progress=0;demo=false;message='Kamerayı aç ve oyuna hazırlan.';
  players:[PlayerState,PlayerState]=[empty(),empty()];
  private lastTick=0;private stageTime=0;private isHit=false;
  get current():Challenge{return challengesFor(this.mode)[Math.min(this.level,this.count-1)];}
  reset(demo=false){this.stage='idle';this.level=0;this.score=0;this.hits=0;this.progress=0;this.demo=demo;this.players=[empty(),empty()];this.lastTick=0;this.stageTime=0;this.isHit=false;this.message='Oyuna hazır.'}
  start(demo=false){this.reset(demo);this.stage='approach';this.message=this.current.hint;}
  updatePlayer(slot:0|1,match:MatchResult,now:number){
    const player=this.players[slot];
    const delta=player.updatedAt?Math.min(160,Math.max(0,now-player.updatedAt)):0;
    player.updatedAt=now;player.match=match;
    if(match.accepted){
      player.holdMs=Math.min(850,player.holdMs+delta);
      player.lastAcceptedAt=now;
    }else{
      // A noisy / intermittent landmark must not erase half a second of good
      // tracking in a single frame. A genuinely wrong pose still loses time.
      const decay=match.visible&&match.score>=.68?1.4:2.7;
      player.holdMs=Math.max(0,player.holdMs-delta*decay);
    }
    // One near-correct jitter frame can be tolerated (<120ms), never a missing
    // player or a clearly wrong pose. Camera loss is checked again in tick().
    const jitterGrace=match.visible&&match.score>=.70&&now-player.lastAcceptedAt<=120;
    player.ready=player.holdMs>=450&&(match.accepted||jitterGrace);
  }

  tick(now:number){
    if(!this.lastTick){this.lastTick=now;return;}
    const dt=Math.min(60,Math.max(0,now-this.lastTick));this.lastTick=now;
    if(this.stage==='idle'||this.stage==='complete')return;
    for(const p of this.players.slice(0,this.mode==='duo'?2:1)){if(!this.demo&&now-p.updatedAt>420){p.ready=false;p.holdMs=0;p.lastAcceptedAt=0;}}
    if(this.stage==='approach'){
      this.progress=Math.min(1,this.progress+dt/(this.progress<.64?6600:1800));
      if(this.progress>=1){
        if(this.players[0].ready&&(this.mode==='solo'||this.players[1].ready)){
          this.stage='clear';this.stageTime=0;this.score+=1000+this.level*250;this.message='MÜKEMMEL! DUVAR GEÇİLDİ';this.isHit=false;
        }else{
          this.stage='bounce';this.stageTime=0;this.hits++;this.message='ÇARPIŞMA! POZU DÜZELT';this.isHit=true;
        }
      }
    }else if(this.stage==='bounce'){
      this.stageTime+=dt;
      this.progress=1-.38*(1-Math.pow(1-Math.min(1,this.stageTime/750),2));
      if(this.stageTime>=950){this.stage='approach';this.message=this.current.hint;this.progress=.62;this.isHit=false}
    }else if(this.stage==='clear'){
      this.stageTime+=dt;this.progress=Math.max(0,1-this.stageTime/1250);
      if(this.stageTime>=1500){
        this.level++;this.players=[empty(),empty()];
        if(this.level>=this.count){this.stage='complete';this.message='TÜM DUVARLAR AŞILDI!'}
        else {this.stage='approach';this.progress=0;this.message=this.current.hint;}
      }
    }
  }
  snapshot():GameSnapshot{return {mode:this.mode,stage:this.stage,level:this.level,score:this.score,hits:this.hits,progress:this.progress,players:this.players,current:this.current,demo:this.demo,message:this.message}}
}
