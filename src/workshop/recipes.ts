// Workshop crafts: two collected waste items become one new, paintable thing.
// Art is original inline SVG (viewBox 0 0 400 320). Each paintable part is a
// separate region; outlines and faces are drawn on top and never paintable.
export interface Recipe {
  id:string;name:string;items:[string,string];distractor:string;regions:string[];
  gather:string;crafted:string;finished:string;art:string;
}
const star=(cx:number,cy:number,outer:number,inner:number)=>`M${Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,r=i%2?inner:outer;return `${(cx+Math.cos(a)*r).toFixed(1)} ${(cy+Math.sin(a)*r).toFixed(1)}`;}).join(' L')}Z`;
const region=(index:number,d:string)=>`<path class="craft-region" data-region="${index}" d="${d}"/>`;

// Recognisable drawings with 5–6 meaningful parts, none tiny. Paint lands only
// on release, on the highlighted part, so neighbouring parts stay clean.
export const recipes:Recipe[]=[
  {
    id:'robot',name:'Robot',items:['paper-box','metal-can'],distractor:'glass-bottle',
    regions:['Kafa','Gövde','Kollar','Ayaklar','Göğüs ekranı','Kulaklar'],
    gather:'Karton kutuyu ve metal içecek kutusunu bul. Onları tezgaha taşı!',
    crafted:'Vay! Bir robot yaptık! İstersen boyayabiliriz.',
    finished:'Ne güzel bir robot! Atıklar çöp değil, hazinedir!',
    art:region(3,'M138 252h48v44q0 8 8 8h6v12h-70v-12h8Z M214 252h48v52h8v12h-70v-12h6q8 0 8-8Z')
      +region(2,'M118 156H84q-18 0-18 18v52q0 10 10 10h4v-6h22v6h2v-52h14Z M282 156h34q18 0 18 18v52q0 10-10 10h-4v-6h-22v6h-2v-52h-14Z')
      +region(1,'M114 146q0-14 14-14h144q14 0 14 14v96q0 14-14 14H128q-14 0-14-14Z')
      +region(5,'M118 52h18v52h-18q-8 0-8-8V60q0-8 8-8Z M282 52h-18v52h18q8 0 8-8V60q0-8-8-8Z')
      +region(0,'M136 34q0-14 14-14h100q14 0 14 14v80q0 14-14 14H150q-14 0-14-14Z')
      +region(4,'M156 166h88q8 0 8 8v40q0 8-8 8h-88q-8 0-8-8v-40q0-8 8-8Z')
      +`<g class="craft-detail"><path d="M200 20V6" stroke-width="5"/><circle cx="200" cy="5" r="9" fill="#f2c94c"/><circle cx="176" cy="66" r="15" fill="#fff"/><circle cx="224" cy="66" r="15" fill="#fff"/><circle cx="178" cy="68" r="7" fill="#3d2f27" stroke="none"/><circle cx="226" cy="68" r="7" fill="#3d2f27" stroke="none"/><path d="M178 100q22 14 44 0" stroke-width="4"/><path d="M170 186h20M170 200h40M216 186l10 10 10-10" stroke-width="4"/><circle cx="128" cy="146" r="4" fill="#5b4636"/><circle cx="272" cy="146" r="4" fill="#5b4636"/><circle cx="128" cy="244" r="4" fill="#5b4636"/><circle cx="272" cy="244" r="4" fill="#5b4636"/><path d="M190 128v4M210 128v4" stroke-width="6"/></g>`,
  },
  {
    id:'pencil-cup',name:'Kalemlik',items:['metal-food-can','paper-sheet'],distractor:'plastic-cup',
    regions:['Kâğıt sargı','Kenarlar','Sol kalem','Orta kalem','Sağ kalem','Yıldız'],
    gather:'Konserve kutusunu ve kâğıdı bul. Onları tezgaha taşı!',
    crafted:'Yaşasın! Bir kalemlik yaptık! İstersen boyayabiliriz.',
    finished:'Kalemlerin artık yeni bir evi var! Harika iş çıkardın!',
    art:region(2,'M118 132V64l22-38 22 38v68Z')+region(3,'M178 132V44l22-38 22 38v88Z')+region(4,'M238 132V74l22-38 22 38v58Z')
      +region(0,'M106 152h188v112H106Z')+region(1,'M100 126h200v28H100Z M100 262h200v30H100Z')+region(5,star(200,208,48,21))
      +`<g class="craft-detail"><path d="M131 42l9-16 9 16Z M191 22l9-16 9 16Z M251 52l9-16 9 16Z" fill="#3d2f27"/><path d="M118 64h44M178 44h44M238 74h44" stroke-width="3"/><path d="M140 70v58M200 50v78M260 80v48" stroke-width="2" opacity=".35"/><path d="M114 140h172M114 276h172" stroke-width="2" opacity=".35"/></g>`,
  },
  {
    id:'car',name:'Oyuncak araba',items:['plastic-bottle','metal-lid'],distractor:'paper-newspaper',
    regions:['Gövde','Çatı','Camlar','Tekerler','Kapı'],
    gather:'Plastik şişeyi ve metal kavanoz kapağını bul. Onları tezgaha taşı!',
    crafted:'Bir oyuncak araba yaptık! İstersen boyayabiliriz.',
    finished:'Vınnn! Araban yola çıkmaya hazır!',
    art:region(1,'M140 164l38-58h118l46 58Z')+region(0,'M30 250v-54q0-34 34-34h276q34 0 34 34v54Z')+region(2,'M168 156l24-36h48v36Z M256 156v-36h34l28 36Z')
      +region(4,'M196 172h76q6 0 6 6v58q0 6-6 6h-76q-6 0-6-6v-58q0-6 6-6Z')
      +region(3,'M118 252m-48 0a48 48 0 1 0 96 0a48 48 0 1 0-96 0 M294 252m-48 0a48 48 0 1 0 96 0a48 48 0 1 0-96 0')
      +`<g class="craft-detail"><circle cx="118" cy="252" r="15" fill="#fff"/><circle cx="294" cy="252" r="15" fill="#fff"/><circle cx="356" cy="194" r="10" fill="#f6cd45"/><path d="M30 214h22M352 222h22" stroke-width="6"/><path d="M256 200h12" stroke-width="5"/><path d="M380 186q14-4 14 6" stroke-width="3" opacity=".5"/></g>`,
  },
  {
    id:'lantern',name:'Kavanoz fener',items:['glass-jar','paper-bag'],distractor:'metal-tray',
    regions:['Cam','Kapak','Yıldız','Ay','Mum'],
    gather:'Cam kavanozu ve kâğıt torbayı bul. Onları tezgaha taşı!',
    crafted:'Bir kavanoz fener yaptık! İstersen boyayabiliriz.',
    finished:'Fenerin geceyi pırıl pırıl aydınlatacak!',
    art:region(0,'M136 128h128q26 18 26 52v96q0 30-30 30H140q-30 0-30-30v-96q0-34 26-52Z')+region(1,'M124 90h152q10 0 10 10v22q0 10-10 10H124q-10 0-10-10v-22q0-10 10-10Z')
      +region(4,'M184 236h32v50h-32Z')+region(2,star(246,186,40,17))+region(3,'M178 144a42 42 0 1 0 0 84a60 60 0 0 1 0-84Z')
      +`<g class="craft-detail"><path d="M126 94q74-100 148 0" stroke-width="8"/><path d="M200 236v-10" stroke-width="3"/><path d="M200 226q-12-14 0-30q12 16 0 30Z" fill="#f6b73c"/><path d="M148 150q-12 34-6 70" stroke="#fff" stroke-width="6" opacity=".7"/></g>`,
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
