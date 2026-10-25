import type {MoveId} from './moves';
import framesJSON from '../../public/sprites/runtime-frames.json';
import {ANIMATIONS,sampleAnimation,spriteFit,type AnimationSample,type SpriteKey} from './sprites';

type SpriteFrame={src:string;source:number[];destination:number[]};
export const SPRITE_FRAMES=framesJSON as Record<SpriteKey,SpriteFrame>;
export const AVATARS=['mavi_erkek','turkuaz_kiz','yesil_erkek'] as const;
export type Avatar=typeof AVATARS[number];
const images=new Map<string,HTMLImageElement>();
let loading:Promise<void>|null=null,ready=false;
const previous=new WeakMap<HTMLCanvasElement,string>();
function avatarAsset(avatar:Avatar,frame:SpriteKey):{path:string;frame:SpriteFrame}{
 if(avatar==='mavi_erkek'){
  const frameData=SPRITE_FRAMES[frame];
  return {path:`sprites/${frameData.src}`,frame:frameData};
 }
 // Each supplied child has actual, separate pose PNGs. Transition poses use that
 // same child's neutral image, not the other child's artwork.
 const pose=(frame==='idle'||frame==='clap-source-prepare'||frame.endsWith('-prepare'))?'idle':frame;
 return {path:`sprites/characters/${avatar}/${pose}.png`,frame:{src:`${pose}.png`,source:[0,0,1024,1024],destination:[0,0,1024,1024]}};
}
export function preloadSprites():Promise<void>{
 loading??=(async()=>{
  const paths=new Set<string>();
  for(const avatar of AVATARS)for(const frame of Object.keys(SPRITE_FRAMES) as SpriteKey[]){paths.add(avatarAsset(avatar,frame).path);}
  await Promise.all([...paths].map(async path=>{
   const image=new Image();image.decoding='async';image.src=`${import.meta.env.BASE_URL}${path}`;
   images.set(path,image);
   try{await image.decode();}catch{throw new Error(`Karakter görseli yüklenemedi: ${path}`);}
   if(!image.naturalWidth||!image.naturalHeight)throw new Error(`Boş karakter görseli: ${path}`);
  }));
  ready=true;
 })();
 return loading;
}
export const spritesReady=()=>ready;
export const spriteImageCount=()=>images.size;
export type Playback={elapsedMs?:number;durationMs?:number;loop?:boolean;mirror?:boolean;guides?:boolean;sample?:AnimationSample};

/** Draw PNG pixels only. There is no vector, geometric or tinted character fallback. */
export function renderKid(canvas:HTMLCanvasElement,id:number,move:MoveId|null,now:number,_sizeFactor=1,playback:Playback={}){
 const bounds=canvas.getBoundingClientRect(),w=bounds.width,h=bounds.height;if(!w||!h)return;
 const dpr=Math.min(2,window.devicePixelRatio||1),cw=Math.max(1,Math.round(w*dpr)),ch=Math.max(1,Math.round(h*dpr));
 const sample=playback.sample??sampleAnimation(move,playback.elapsedMs??now+id*260,playback.durationMs??2400,playback.loop??true);
 const mirror=playback.mirror??true,guides=playback.guides??true;
 const avatar=AVATARS[Math.min(2,Math.max(0,id))];
 const asset=avatarAsset(avatar,sample.frame);
 const key=`${avatar}|${sample.frame}|${mirror}|${guides&&sample.contact}|${cw}x${ch}|${ready}`;
 canvas.dataset.spriteFrame=sample.frame;canvas.dataset.character=avatar;canvas.dataset.move=move??'idle';canvas.dataset.animationPhase=sample.phase;canvas.dataset.mirror=String(mirror);canvas.dataset.progress=sample.progress.toFixed(3);
 if(previous.get(canvas)===key)return;
 previous.set(canvas,key);
 if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
 const ctx=canvas.getContext('2d');if(!ctx)return;
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 if(!ready)return;
 const frame=asset.frame,image=images.get(asset.path);if(!image)return;
 const fit=spriteFit(w,h);ctx.save();ctx.translate(fit.x,fit.y);ctx.scale(fit.scale,fit.scale);
 if(mirror){ctx.translate(1024,0);ctx.scale(-1,1);}
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 const [sx,sy,sw,sh]=frame.source,[dx,dy,dw,dh]=frame.destination;
 ctx.drawImage(image,sx,sy,sw,sh,dx,dy,dw,dh);
 if(sample.contact&&move&&guides){
  for(const contact of ANIMATIONS[move].contacts){
   ctx.beginPath();ctx.arc(contact.x,contact.y,25,0,Math.PI*2);ctx.lineWidth=5;ctx.strokeStyle=contact.hand==='left'?'#9570dc':contact.hand==='right'?'#f18e39':'#ffbd42';ctx.globalAlpha=.8;ctx.stroke();ctx.globalAlpha=1;
  }
 }
 ctx.restore();
}
