// Workshop crafts: two collected waste items become one new, paintable thing.
// Art is original inline SVG (viewBox 0 0 400 320). Each paintable part is a
// separate region; outlines and faces are drawn on top and never paintable.
export interface Recipe {
  id:string;name:string;items:[string,string];distractor:string;regions:string[];
  gather:string;crafted:string;finished:string;art:string;
}
const star=(cx:number,cy:number,outer:number,inner:number)=>`M${Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,r=i%2?inner:outer;return `${(cx+Math.cos(a)*r).toFixed(1)} ${(cy+Math.sin(a)*r).toFixed(1)}`;}).join(' L')}Z`;
const region=(index:number,d:string)=>`<path class="craft-region" data-region="${index}" d="${d}"/>`;

export const recipes:Recipe[]=[
  {
    id:'robot',name:'Robot',items:['paper-box','metal-can'],distractor:'glass-bottle',
    regions:['Kafa','Gövde','Sol kol','Sağ kol','Ayaklar'],
    gather:'Karton kutuyu ve metal içecek kutusunu bul. Onları tezgaha taşı!',
    crafted:'Vay! Bir robot yaptık! İstersen boyayabiliriz. Bir renk seç, sonra robota sür!',
    finished:'Ne güzel bir robot! Atıklar çöp değil, hazinedir!',
    art:region(4,'M146 252h36v48h-36Z M218 252h36v48h-36Z')+region(2,'M122 165q-48 8-54 58l24 5q5-30 30-38Z')+region(3,'M278 165q48 8 54 58l-24 5q-5-30-30-38Z')
      +region(1,'M120 150q0-12 12-12h136q12 0 12 12v100q0 10-12 10H132q-12 0-12-10Z')+region(0,'M152 54q0-14 14-14h68q14 0 14 14v70q0 14-14 14h-68q-14 0-14-14Z')
      +`<g class="craft-detail"><path d="M200 40V16" stroke-width="5"/><circle cx="200" cy="13" r="8" fill="#f2c94c"/><path d="M152 60h96M152 118h96" stroke-width="3" opacity=".45"/><circle cx="181" cy="84" r="13" fill="#fff"/><circle cx="219" cy="84" r="13" fill="#fff"/><circle cx="183" cy="86" r="6" fill="#3d2f27" stroke="none"/><circle cx="221" cy="86" r="6" fill="#3d2f27" stroke="none"/><path d="M184 110q16 12 32 0" stroke-width="4"/><path d="M120 176h160M200 138v38" stroke-width="3" opacity=".4"/><circle cx="178" cy="214" r="9" fill="#fff"/><circle cx="222" cy="214" r="9" fill="#fff"/><path d="M200 138v-4" stroke-width="10"/></g>`,
  },
  {
    id:'pencil-cup',name:'Kalemlik',items:['metal-food-can','paper-sheet'],distractor:'plastic-cup',
    regions:['Kâğıt sargı','Kenarlar','Kırmızı kalem','Orta kalem','Sağ kalem','Yıldız'],
    gather:'Konserve kutusunu ve kâğıdı bul. Onları tezgaha taşı!',
    crafted:'Yaşasın! Bir kalemlik yaptık! İstersen boyayabiliriz. Bir renk seç, sonra kalemliğe sür!',
    finished:'Kalemlerin artık yeni bir evi var! Harika iş çıkardın!',
    art:region(2,'M138 130V64l14-26 14 26v66Z')+region(3,'M186 130V44l14-26 14 26v86Z')+region(4,'M234 130V74l14-26 14 26v56Z')
      +region(0,'M118 150h164v118H118Z')+region(1,'M114 126h172v26H114Z M114 266h172v26H114Z')+region(5,star(200,209,34,15))
      +`<g class="craft-detail"><path d="M147 47l5-9 5 9Z M195 27l5-9 5 9Z M243 57l5-9 5 9Z" fill="#3d2f27"/><path d="M138 64h28M186 44h28M234 74h28" stroke-width="3"/><path d="M128 138h144M128 280h144" stroke-width="2" opacity=".4"/></g>`,
  },
  {
    id:'car',name:'Oyuncak araba',items:['plastic-bottle','metal-lid'],distractor:'paper-newspaper',
    regions:['Gövde','Camlar','Arka teker','Far','Ön teker'],
    gather:'Plastik şişeyi ve metal kavanoz kapağını bul. Onları tezgaha taşı!',
    crafted:'Bir oyuncak araba yaptık! İstersen boyayabiliriz. Bir renk seç, sonra arabaya sür!',
    finished:'Vınnn! Araban yola çıkmaya hazır!',
    art:region(0,'M48 236v-46q0-26 26-26h44l34-50h112l40 50h28q28 0 28 26v46Z')+region(1,'M160 158l22-34h44v34Z M240 158v-34h36l26 34Z')
      +region(3,'M350 178h18q8 0 8 8v22q0 8-8 8h-18Z')+region(2,'M120 236m-40 0a40 40 0 1 0 80 0a40 40 0 1 0-80 0')+region(4,'M294 236m-40 0a40 40 0 1 0 80 0a40 40 0 1 0-80 0')
      +`<g class="craft-detail"><circle cx="120" cy="236" r="12" fill="#fff"/><circle cx="294" cy="236" r="12" fill="#fff"/><path d="M234 168v60M70 196h30" stroke-width="3" opacity=".45"/><path d="M118 164h0" stroke-width="3"/><circle cx="214" cy="196" r="5" fill="#3d2f27" stroke="none"/></g>`,
  },
  {
    id:'lantern',name:'Kavanoz fener',items:['glass-jar','paper-bag'],distractor:'metal-tray',
    regions:['Cam','Kapak','Sap','Yıldız','Ay'],
    gather:'Cam kavanozu ve kâğıt torbayı bul. Onları tezgaha taşı!',
    crafted:'Bir kavanoz fener yaptık! İstersen boyayabiliriz. Bir renk seç, sonra fenere sür!',
    finished:'Fenerin geceyi pırıl pırıl aydınlatacak!',
    art:region(2,'M134 98q66-100 132 0l-15 6q-51-74-102 0Z')+region(0,'M146 124h108q22 16 22 46v94q0 26-26 26H150q-26 0-26-26v-94q0-30 22-46Z')+region(1,'M134 94h132q8 0 8 8v18q0 8-8 8H134q-8 0-8-8v-18q0-8 8-8Z')
      +region(3,star(228,222,36,16))+region(4,'M172 150a30 30 0 1 0 0 56a24 24 0 1 1 0-56Z')
      +`<g class="craft-detail"><path d="M150 140q-10 30-6 60" stroke="#fff" stroke-width="6" opacity=".7"/><path d="M134 106h132" stroke-width="2" opacity=".4"/></g>`,
  },
];

// Prefer crafts whose materials the child actually sorted in the first level.
export function chooseRecipes(collected:readonly string[],count=3,random:()=>number=Math.random){
  const have=new Set(collected);
  return recipes.map(recipe=>({recipe,score:recipe.items.filter(item=>have.has(item)).length*10+random()}))
    .sort((a,b)=>b.score-a.score).slice(0,Math.max(1,Math.min(recipes.length,count))).map(entry=>entry.recipe);
}
export const paintColors=[
  {id:'red',name:'Kırmızı',value:'#ef6b5b'},{id:'yellow',name:'Sarı',value:'#f6cd45'},{id:'blue',name:'Mavi',value:'#5aa8e6'},
  {id:'green',name:'Yeşil',value:'#6cc07a'},{id:'purple',name:'Mor',value:'#a682d9'},{id:'orange',name:'Turuncu',value:'#f39a45'},
];
