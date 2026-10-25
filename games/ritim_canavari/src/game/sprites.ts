import type {MoveId} from './moves';

export type FramePhase = 'idle' | 'prepare' | 'contact' | 'return';
export type SpriteKey = 'idle' | 'clap-source-prepare' | `${MoveId}-prepare` | `${MoveId}-target`;
export type Contact = {x:number;y:number;hand:'right'|'left'|'both'};
export type SpriteAnimation = {prepare:SpriteKey;target:SpriteKey;contacts:Contact[];right:string;left:string};
// Coordinates are in the unmirrored 1024px drawing: anatomical right is viewer-left.
export const ANIMATIONS:Record<MoveId,SpriteAnimation>={
 clap:{prepare:'clap-source-prepare',target:'clap-target',contacts:[{x:512,y:545,hand:'both'}],right:'Sol avuç',left:'Sağ avuç'},
 cross:{prepare:'cross-prepare',target:'cross-target',contacts:[{x:600,y:465,hand:'right'},{x:425,y:465,hand:'left'}],right:'Sol omuz',left:'Sağ omuz'},
 rightShoulder:{prepare:'rightShoulder-prepare',target:'rightShoulder-target',contacts:[{x:600,y:465,hand:'right'}],right:'Sol omuz',left:'Serbest, aşağıda'},
 leftShoulder:{prepare:'leftShoulder-prepare',target:'leftShoulder-target',contacts:[{x:425,y:465,hand:'left'}],right:'Serbest, aşağıda',left:'Sağ omuz'},
 leftHead:{prepare:'leftHead-prepare',target:'leftHead-target',contacts:[{x:630,y:170,hand:'left'},{x:425,y:610,hand:'right'}],right:'Sağ bel yanı',left:'Başın üstü'},
 rightHead:{prepare:'rightHead-prepare',target:'rightHead-target',contacts:[{x:400,y:170,hand:'right'},{x:610,y:610,hand:'left'}],right:'Başın üstü',left:'Sol bel yanı'},
 bothKnees:{prepare:'bothKnees-prepare',target:'bothKnees-target',contacts:[{x:420,y:760,hand:'right'},{x:600,y:760,hand:'left'}],right:'Sağ diz',left:'Sol diz'},
 rightKnee:{prepare:'rightKnee-prepare',target:'rightKnee-target',contacts:[{x:600,y:760,hand:'right'}],right:'Sol diz',left:'Belde, dizlerden uzakta'},
 leftKnee:{prepare:'leftKnee-prepare',target:'leftKnee-target',contacts:[{x:420,y:760,hand:'left'}],right:'Belde, dizlerden uzakta',left:'Sağ diz'},
 hips:{prepare:'hips-prepare',target:'hips-target',contacts:[{x:415,y:610,hand:'right'},{x:620,y:610,hand:'left'}],right:'Sağ bel yanı',left:'Sol bel yanı'},
 star:{prepare:'star-prepare',target:'star-target',contacts:[],right:'Yukarı ve yana açık',left:'Yukarı ve yana açık'},
 rightHipLeftShoulder:{prepare:'rightHipLeftShoulder-prepare',target:'rightHipLeftShoulder-target',contacts:[{x:423,y:638,hand:'right'},{x:440,y:487,hand:'left'}],right:'Sağ bel yanı',left:'Sağ omuz'},
 leftHipRightShoulder:{prepare:'leftHipRightShoulder-prepare',target:'leftHipRightShoulder-target',contacts:[{x:580,y:487,hand:'right'},{x:600,y:638,hand:'left'}],right:'Sol omuz',left:'Sol bel yanı'},
};
export type AnimationSample={frame:SpriteKey;phase:FramePhase;progress:number;contact:boolean};
export function sampleAnimation(move:MoveId|null,elapsedMs:number,durationMs=2400,loop=true):AnimationSample{
 if(!move)return {frame:'idle',phase:'idle',progress:0,contact:false};
 const duration=Math.max(1,durationMs),positive=Math.max(0,Number.isFinite(elapsedMs)?elapsedMs:0);
 const progress=loop?(positive%duration)/duration:Math.min(1,positive/duration),animation=ANIMATIONS[move];
 if(progress<.10||progress>=.94)return {frame:'idle',phase:'idle',progress,contact:false};
 if(progress<.28)return {frame:animation.prepare,phase:'prepare',progress,contact:false};
 if(progress<.82)return {frame:animation.target,phase:'contact',progress,contact:true};
 return {frame:animation.prepare,phase:'return',progress,contact:false};
}
export function spriteFit(width:number,height:number,inset=8){
 const scale=Math.max(0,Math.min((width-inset*2)/1024,(height-inset*2)/1024));
 return {scale,x:(width-1024*scale)/2,y:(height-1024*scale)/2};
}
export const PAIRS:Partial<Record<MoveId,MoveId>>={rightShoulder:'leftShoulder',leftShoulder:'rightShoulder',leftHead:'rightHead',rightHead:'leftHead',rightKnee:'leftKnee',leftKnee:'rightKnee',rightHipLeftShoulder:'leftHipRightShoulder',leftHipRightShoulder:'rightHipLeftShoulder'};
