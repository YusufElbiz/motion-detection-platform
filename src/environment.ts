const litterPositions=[[70,510],[150,487],[228,457],[343,430],[490,459],[605,415],[776,447],[911,426],[1046,459],[1167,489],[1210,531],[72,588],[139,645],[247,510],[1098,540],[1174,622],[83,682],[1194,681],[513,500],[863,499]];
const litterShapes=[
 '<g transform="rotate(-22)"><path d="M-17-10h27l8 9-6 18-30-5Z" fill="#d2cfb7" stroke="#8b8d7d" stroke-width="2"/><path d="m-10-4 13 4-5 9m-9-5 19 5" fill="none" stroke="#a4a393" stroke-width="2"/></g>',
 '<g transform="rotate(56)"><path d="M-5-19h10v9l6 7v22H-11V-3l6-7Z" fill="#8eaeb2" stroke="#667f7a" stroke-width="2"/><path d="M-6-20H6v5H-6M-10 3h20v9H-10" fill="#c8c5a1"/></g>',
 '<g transform="rotate(-28)"><rect x="-12" y="-15" width="24" height="31" rx="4" fill="#929da0" stroke="#687573" stroke-width="2"/><ellipse cy="-14" rx="12" ry="4" fill="#c5cdca"/><path d="M-10-2h20v12h-20" fill="#bf957b"/></g>',
 '<path d="M-19-2-8-14 1-8 13-12 20 3 11 17-4 12-17 16Z" fill="#b6b8a6" stroke="#858b7b" stroke-width="2"/><path d="m-5-8 4 10-6 10M1 2l13 4" stroke="#d4d3be" stroke-width="2" fill="none"/>',
];
const flowers=[[85,550],[174,588],[240,490],[386,476],[554,489],[702,465],[827,490],[973,475],[1092,573],[1200,580],[146,675],[1150,674]];
export const landscape=`<svg class="landscape environment-scene" viewBox="0 0 1280 720" preserveAspectRatio="none" aria-hidden="true">
<defs><linearGradient id="nature-sky" x2="0" y2="1"><stop stop-color="var(--nature-sky-top,#a5b0aa)"/><stop offset="1" stop-color="var(--nature-sky-bottom,#c7c4ab)"/></linearGradient></defs>
<path fill="url(#nature-sky)" d="M0 0h1280v720H0Z"/>
<g class="nature-clouds" fill="#fff" opacity=".6"><path d="M74 157q-20-30 10-40 10-40 48-20 30-20 45 14 40-1 38 27H74Z"/><path d="M905 149q-20-30 12-35 12-35 43-19 30-15 42 16 40-2 38 28H905Z"/></g>
<g class="nature-sun"><circle cx="1100" cy="150" r="43" fill="#ffe29a"/><path d="M1100 89V76m0 148v-13m61-61h15m-151 0h-13m44-44-10-10m108 108-10-10m0-88 10-10" fill="none" stroke="#f4cc78" stroke-width="5" stroke-linecap="round"/></g>
<path fill="var(--nature-hill-back,#969b82)" d="M0 390Q210 245 449 404Q740 250 1000 392Q1150 315 1280 370V720H0Z"/>
<path fill="var(--nature-hill-front,#969778)" d="M0 465Q280 329 615 458Q930 327 1280 440V720H0Z"/>
<path fill="var(--nature-grass,#b3a77f)" d="M0 510Q330 432 655 505Q1010 435 1280 510V720H0Z"/>
<path fill="var(--nature-path,#a99a78)" d="M325 720Q425 560 705 514Q630 591 683 720Z"/>
<g stroke="#89785a" stroke-width="14" stroke-linecap="round"><path d="M69 394v120m1154-120v120"/></g>
<g fill="var(--nature-leaves,#898f73)"><ellipse cx="69" cy="373" rx="65" ry="105"/><ellipse cx="1223" cy="379" rx="71" ry="105"/></g>
<g class="environment-grime"><g fill="#807c6745"><ellipse cx="160" cy="530" rx="70" ry="13"/><ellipse cx="1100" cy="590" rx="86" ry="17"/><ellipse cx="634" cy="480" rx="95" ry="11"/><ellipse cx="124" cy="675" rx="55" ry="9"/></g><g fill="none" stroke="#968763" stroke-width="2" opacity=".6"><path d="m140 565 13 8-8 13m8-13 19-4M1080 646l17 7-3 15m3-15 18-10M423 500l15 3 8 9"/></g><g fill="#7e898743"><path d="M0 180Q180 130 350 193T700 182T1020 178T1280 170V221Q1010 190 812 224T340 225T0 232Z"/><path d="M0 286Q290 229 550 286T1000 270T1280 288v34H0Z"/></g></g>
<g class="environment-litter">${litterPositions.map(([x,y],i)=>`<g class="scenery-litter" data-order="${i}" transform="translate(${x} ${y})"><ellipse cy="19" rx="23" ry="4" fill="#5d65542b"/>${litterShapes[i%litterShapes.length]}</g>`).join('')}</g>
<g class="environment-flowers">${flowers.map(([x,y],i)=>`<g class="scenery-flower" data-order="${i}" transform="translate(${x} ${y})"><path d="M0 0v18m0-6q-13-12-12-2 3 7 12 6m0-8q12-10 12-2-3 6-12 6" stroke="#559260" stroke-width="2" fill="#7eb96a"/><g fill="${i%2?'#fff4e0':'#efc7ba'}"><ellipse cy="-6" rx="4" ry="6"/><ellipse cx="6" rx="6" ry="4"/><ellipse cy="6" rx="4" ry="6"/><ellipse cx="-6" rx="6" ry="4"/></g><circle r="3.5" fill="#efc64c"/></g>`).join('')}</g>
<g class="nature-wildlife"><g class="nature-bird" fill="none" stroke="#608a77" stroke-width="3" stroke-linecap="round"><path d="M349 196q10-12 20 0 10-12 20 0M425 164q8-10 16 0 8-10 16 0"/></g><g transform="translate(1035 407)"><g class="nature-butterfly"><path d="M0 0q-28-30-27-7 1 17 27 11-22 16-10 20 13 0 12-20 2 22 15 17 10-5-12-17 27 3 26-14-4-20-29 10" fill="#f0c16e"/><path d="M0-2v13" stroke="#807555" stroke-width="3" stroke-linecap="round"/></g></g></g>
</svg>`;

const mix=(a:string,b:string,t:number)=>'#'+[0,2,4].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
export class EnvironmentProgress {
 private previous='';
 private litter:SVGElement[];
 private flowers:SVGElement[];
 private game:HTMLElement;
 constructor(game:HTMLElement){
  this.game=game;
  this.litter=Array.from(game.querySelectorAll<SVGElement>('.scenery-litter'));
  this.flowers=Array.from(game.querySelectorAll<SVGElement>('.scenery-flower'));
 }
 update(score:number,goal:number){
  const progress=Math.max(0,Math.min(1,score/Math.max(1,goal))),key=`${score}/${goal}`;
  if(key===this.previous)return;this.previous=key;
  this.game.dataset.natureProgress=progress.toFixed(3);
  this.game.dataset.natureStage=progress===1?'restored':progress===0?'polluted':'recovering';
  const palette:Record<string,[string,string]>={
   'sky-top':['a5b0aa','c8eef0'],'sky-bottom':['c7c4ab','f5f8d9'],
   'hill-back':['969b82','b7dca7'],'hill-front':['969778','8dc394'],
   grass:['b3a77f','d8e8aa'],path:['a99a78','eee4b6'],leaves:['898f73','519b73'],
  };
  for(const [name,[dirty,clean]] of Object.entries(palette))this.game.style.setProperty(`--nature-${name}`,mix(dirty,clean,progress));
  this.game.style.setProperty('--nature-grime',String(1-progress));
  this.game.style.setProperty('--nature-sun',String(.35+.65*progress));
  this.game.style.setProperty('--nature-wildlife',String(Math.max(0,(progress-.6)/.4)));
  this.litter.forEach((node,i)=>node.style.opacity=String(Math.max(0,Math.min(1,(1-progress)*this.litter.length-i))));
  this.flowers.forEach((node,i)=>node.style.opacity=String(Math.max(0,Math.min(1,progress*this.flowers.length-i))));
  const status=this.game.querySelector<HTMLElement>('#nature-status');
  if(status)status.textContent=progress===1?'Tertemiz bir doğa!':progress===0?'Bahçemizi birlikte temizleyelim!':progress<.5?'Çöpler azalıyor, doğa canlanıyor!':'Bahçemiz yeşeriyor!';
 }
}
