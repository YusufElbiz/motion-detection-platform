import type {Landmark} from '../vision/types';
export type MoveId='clap'|'cross'|'rightShoulder'|'leftShoulder'|'leftHead'|'rightHead'|'bothKnees'|'rightKnee'|'leftKnee'|'hips'|'star'|'rightHipLeftShoulder'|'leftHipRightShoulder';
export type Move={id:MoveId;label:string;short:string;emoji:string;description:string;accent:string};
export const MOVES:Record<MoveId,Move>={
  clap:{id:'clap',label:'Alkış!',short:'ALKIŞ',emoji:'👏',description:'İki avucunu göğsünün önünde birleştir.',accent:'#ef8f35'},
  cross:{id:'cross',label:'Çapraz kucak!',short:'ÇAPRAZ',emoji:'🤗',description:'İki elinle karşı omzuna dokun.',accent:'#a77cf0'},
  rightShoulder:{id:'rightShoulder',label:'Sağdan sola!',short:'SAĞ → SOL',emoji:'↗️',description:'Sağ elinle sol omzuna dokun.',accent:'#57b9c1'},
  leftShoulder:{id:'leftShoulder',label:'Soldan sağa!',short:'SOL → SAĞ',emoji:'↖️',description:'Sol elinle sağ omzuna dokun.',accent:'#ef83a5'},
  leftHead:{id:'leftHead',label:'Sol el başta!',short:'SOL BAŞ',emoji:'🙆',description:'Sol elini başına, sağ elini beline koy.',accent:'#bb86ff'},
  rightHead:{id:'rightHead',label:'Sağ el başta!',short:'SAĞ BAŞ',emoji:'🙋',description:'Sağ elini başına, sol elini beline koy.',accent:'#6aade9'},
  bothKnees:{id:'bothKnees',label:'Diz davulu!',short:'DİZ DAVULU',emoji:'🥁',description:'İki elinle dizlerine dokun.',accent:'#f8af4f'},
  rightKnee:{id:'rightKnee',label:'Çapraz diz!',short:'SAĞ → DİZ',emoji:'🦵',description:'Sağ elini sol dizine götür.',accent:'#fd8d76'},
  leftKnee:{id:'leftKnee',label:'Ters çapraz diz!',short:'SOL → DİZ',emoji:'🦵',description:'Sol elini sağ dizine götür.',accent:'#6bc3aa'},
  hips:{id:'hips',label:'Süper kahraman!',short:'ELLER BELDE',emoji:'🦸',description:'İki elini beline koy.',accent:'#ee99b1'},
  star:{id:'star',label:'Yıldız ol!',short:'YILDIZ',emoji:'🌟',description:'İki kolunu yukarı ve yana aç.',accent:'#e5ae39'},
  rightHipLeftShoulder:{id:'rightHipLeftShoulder',label:'Karışık kollar!',short:'BEL & OMUZ',emoji:'⚡',description:'Sağ el belde, sol el sağ omuzda.',accent:'#e4a042'},
  leftHipRightShoulder:{id:'leftHipRightShoulder',label:'Ters karışık!',short:'OMUZ & BEL',emoji:'🔄',description:'Sol el belde, sağ el sol omuzda.',accent:'#a987f5'}
};
export type Chapter={name:string;world:string;tempo:number;sequence:MoveId[];tip:string};
export const CHAPTERS:Chapter[]=[
 {name:'Isınma Dansı',world:'Şeker Ormanı',tempo:68,sequence:['clap','hips','cross'],tip:'3 hareketi sırayla aklında tut.'},
 {name:'Taklit Zamanı',world:'Balon Meydanı',tempo:76,sequence:['rightShoulder','clap','leftShoulder','hips'],tip:'Sağ ve sol yer değiştiriyor!'},
 {name:'Diz Davulu',world:'Zıpzıp Vadisi',tempo:84,sequence:['bothKnees','clap','cross','bothKnees'],tip:'Yukarıdan aşağıya dikkat et.'},
 {name:'Kafam Karıştı',world:'Bulut Sahnesi',tempo:92,sequence:['rightHead','leftHead','clap','rightHead','hips'],tip:'Elleri karıştırma!'},
 {name:'Çapraz Dalgası',world:'Gökkuşağı Köprüsü',tempo:100,sequence:['rightShoulder','leftShoulder','cross','clap','hips'],tip:'Çapraz hareketlere odaklan.'},
 {name:'Süper Kahraman',world:'Yıldız Arenası',tempo:108,sequence:['star','hips','rightHead','leftHead','star','clap'],tip:'Kollar yukarı, sonra yerde!'},
 {name:'Çılgın Davullar',world:'Ritim Gezegeni',tempo:116,sequence:['rightKnee','leftKnee','bothKnees','clap','rightShoulder','leftShoulder'],tip:'El ve diz eşleştirmelerini izle.'},
 {name:'Ters Köşe',world:'Karamel Labirenti',tempo:124,sequence:['rightHipLeftShoulder','leftHipRightShoulder','clap','cross','rightHead','leftHead','hips'],tip:'Bir el başka, diğer el başka yerde.'},
 {name:'Hafıza Fırtınası',world:'Disco Bulutu',tempo:132,sequence:['star','rightKnee','clap','leftHead','cross','leftKnee','hips','star'],tip:'8 hareketi hatırla, sakince tamamla.'},
 {name:'Ritim Canavarı!',world:'Büyük Ritim Sahnesi',tempo:144,sequence:['clap','rightHead','bothKnees','leftHipRightShoulder','star','rightKnee','cross','leftHead','clap'],tip:'Final! 9 adımı doğru sırada tamamla.'}
];
export type TinyPoint={x:number;y:number;c:number};
export type Body={points:Record<number,TinyPoint>;scale:number;centerX:number;visible:boolean};
const ix=[0,7,8,11,12,13,14,15,16,23,24,25,26,27,28];
export function toBody(raw:Landmark[]|null,aspect=16/9):Body|null{
 if(!raw||raw.length<29)return null;
 const points:Record<number,TinyPoint>={};
 for(const i of ix){const p=raw[i];if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))return null;points[i]={x:p.x*aspect,y:p.y,c:Math.min(p.visibility??1,p.presence??1)};}
 const dis=(a:number,b:number)=>Math.hypot(points[a].x-points[b].x,points[a].y-points[b].y);
 const shoulder=dis(11,12);const torso=Math.hypot((points[11].x+points[12].x-points[23].x-points[24].x)/2,(points[11].y+points[12].y-points[23].y-points[24].y)/2);
 const scale=Math.max(.09,torso,shoulder*.85);
 const visible=[0,11,12,13,14,15,16,23,24,25,26].every(i=>points[i].c>.42);
 return {points,scale,centerX:(points[11].x+points[12].x+points[23].x+points[24].x)/(4*aspect),visible};
}
function ratio(b:Body,a:number,c:number){const A=b.points[a],B=b.points[c];return Math.hypot(A.x-B.x,A.y-B.y)/b.scale;}
function near(b:Body,a:number,c:number,threshold:number){return b.points[a].c>.50&&b.points[c].c>.50&&ratio(b,a,c)<threshold;}
// Body-scale measurements let smaller children and different webcam distances use the same rules.
function atHead(b:Body,wrist:number){return Math.min(ratio(b,wrist,0),ratio(b,wrist,7),ratio(b,wrist,8))<.55;}
function hipHand(b:Body,wrist:number,hip:number){return near(b,wrist,hip,.63);}
function shoulderHand(b:Body,wrist:number,shoulder:number){return near(b,wrist,shoulder,.48)&&Math.abs(b.points[wrist].y-b.points[shoulder].y)<b.scale*.52;}
function bentDown(b:Body,wrist:number){return b.points[wrist].y>Math.min(b.points[23].y,b.points[24].y)+b.scale*.24;}
function restingArm(b:Body,wrist:number){return b.points[wrist].y>Math.max(b.points[11].y,b.points[12].y)+b.scale*.33;}
function kneeHand(b:Body,wrist:number,knee:number){return near(b,wrist,knee,.60)&&bentDown(b,wrist);}
// Game detection is intentionally tolerant of children, but both the target limb and the
// other limb are checked. A wrist merely passing close to a target should not clear the beat.
export function matchMove(id:MoveId,body:Body|null):boolean{
 if(!body||!body.visible)return false;
 const b=body,p=b.points,midX=(p[11].x+p[12].x)*.5,midY=(p[11].y+p[12].y)*.5;
 switch(id){
  case 'clap': {
   const centerX=(p[15].x+p[16].x)/2,centerY=(p[15].y+p[16].y)/2;
   return near(b,15,16,.35)&&Math.abs(centerX-midX)<.67*b.scale
     &&centerY>=midY-.15*b.scale&&centerY<Math.min(p[23].y,p[24].y)-.18*b.scale;
  }
  case 'cross':return shoulderHand(b,15,12)&&shoulderHand(b,16,11);
  case 'rightShoulder':return shoulderHand(b,16,11)&&restingArm(b,15)&&!near(b,15,12,.57);
  case 'leftShoulder':return shoulderHand(b,15,12)&&restingArm(b,16)&&!near(b,16,11,.57);
  case 'leftHead':return atHead(b,15)&&p[15].y<p[11].y+.10*b.scale&&hipHand(b,16,24);
  case 'rightHead':return atHead(b,16)&&p[16].y<p[12].y+.10*b.scale&&hipHand(b,15,23);
  case 'bothKnees':return kneeHand(b,15,25)&&kneeHand(b,16,26);
  case 'rightKnee':return kneeHand(b,16,25)&&hipHand(b,15,23)&&!near(b,15,26,.77);
  case 'leftKnee':return kneeHand(b,15,26)&&hipHand(b,16,24)&&!near(b,16,25,.77);
  case 'hips':return hipHand(b,15,23)&&hipHand(b,16,24)
    &&Math.abs(p[15].y-p[23].y)<.51*b.scale&&Math.abs(p[16].y-p[24].y)<.51*b.scale;
  case 'star':return p[15].y<p[11].y-.09*b.scale&&p[16].y<p[12].y-.09*b.scale
    &&ratio(b,15,16)>1.55
    &&p[15].x>p[11].x+.20*b.scale&&p[16].x<p[12].x-.20*b.scale;
  case 'rightHipLeftShoulder':return hipHand(b,16,24)&&shoulderHand(b,15,12);
  case 'leftHipRightShoulder':return hipHand(b,15,23)&&shoulderHand(b,16,11);
 }
}
// Greedy nearest-center data association. In 2/3-person modes we do not silently re-label everyone if one player disappears.
export function assignPeople(poses:Landmark[][],numberOfPlayers:number,previous:(number|null)[]):(Landmark[]|null)[]{
 const items=poses.map(p=>({p,b:toBody(p)})).filter((x):x is {p:Landmark[];b:Body}=>!!x.b);
 const result:(Landmark[]|null)[]=Array(numberOfPlayers).fill(null);
 if(!items.length)return result;
 const sorted=items.slice().sort((a,b)=>b.b.centerX-a.b.centerX); // mirrored player-left = large raw x
 if(previous.every(v=>v===null)){
   if(items.length<numberOfPlayers){ // Incomplete initial group: assign to estimated screen region instead of shifting to the left.
     for(const item of sorted){const slot=Math.min(numberOfPlayers-1,Math.floor((1-item.b.centerX)*numberOfPlayers));if(!result[slot])result[slot]=item.p;}
   }else sorted.slice(0,numberOfPlayers).forEach((item,index)=>result[index]=item.p);
   return result;
 }
 const options=items.map(item=>item.b.centerX);
 const taken=new Set<number>();
 const known=previous.map((v,i)=>({v,i})).filter((x):x is {v:number;i:number}=>x.v!==null);
 // First lock detections near historically known players; any missing player stays missing.
 const edges=known.flatMap(({v,i})=>options.map((x,k)=>({i,k,d:Math.abs(x-v)}))).sort((a,b)=>a.d-b.d);
 const assigned=new Set<number>();
 for(const e of edges){if(e.d>.23||taken.has(e.k)||assigned.has(e.i))continue;result[e.i]=items[e.k].p;taken.add(e.k);assigned.add(e.i);}
 for(let k=0;k<items.length;k++)if(!taken.has(k)){
   const slot=Math.min(numberOfPlayers-1,Math.max(0,Math.floor((1-options[k])*numberOfPlayers)));
   if(!result[slot]){result[slot]=items[k].p;taken.add(k);}
 }
 return result;
}
