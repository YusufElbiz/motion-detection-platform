import {MOVES,type MoveId} from '../game/moves';
import {ANIMATIONS,PAIRS,sampleAnimation,type FramePhase} from '../game/sprites';
import {renderKid,preloadSprites} from '../game/characters';

const phases:Record<FramePhase,string>={idle:'BAŞLANGIÇ',prepare:'HAREKETE GEÇİŞ',contact:'HEDEF POZ · TUT',return:'BAŞLANGICA DÖNÜŞ'};
export class SpriteInspector {
 private dialog:HTMLDialogElement;private selected:MoveId='clap';private paused=false;private elapsed=0;private last=0;private speed=1;private count=1;private compare=false;private guides=true;
 private canvases:HTMLCanvasElement[]=[];
 constructor(private mirror:()=>boolean,private changeMirror:(mirror:boolean)=>void){
  this.dialog=document.createElement('dialog');this.dialog.id='sprite-inspector';this.dialog.className='sprite-inspector';
  this.dialog.innerHTML=`<div class="inspector-head"><div><span class="inspector-kicker">KARAKTER VE HAREKET LABORATUVARI</span><h2>13 hareketi tek tek incele.</h2><p>Kamera açılmaz. Hareket, sağ–sol ve temas noktalarını karşılaştır.</p></div><button id="inspector-close" class="mini-btn" type="button" aria-label="Hareket önizlemesini kapat">✕ KAPAT</button></div>
   <div class="inspector-toolbar"><label>Hareket<select id="inspector-move">${Object.values(MOVES).map(m=>`<option value="${m.id}">${m.description}</option>`).join('')}</select></label><label>Gösterim yönü<select id="inspector-direction"><option value="mirror">Ayna · kameramla aynı</option><option value="front">Karşıdan · çizimin aslı</option></select></label><label>Ekran bölümü<select id="inspector-count"><option value="1">1 oyuncu · büyük</option><option value="2">2 oyuncu</option><option value="3">3 oyuncu</option></select></label><label>Hız<select id="inspector-speed"><option value="0.5">½ · yavaş</option><option value="1" selected>Normal</option><option value="1.5">1½ · hızlı</option></select></label></div>
   <div class="inspector-controls"><button id="inspector-play" class="mini-btn" type="button">Ⅱ DURAKLAT</button><button id="inspector-pair" class="mini-btn" type="button">↔ SAĞ–SOL KARŞILAŞTIR</button><label><input id="inspector-guides" type="checkbox" checked> Temas vurguları</label><strong id="inspector-phase">BAŞLANGIÇ</strong></div>
   <div id="inspector-stages" class="inspector-stages" data-count="1"></div>
   <div class="inspector-timeline"><label for="inspector-scrub">KAREYİ SEÇ</label><input id="inspector-scrub" type="range" min="0" max="1000" value="0" step="1"><span>Başlangıç → Geçiş → Hedef → Dönüş</span></div>
   <div class="inspector-phase-buttons"><button data-phase="0">Başlangıç</button><button data-phase="0.18">Geçiş</button><button data-phase="0.5">Hedef pozu tut</button><button data-phase="0.88">Dönüş</button></div>
   <div id="inspector-anatomy" class="inspector-anatomy"></div>
   <details class="inspector-atlas" open><summary>Bütün hareketlerin hedef pozları</summary><div class="inspector-thumbnails">${Object.values(MOVES).map(m=>`<button type="button" data-inspect="${m.id}"><canvas aria-label="${m.description}"></canvas><b>${m.label}</b><span>${m.description}</span></button>`).join('')}</div></details>`;
  document.body.append(this.dialog);
  this.el('inspector-close').onclick=()=>this.dialog.close();
  this.el<HTMLSelectElement>('inspector-move').onchange=e=>this.select((e.target as HTMLSelectElement).value as MoveId);
  this.el<HTMLSelectElement>('inspector-direction').onchange=e=>{this.changeMirror((e.target as HTMLSelectElement).value==='mirror');this.paintThumbnails();this.paint();};
  this.el<HTMLSelectElement>('inspector-count').onchange=e=>{this.count=Number((e.target as HTMLSelectElement).value);this.compare=false;this.rebuild();};
  this.el<HTMLSelectElement>('inspector-speed').onchange=e=>this.speed=Number((e.target as HTMLSelectElement).value);
  this.el('inspector-play').onclick=()=>{this.paused=!this.paused;this.syncPlay();};
  this.el('inspector-pair').onclick=()=>{this.compare=!this.compare;this.rebuild();};
  this.el<HTMLInputElement>('inspector-guides').onchange=e=>{this.guides=(e.target as HTMLInputElement).checked;this.paint();};
  this.el<HTMLInputElement>('inspector-scrub').oninput=e=>{this.elapsed=Number((e.target as HTMLInputElement).value)*2.4;this.paused=true;this.syncPlay();this.paint();};
  this.dialog.querySelectorAll<HTMLButtonElement>('[data-phase]').forEach(b=>b.onclick=()=>{this.elapsed=Number(b.dataset.phase)*2400;this.paused=true;this.syncPlay();this.paint();});
  this.dialog.querySelectorAll<HTMLButtonElement>('[data-inspect]').forEach(b=>b.onclick=()=>{this.select(b.dataset.inspect as MoveId);this.el('inspector-stages').scrollIntoView({block:'center',behavior:'smooth'});});
  this.rebuild();
 }
 private el<T extends HTMLElement=HTMLElement>(id:string){return this.dialog.querySelector<T>('#'+id)!;}
 private syncPlay(){this.el('inspector-play').textContent=this.paused?'▶ OYNAT':'Ⅱ DURAKLAT';}
 private select(id:MoveId){this.selected=id;this.elapsed=0;this.paused=false;this.syncPlay();this.el<HTMLSelectElement>('inspector-move').value=id;this.rebuild();}
 private ids(){return this.compare&&PAIRS[this.selected]?[this.selected,PAIRS[this.selected]!]:Array.from({length:this.count},()=>this.selected);}
 private rebuild(){
  const ids=this.ids(),stages=this.el('inspector-stages');stages.dataset.count=String(ids.length);
  stages.innerHTML=ids.map((id,i)=>`<article><small>${this.compare?'SAĞ–SOL KARŞILAŞTIRMASI':`${i+1}. OYUNCU ALANI`}</small><canvas aria-label="${MOVES[id].description}"></canvas><strong>${MOVES[id].label}</strong></article>`).join('');
  this.canvases=[...stages.querySelectorAll('canvas')];this.el<HTMLButtonElement>('inspector-pair').disabled=!PAIRS[this.selected];
  const animation=ANIMATIONS[this.selected];this.el('inspector-anatomy').textContent=`SAĞ EL: ${animation.right}   ·   SOL EL: ${animation.left}`;
  this.el('inspector-pair').classList.toggle('selected',this.compare);
  this.paint();
 }
 async open(){await preloadSprites();this.el<HTMLSelectElement>('inspector-direction').value=this.mirror()?'mirror':'front';if(!this.dialog.open)this.dialog.showModal();this.last=performance.now();this.paintThumbnails();this.paint();}
 private paintThumbnails(){this.dialog.querySelectorAll<HTMLButtonElement>('[data-inspect]').forEach((button,i)=>{const id=button.dataset.inspect as MoveId;renderKid(button.querySelector('canvas')!,0,id,0,1,{sample:sampleAnimation(id,1200,2400,false),mirror:this.mirror(),guides:false});});}
 tick(now:number){
  if(!this.dialog.open){this.last=now;return;}
  if(!this.paused)this.elapsed=(this.elapsed+Math.min(100,Math.max(0,now-this.last))*this.speed)%2400;
  this.last=now;this.paint();
 }
 private paint(){
  const sample=sampleAnimation(this.selected,this.elapsed,2400,false);
  this.el('inspector-phase').textContent=phases[sample.phase];this.el<HTMLInputElement>('inspector-scrub').value=String(Math.round(this.elapsed/2.4));
  this.ids().forEach((id,i)=>renderKid(this.canvases[i],i,id,0,1,{elapsedMs:this.elapsed,durationMs:2400,loop:false,mirror:this.mirror(),guides:this.guides}));
 }
}
