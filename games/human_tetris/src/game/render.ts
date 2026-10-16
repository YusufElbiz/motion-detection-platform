import {LANDMARKS,LINKS,type Joint,type Pose} from './poses';
import type {Landmark} from '../vision/types';
import type {GameSnapshot} from './engine';
import type {FeedbackStatus,MatchResult} from './matcher';
const bones:readonly [Joint,Joint][]=[...LINKS,['leftShoulder','rightShoulder'],['leftShoulder','leftHip'],['rightShoulder','rightHip'],['leftHip','rightHip']];
function prepare(canvas:HTMLCanvasElement){
  const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
  const width=Math.max(1,Math.round(rect.width*dpr)),height=Math.max(1,Math.round(rect.height*dpr));
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  const ctx=canvas.getContext('2d')!;ctx.setTransform(dpr,0,0,dpr,0,0);
  return {ctx,w:rect.width,h:rect.height};
}
function shape(ctx:CanvasRenderingContext2D,template:Pose,centerX:number,centerY:number,scale:number){
  const p=(joint:Joint):[number,number]=>[centerX+template[joint][0]*scale,centerY+template[joint][1]*scale];
  ctx.lineCap='round';ctx.lineJoin='round';
  // Body as a solid, rounded torso with thick limbs; the silhouette is an actual cutout.
  const sL=p('leftShoulder'),sR=p('rightShoulder'),hL=p('leftHip'),hR=p('rightHip');
  ctx.beginPath();ctx.moveTo(sL[0]-scale*.09,sL[1]+scale*.05);ctx.quadraticCurveTo(centerX,centerY-scale*.52,sR[0]+scale*.09,sR[1]+scale*.05);ctx.lineTo(hR[0]+scale*.05,hR[1]);ctx.quadraticCurveTo(centerX,centerY+scale*.52,hL[0]-scale*.05,hL[1]);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.arc(...p('head'),scale*.205,0,Math.PI*2);ctx.fill();
  for(const [a,b] of LINKS){ctx.beginPath();ctx.lineWidth=scale*((b.includes('Knee')||b.includes('Ankle')) ? 0.23 : 0.16);ctx.moveTo(...p(a));ctx.lineTo(...p(b));ctx.stroke();}
  // Palms / shoes are emphasized to make target hand and foot positions readable.
  for(const j of ['leftWrist','rightWrist','leftAnkle','rightAnkle'] as Joint[]){ctx.beginPath();ctx.arc(...p(j),scale*(j.includes('Ankle')?.115:.10),0,Math.PI*2);ctx.fill();}
}
export function renderWall(canvas:HTMLCanvasElement,s:GameSnapshot,time:number){
  const {ctx,w,h}=prepare(canvas);if(!w||!h)return;
  ctx.clearRect(0,0,w,h);
  const x=w*.018,y=h*.018,ww=w*.964,hh=h*.964;
  ctx.save();
  // Outer wall panel
  const gradient=ctx.createLinearGradient(0,0,w,h);
  gradient.addColorStop(0,'#ff4c9f');gradient.addColorStop(.52,'#ff2385');gradient.addColorStop(1,'#dc176d');
  ctx.shadowColor='#ff328f';ctx.shadowBlur=26;ctx.fillStyle=gradient;ctx.fillRect(x,y,ww,hh);
  ctx.shadowBlur=0;
  ctx.globalAlpha=.11;ctx.strokeStyle='#fff';ctx.lineWidth=1;
  for(let i=0;i<ww/35;i++){ctx.beginPath();ctx.moveTo(x+i*35,y);ctx.lineTo(x+i*35-30,y+hh);ctx.stroke();}
  ctx.globalAlpha=1;
  const duo=s.mode==='duo';
  const templates=duo?[s.current.left,s.current.right]:[s.current.left];
  const size=Math.min(w*(duo?.145:.30),h*(duo?.30:.31));
  const cy=h*(duo?.48:.49);
  const positions=duo?[w*.28,w*.72]:[w*.50];
  ctx.globalCompositeOperation='destination-out';ctx.fillStyle='#000';ctx.strokeStyle='#000';
  templates.forEach((target,i)=>shape(ctx,target,positions[i],cy,size));
  ctx.globalCompositeOperation='source-over';
  templates.forEach((target,i)=>{
    const match=s.players[i].match;
    const status=match?.jointFeedback??{};
    const segments=new Map(match?.segmentFeedback?.map(seg=>[`${seg.start}-${seg.end}`,seg.status])??[]);
    const pt=(j:Joint):[number,number]=>[positions[i]+target[j][0]*size,cy+target[j][1]*size];
    ctx.strokeStyle=s.players[i].ready?'#6affd8':'rgba(255,255,255,.89)';
    ctx.shadowColor='#ffd0eb';ctx.shadowBlur=12;ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(...pt('head'),size*.205,0,Math.PI*2);ctx.stroke();
    for(const [a,b] of LINKS){
      ctx.strokeStyle=match?.visible?feedbackColor(segments.get(`${a}-${b}`)??status[b], '#fdf3ff'):'#fdf3ff';
      ctx.beginPath();ctx.moveTo(...pt(a));ctx.lineTo(...pt(b));ctx.stroke();
    }
    ctx.shadowBlur=0;
    if(duo){
      ctx.fillStyle='rgba(12,11,28,.85)';ctx.fillRect(positions[i]-48,h*.805,96,27);
      ctx.fillStyle=s.players[i].ready?'#6dff8f':'#fff';ctx.font='800 14px system-ui';ctx.textAlign='center';
      ctx.fillText(`OYUNCU ${i+1}`,positions[i],h*.846);
    }
  });
  ctx.shadowBlur=0;
  ctx.strokeStyle='rgba(255,245,255,.82)';ctx.lineWidth=3;ctx.strokeRect(x+5,y+5,ww-10,hh-10);
  ctx.restore();
}
const feedbackColor=(status?:FeedbackStatus,fallback='#4de9ff')=>status==='good'?'#6dff8f':status==='warn'?'#ffd84d':status==='bad'?'#ff5b7d':status==='missing'?'#ff345f':fallback;
const segmentKey=(a:Joint,b:Joint)=>`${a}-${b}`;
export function renderCamera(canvas:HTMLCanvasElement,video:HTMLVideoElement,poses:(Landmark[]|null)[],ready:boolean[],matches:(MatchResult|null)[],now:number){
  const {ctx,w,h}=prepare(canvas);ctx.clearRect(0,0,w,h);
  if(!video.videoWidth)return;
  // This canvas overlays a mirrored object-fit:cover video. Use identical cover transform.
  const rw=video.videoWidth,rh=video.videoHeight,scale=Math.max(w/rw,h/rh),x0=(w-rw*scale)/2,y0=(h-rh*scale)/2;
  ctx.save();ctx.translate(w,0);ctx.scale(-1,1);
  poses.forEach((points,i)=>{
    if(!points)return;
    const x=(j:number)=>x0+points[j].x*rw*scale;
    const y=(j:number)=>y0+points[j].y*rh*scale;
    const match=matches[i];
    const segmentMap=new Map<string,FeedbackStatus>();
    match?.segmentFeedback?.forEach(seg=>segmentMap.set(segmentKey(seg.start,seg.end),seg.status));
    const jointMap=match?.jointFeedback??{};
    const baseColor=ready[i]?'#76ffbf':'#4de9ff';
    ctx.lineWidth=2.8;ctx.shadowBlur=8;
    for(const [a,b] of bones){
      const ai=LANDMARKS[a],bi=LANDMARKS[b];
      if((points[ai].visibility??1)<.3||(points[bi].visibility??1)<.3)continue;
      const color=feedbackColor(segmentMap.get(segmentKey(a,b))??jointMap[b]??jointMap[a],baseColor);
      ctx.strokeStyle=color;ctx.shadowColor=color;ctx.beginPath();ctx.moveTo(x(ai),y(ai));ctx.lineTo(x(bi),y(bi));ctx.stroke();
    }
    for(const key of Object.keys(LANDMARKS) as Joint[]){
      const j=LANDMARKS[key];if((points[j].visibility??1)<.3)continue;
      const color=feedbackColor(jointMap[key],baseColor);
      ctx.fillStyle=color;ctx.shadowColor=color;ctx.beginPath();ctx.arc(x(j),y(j),key==='head'?6:3.8,0,Math.PI*2);ctx.fill();
    }
  });
  ctx.restore();
  const active=matches.length>1&&matches[1]!==null;
  const cards=active?2:1;
  for(let i=0;i<cards;i++){
    const match=matches[i];
    if(!match)continue;
    const text=match.visible?(match.accepted?'✓ POZ DOĞRU':(match.highlights[0]??match.message)):(match.message??'Oyuncu görünmüyor');
    const bh=26,by=h-7-(cards-i)*30;
    ctx.fillStyle='rgba(8,12,26,.85)';ctx.fillRect(9,by,Math.max(0,w-18),bh);
    ctx.fillStyle=match.accepted?'#6dff8f':'#ffd84d';ctx.font='700 11px system-ui';
    ctx.fillText(`${cards===2?`${i+1}. OYUNCU · `:''}${text}`.slice(0,65),17,by+17,Math.max(0,w-30));
  }
  // Fine grid readable over the camera, doesn't enter the MediaPipe pipeline.
  ctx.strokeStyle='rgba(140,242,255,.11)';ctx.lineWidth=1;
  for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(i*w/4,0);ctx.lineTo(i*w/4,h);ctx.stroke();}
}
