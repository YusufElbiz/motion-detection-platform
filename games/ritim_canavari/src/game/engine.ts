import type {Body,MoveId} from './moves';
import {CHAPTERS,matchMove,MOVES} from './moves';
export type Phase='demo'|'play'|'celebrate'|'finished';
export const RHYTHM_STEP_TIMEOUT_MS=5000;
export type PlayerState={
 id:number;name:string;color:string;stage:number;step:number;phase:Phase;phaseAt:number;stepAt:number;matchedAt:number|null;mustRelease:boolean;lastBeatAt:number;misses:number;score:number;combo:number;longestCombo:number;finishedAt:number|null;feedback:string;lastGoodAt:number;hasSeenPose:boolean;hint:boolean;retrying:boolean;missingSince:number|null;
};
const COLORS=['#f58e5e','#9272de','#4db9ab'];
export class RhythmGame{
 players:PlayerState[]=[];active=false;mode:'webcam'|'test'='webcam';winner:number|null=null;startedAt=0;
 start(n:number,now:number,mode:'webcam'|'test'='webcam'){
  this.players=Array.from({length:n},(_,i)=>({id:i,name:['EFE','LİLA','ARDA'][i],color:COLORS[i],stage:0,step:0,phase:'demo' as Phase,phaseAt:now,stepAt:now,matchedAt:null,mustRelease:false,lastBeatAt:now,misses:0,score:0,combo:0,longestCombo:0,finishedAt:null,feedback:'Ritmi izle ve aklında tut!',lastGoodAt:0,hasSeenPose:false,hint:false,retrying:false,missingSince:null}));
  this.active=true;this.mode=mode;this.winner=null;this.startedAt=now;
 }
 getChapter(p:PlayerState){return CHAPTERS[Math.min(9,p.stage)]}
 demoIndex(p:PlayerState,now:number){const c=this.getChapter(p),length=Math.max(630,60000/c.tempo*1.12);return Math.floor((now-p.phaseAt-900)/length);}
 demoMove(p:PlayerState,now:number):MoveId{const c=this.getChapter(p);return c.sequence[Math.max(0,Math.min(c.sequence.length-1,this.demoIndex(p,now)))];}
 demoDuration(p:PlayerState){const c=this.getChapter(p);return 900+c.sequence.length*Math.max(630,60000/c.tempo*1.12)+650;}
 replay(p:PlayerState,now:number){if(p.phase==='finished')return;p.phase='demo';p.phaseAt=now;p.stepAt=now;p.matchedAt=null;p.mustRelease=false;p.feedback='Bir kez daha izle!';p.hint=false;p.combo=0;p.retrying=false;p.missingSince=null;}
 setHint(player:number){const p=this.players[player];if(p)p.hint=true;}
 // No real recognition in test mode; the manual button is deliberately labeled as a simulation.
 debugAdvance(i:number,now:number){const p=this.players[i];if(!p)return;if(p.phase==='demo'){p.phase='play';p.phaseAt=now;p.stepAt=now;return;}if(p.phase==='play')this.completeStep(p,now);if(p.phase==='celebrate'){p.phase='demo';p.phaseAt=now;}}
 tick(now:number,bodies:(Body|null)[]){
  if(!this.active)return;
  for(const p of this.players){
   if(p.phase==='demo'){
    if(now-p.phaseAt>=this.demoDuration(p)){p.phase='play';p.phaseAt=now;p.stepAt=now;p.feedback='Sırayı hatırla. Harekete geç!';p.matchedAt=null;p.missingSince=null;p.retrying=false;}
    continue;
   }
   if(p.phase==='celebrate'){
    if(now-p.phaseAt>1400){p.phase='demo';p.phaseAt=now;p.stepAt=now;p.feedback='Yeni ritmi öğren!';}
    continue;
   }
   if(p.phase==='finished')continue;
   if(this.mode==='test')continue;
   const b=bodies[p.id]??null,c=this.getChapter(p),move=c.sequence[p.step];
   if(!b||!b.visible){
     // Camera occlusion is not a failed move: pause the five-second limit.
     p.missingSince??=now;
     p.feedback='Kamerada yüzün, ellerin ve dizlerin görünsün.';
     p.matchedAt=null;
     continue;
   }
   if(p.missingSince!==null){p.stepAt+=now-p.missingSince;p.missingSince=null;}
   p.hasSeenPose=true;
   const yes=matchMove(move,b);
   if(p.mustRelease){
    if(!yes){p.mustRelease=false;p.stepAt=now;}
    else{
      if(now-p.stepAt>=RHYTHM_STEP_TIMEOUT_MS){this.restartRhythm(p,now);continue;}
      p.feedback='Sıradaki vuruş için ellerini biraz geri çek.';
    }
    continue;
   }
   if(yes){
     // A new correct pose must START within five seconds; allow the usual 210 ms confirmation.
     if(p.matchedAt===null&&now-p.stepAt>=RHYTHM_STEP_TIMEOUT_MS){this.restartRhythm(p,now);continue;}
     p.matchedAt??=now;
     if(now-p.matchedAt>=320)this.completeStep(p,now);
     else p.feedback='TAMAM! Bir an tut…';
   }else{
     p.matchedAt=null;
     if(now-p.stepAt>=RHYTHM_STEP_TIMEOUT_MS){
       this.restartRhythm(p,now);
       continue;
     }
     const remaining=Math.max(1,Math.ceil((RHYTHM_STEP_TIMEOUT_MS-(now-p.stepAt))/1000));
     if(now-p.stepAt>1500){
       if(now-p.lastBeatAt>1000){p.misses++;p.lastBeatAt=now;p.combo=0;}
       p.feedback=(p.hint?MOVES[move].description:'Hmm, başka bir hareket. Ritmi hatırla!')+` · ${remaining} sn`;
     }else p.feedback=(p.hint?MOVES[move].description:'Hadi! Hafızandan sıradakini yap.')+` · ${remaining} sn`;
   }
  }
  // The first player who completes all 10 stages wins immediately.
  if(this.winner===null){
   const finished=this.players.filter(p=>p.finishedAt!==null);
   if(finished.length)this.winner=finished.sort((a,b)=>(a.finishedAt??0)-(b.finishedAt??0)||a.id-b.id)[0].id;
  }
 }
 // Only the current rhythm sequence is replayed; the chapter/stage is unchanged.
 private restartRhythm(p:PlayerState,now:number){
  p.step=0;p.phase='demo';p.phaseAt=now;p.stepAt=now;
  p.matchedAt=null;p.mustRelease=false;p.lastBeatAt=now;
  p.combo=0;p.hint=false;p.missingSince=null;p.retrying=true;
  p.feedback='5 saniye doldu! Aynı ritim baştan gösteriliyor.';
 }
 private completeStep(p:PlayerState,now:number){
  const seq=this.getChapter(p).sequence;
  const tempo=this.getChapter(p).tempo,beatMs=60000/tempo,elapsed=Math.max(0,now-p.phaseAt),beatOffset=elapsed%beatMs;
  const timingError=Math.min(beatOffset,beatMs-beatOffset);
  const rhythmBonus=Math.round(Math.max(0,90-(timingError/beatMs)*220));
  p.score+=120+rhythmBonus+Math.max(0,Math.round(75-(now-p.stepAt)*.012))+p.combo*8;
  p.combo++;p.longestCombo=Math.max(p.longestCombo,p.combo);p.lastGoodAt=now;p.matchedAt=null;
  const last=seq[p.step];p.step++;
  if(p.step>=seq.length){
   p.stage++;p.combo=0;p.step=0;p.mustRelease=false;p.retrying=false;p.missingSince=null;
   if(p.stage>=CHAPTERS.length){p.phase='finished';p.finishedAt=now;p.feedback='BÜTÜN RİTİMLER TAMAMLANDI!';}
   else{p.phase='celebrate';p.phaseAt=now;p.feedback='BÖLÜM GEÇİLDİ! YENİ RİTİM GELİYOR.';}
  }else{
   p.stepAt=now;p.lastBeatAt=now;p.mustRelease=seq[p.step]===last;
   p.feedback=rhythmBonus>=60?'RİTMİ YAKALADIN! 🎵':'DOĞRU! SIRADAKİ HAREKET!';
  }
 }
}
