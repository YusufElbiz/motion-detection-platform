import type {PlayerState,RhythmGame} from './engine';
import type {MoveId} from './moves';
export type CharacterCue={move:MoveId|null;elapsedMs:number;durationMs:number;loop:boolean};
export function characterCue(game:RhythmGame,player:PlayerState,now:number,hintAt:number|null=null):CharacterCue{
 const idle:CharacterCue={move:null,elapsedMs:0,durationMs:2400,loop:false},chapter=game.getChapter(player);
 if(player.phase==='demo'){
  const index=game.demoIndex(player,now);
  if(index<0||index>=chapter.sequence.length)return idle;
  const duration=(game.demoDuration(player)-900-650)/chapter.sequence.length;
  return {move:chapter.sequence[index],elapsedMs:now-player.phaseAt-900-index*duration,durationMs:duration,loop:false};
 }
 if(player.phase==='play'&&player.hint&&hintAt!==null)return {move:chapter.sequence[player.step],elapsedMs:Math.max(0,now-hintAt),durationMs:2400,loop:true};
 if(player.phase==='finished')return {move:'star',elapsedMs:now-(player.finishedAt??now),durationMs:2600,loop:true};
 // Never reveal the expected move during memory play or a level transition.
 return idle;
}
