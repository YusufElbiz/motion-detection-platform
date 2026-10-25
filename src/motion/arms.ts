import type {HandCursor} from './input.ts';
const NS='http://www.w3.org/2000/svg';
export const armConfig={anchors:[{x:-35,y:755},{x:1315,y:755}],width:30,animationMs:85};
function handArtwork(skin:string){
  const fingers=['M-18 -9 Q-23 -26 -23 -48','M-6 -14 Q-8 -37 -7 -61','M7 -13 Q10 -34 10 -55','M18 -8 Q25 -25 25 -43','M-21 6 Q-36 -1 -39 -14'];
  return `<g class="open-art"><g fill="none" stroke-linecap="round" stroke-linejoin="round">${fingers.map(d=>`<path d="${d}" stroke="#8e654c" stroke-width="14"/><path d="${d}" stroke="${skin}" stroke-width="10.5"/>`).join('')}</g><path d="M-23 20 Q-29 2 -22 -14 Q-8 -22 17 -15 Q28 -8 24 13 L20 29 Q-1 35 -20 27Z" fill="${skin}" stroke="#8e654c" stroke-width="2"/><path d="M-15 8 Q-3 13 8 8 M-12 18 Q-3 22 6 18" fill="none" stroke="#cc9874" stroke-width="1.5" stroke-linecap="round"/><path d="M-15 -9 Q-7 -13 1 -11" fill="none" stroke="#fff3d5" stroke-width="3" opacity=".6" stroke-linecap="round"/></g><g class="fist-art"><path d="M-25 21 Q-34 4 -27 -13 Q-25 -24 -16 -22 Q-7 -28 1 -22 Q12 -27 19 -19 Q30 -20 30 -8 L27 15 Q25 30 9 32 L-11 31Q-20 30 -25 21Z" fill="${skin}" stroke="#8e654c" stroke-width="2.5"/><path d="M-22 -12 Q-16 -17 -10 -12 M-8 -15 Q-2 -19 4 -13 M6 -14 Q13 -17 18 -10 M20 -9 Q26 -12 28 -6" fill="none" stroke="#ba8767" stroke-width="2" stroke-linecap="round"/><path d="M-26 0 Q-35 -10 -27 -15 Q-21 -18 -17 -9 L8 -4 Q17 -2 13 5 Q10 10 2 8 L-16 5 Q-21 8 -26 0Z" fill="${skin}" stroke="#8e654c" stroke-width="2"/><path d="M-15 -18 L-6 -18" stroke="#fff0cf" stroke-width="3" stroke-linecap="round" opacity=".65"/></g>`;
}
interface ArmNode {back:SVGGElement;front:HTMLElement;closed:number;angle:number;last:number;slot:number}
export class CartoonArms {
  private svg:SVGSVGElement;
  private front:HTMLElement;
  private nodes=new Map<string,ArmNode>();
  constructor(game:HTMLElement,front:HTMLElement){
    this.front=front;this.svg=document.createElementNS(NS,'svg');this.svg.setAttribute('viewBox','0 0 1280 720');this.svg.setAttribute('preserveAspectRatio','none');this.svg.setAttribute('aria-hidden','true');this.svg.classList.add('cartoon-arms');game.insertBefore(this.svg,game.querySelector('#playfield'));
  }
  update(cursors:HandCursor[],now:number){
    const ids=new Set(cursors.map(c=>c.id));
    for(const [id,node]of this.nodes)if(!ids.has(id)){node.back.remove();node.front.remove();this.nodes.delete(id);}
    for(const cursor of cursors){
      let node=this.nodes.get(cursor.id);
      const color=cursor.colorSlot===0?'#65b4a8':'#e7a15c',skin=cursor.colorSlot===0?'#f3c7a5':'#e6b38c';
      if(!node){
        const back=document.createElementNS(NS,'g');back.innerHTML=`<path class="arm-shadow" fill="none" stroke="#6f8d6618" stroke-width="43" stroke-linecap="round"/><path class="skin-outline" fill="none" stroke="#997254" stroke-width="${armConfig.width+4}" stroke-linecap="round"/><path class="skin-arm" fill="none" stroke="${skin}" stroke-width="${armConfig.width}" stroke-linecap="round"/><path class="sleeve-outline" fill="none" stroke="#648a70" stroke-width="55" stroke-linecap="round"/><path class="sleeve" fill="none" stroke="${color}" stroke-width="50" stroke-linecap="round"/><g class="hand-art"><path d="M-19 41 L-21 24 Q0 18 21 24 L19 41Z" fill="${color}" stroke="#63856c" stroke-width="2"/>${handArtwork(skin)}</g>`;
        this.svg.append(back);
        const front=document.createElement('div');front.className='hand-cursor cartoon-cursor';front.dataset.pointerId=cursor.id;
        front.innerHTML=`<svg viewBox="-70 -80 140 160" aria-hidden="true"><g class="front-art"><g class="grip-art"><path d="M-31 19 Q-42 13 -37 4 Q-33 1 -28 7 L-17 19 Q-11 27 -18 29 Q-26 29 -31 19Z" fill="${skin}" stroke="#8e654c" stroke-width="2"/><path d="M29 16 Q36 8 40 13 Q43 20 34 27 L18 31 Q12 30 16 23Z" fill="${skin}" stroke="#8e654c" stroke-width="2"/><path d="M-17 28 Q0 36 18 29" fill="none" stroke="#8e654c" stroke-width="2"/></g><circle class="hand-dwell-ring" cx="0" cy="0" r="45" fill="none" stroke="${color}" stroke-width="4" transform="rotate(-90)"/></g></svg>`;
        this.front.append(front);node={back,front,closed:0,angle:cursor.angle,last:now,slot:cursor.colorSlot};this.nodes.set(cursor.id,node);
      }
      const delta=Math.max(1,Math.min(50,now-node.last));node.last=now;
      const target=cursor.gesture==='CLOSED'?1:cursor.gesture==='CLOSING'?.65:cursor.gesture==='OPENING'?.25:cursor.gesture==='OPEN'?0:node.closed;
      node.closed+=(target-node.closed)*Math.min(1,delta/Math.max(10,armConfig.animationMs/2.5));
      const rotation=((cursor.angle-node.angle+540)%360)-180;node.angle+=rotation*(1-Math.exp(-delta/25));
      const rad=node.angle*Math.PI/180,x=cursor.position.x,y=cursor.position.y;
      const wrist={x:x-Math.sin(rad)*32,y:y+Math.cos(rad)*32};
      const anchor=armConfig.anchors[node.slot]??armConfig.anchors[0];
      const elbow={x:anchor.x*.52+wrist.x*.48+(node.slot===0?-45:45),y:Math.max(wrist.y+65,(anchor.y+wrist.y)*.5+45)};
      const path=`M${anchor.x} ${anchor.y} Q${elbow.x} ${elbow.y} ${wrist.x} ${wrist.y}`;
      for(const name of ['arm-shadow','skin-outline','skin-arm'])this.attribute(node.back.querySelector(`.${name}`)!, 'd',path);
      const sleeveEnd={x:anchor.x*.64+elbow.x*.36,y:anchor.y*.64+elbow.y*.36};
      for(const name of ['sleeve','sleeve-outline'])this.attribute(node.back.querySelector(`.${name}`)!,'d',`M${anchor.x} ${anchor.y} L${sleeveEnd.x} ${sleeveEnd.y}`);
      const art=node.back.querySelector<SVGGElement>('.hand-art')!;
      this.attribute(art,'transform',`translate(${x} ${y}) rotate(${node.angle})`);
      this.attribute(art.querySelector('.open-art')!,'opacity',String(1-node.closed));this.attribute(art.querySelector('.fist-art')!,'opacity',String(node.closed));
      const lost=cursor.state==='TRACKING_LOST',unknown=cursor.gesture==='UNKNOWN';
      this.attribute(node.back,'opacity',lost?'.22':unknown?'.55':'1');
      const left=`${x/1280*100}%`,top=`${y/720*100}%`;
      if(node.front.style.left!==left)node.front.style.left=left;if(node.front.style.top!==top)node.front.style.top=top;
      node.front.dataset.state=cursor.state;node.front.dataset.gesture=cursor.gesture;
      node.front.classList.toggle('carrying',cursor.carrying);node.front.classList.toggle('lost',lost);
      this.attribute(node.front.querySelector('.front-art')!,'transform',`rotate(${node.angle})`);
      this.attribute(node.front.querySelector('.hand-dwell-ring')!,'stroke-dasharray',`${cursor.progress*282.74} 282.74`);
      this.attribute(node.front.querySelector('.hand-dwell-ring')!,'opacity',cursor.progress>0?'1':'0');
    }
  }
  private attribute(node:Element,name:string,value:string){if(node.getAttribute(name)!==value)node.setAttribute(name,value);}
}
