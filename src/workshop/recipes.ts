// Workshop crafts: two collected waste items become one new, paintable thing.
// Art is original inline SVG (viewBox 0 0 400 320). Each paintable part is a
// separate region; outlines and faces are drawn on top and never paintable.
export interface Recipe {
  id:string;name:string;items:[string,string];distractor:string;regions:string[];
  gather:string;crafted:string;finished:string;art:string;
}
const star=(cx:number,cy:number,outer:number,inner:number)=>`M${Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,r=i%2?inner:outer;return `${(cx+Math.cos(a)*r).toFixed(1)} ${(cy+Math.sin(a)*r).toFixed(1)}`;}).join(' L')}Z`;
const region=(index:number,d:string)=>`<path class="craft-region" data-region="${index}" d="${d}"/>`;

// Few, large parts: each one is easy to hit with a whole hand.
export const recipes:Recipe[]=[
  {
    id:'robot',name:'Robot',items:['paper-box','metal-can'],distractor:'glass-bottle',
    regions:['Kafa','Gövde','Kollar','Ayaklar'],
    gather:'Karton kutuyu ve metal içecek kutusunu bul. Onları tezgaha taşı!',
    crafted:'Vay! Bir robot yaptık! İstersen boyayabiliriz.',
    finished:'Ne güzel bir robot! Atıklar çöp değil, hazinedir!',
    art:region(3,'M140 250h46v60h-46Z M214 250h46v60h-46Z')+region(2,'M120 156H80q-16 0-16 16v70h38v-50h18Z M280 156h40q16 0 16 16v70h-38v-50h-18Z')
      +region(1,'M116 146q0-14 14-14h140q14 0 14 14v98q0 12-14 12H130q-14 0-14-12Z')+region(0,'M138 34q0-16 16-16h92q16 0 16 16v80q0 16-16 16h-92q-16 0-16-16Z')
      +`<g class="craft-detail"><path d="M200 18V4" stroke-width="5"/><circle cx="200" cy="2" r="8" fill="#f2c94c"/><circle cx="177" cy="66" r="14" fill="#fff"/><circle cx="223" cy="66" r="14" fill="#fff"/><circle cx="179" cy="68" r="6" fill="#3d2f27" stroke="none"/><circle cx="225" cy="68" r="6" fill="#3d2f27" stroke="none"/><path d="M180 98q20 13 40 0" stroke-width="4"/><circle cx="180" cy="196" r="9" fill="#fff"/><circle cx="220" cy="196" r="9" fill="#fff"/></g>`,
  },
  {
    id:'pencil-cup',name:'Kalemlik',items:['metal-food-can','paper-sheet'],distractor:'plastic-cup',
    regions:['Kâğıt sargı','Kenarlar','Kalemler','Yıldız'],
    gather:'Konserve kutusunu ve kâğıdı bul. Onları tezgaha taşı!',
    crafted:'Yaşasın! Bir kalemlik yaptık! İstersen boyayabiliriz.',
    finished:'Kalemlerin artık yeni bir evi var! Harika iş çıkardın!',
    art:region(2,'M120 132V60l20-34 20 34v72Z M180 132V40l20-34 20 34v92Z M240 132V70l20-34 20 34v62Z')
      +region(0,'M106 152h188v112H106Z')+region(1,'M100 126h200v28H100Z M100 262h200v30H100Z')+region(3,star(200,208,46,20))
      +`<g class="craft-detail"><path d="M131 41l9-15 9 15Z M191 21l9-15 9 15Z M251 51l9-15 9 15Z" fill="#3d2f27"/><path d="M120 60h40M180 40h40M240 70h40" stroke-width="3"/></g>`,
  },
  {
    id:'car',name:'Oyuncak araba',items:['plastic-bottle','metal-lid'],distractor:'paper-newspaper',
    regions:['Gövde','Çatı','Camlar','Tekerler'],
    gather:'Plastik şişeyi ve metal kavanoz kapağını bul. Onları tezgaha taşı!',
    crafted:'Bir oyuncak araba yaptık! İstersen boyayabiliriz.',
    finished:'Vınnn! Araban yola çıkmaya hazır!',
    art:region(1,'M146 164l36-56h112l44 56Z')+region(0,'M36 254v-58q0-34 34-34h264q34 0 34 34v58Z')+region(2,'M174 154l22-34h46v34Z M256 154v-34h32l24 34Z')
      +region(3,'M120 254m-46 0a46 46 0 1 0 92 0a46 46 0 1 0-92 0 M290 254m-46 0a46 46 0 1 0 92 0a46 46 0 1 0-92 0')
      +`<g class="craft-detail"><circle cx="120" cy="254" r="13" fill="#fff"/><circle cx="290" cy="254" r="13" fill="#fff"/><circle cx="352" cy="194" r="9" fill="#f6cd45"/><path d="M248 172v70" stroke-width="3" opacity=".45"/></g>`,
  },
  {
    id:'lantern',name:'Kavanoz fener',items:['glass-jar','paper-bag'],distractor:'metal-tray',
    regions:['Cam','Kapak','Yıldız','Ay'],
    gather:'Cam kavanozu ve kâğıt torbayı bul. Onları tezgaha taşı!',
    crafted:'Bir kavanoz fener yaptık! İstersen boyayabiliriz.',
    finished:'Fenerin geceyi pırıl pırıl aydınlatacak!',
    art:region(0,'M136 128h128q26 18 26 52v96q0 30-30 30H140q-30 0-30-30v-96q0-34 26-52Z')+region(1,'M124 90h152q10 0 10 10v22q0 10-10 10H124q-10 0-10-10v-22q0-10 10-10Z')
      +region(2,star(240,240,46,20))+region(3,'M184 148a38 38 0 1 0 0 76a30 30 0 1 1 0-76Z')
      +`<g class="craft-detail"><path d="M126 94q74-100 148 0" stroke-width="8"/><path d="M148 146q-12 34-6 70" stroke="#fff" stroke-width="6" opacity=".7"/></g>`,
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
