// Require both progress and active play time; pauses do not consume the gap.
export class EncouragementSchedule {
 private lastScore=0;
 private lastTime=0;
 reset(){this.lastScore=0;this.lastTime=0;}
 postpone(activeSeconds:number){this.lastTime=activeSeconds;}
 take(score:number,activeSeconds:number){
  if(score-this.lastScore<4||activeSeconds-this.lastTime<40)return false;
  this.lastScore=score;this.lastTime=activeSeconds;return true;
 }
}
