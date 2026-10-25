import './style.css';
import {LabSession} from './session.ts';
import {labDefaults} from './tracks.ts';
import {project,videoTransform} from './mapping.ts';
import type {GestureState} from './gesture.ts';
import type {Point} from '../tracking/types.ts';

const labels:Record<GestureState,string>={OPEN:'AÇIK',CLOSED:'KAPALI',UNKNOWN:'BİLİNMİYOR',CLOSING:'KAPANIYOR',OPENING:'AÇILIYOR'};
const q=<T extends HTMLElement>(selector:string)=>document.querySelector<T>(selector)!;
document.title='İki El Hareket Laboratuvarı • Eko Kahramanlar';
q('#app').innerHTML=`
<main class="lab">
  <header><a href="/">← Oyuna dön</a><span class="checkpoint">KONTROL NOKTASI A</span><span>Yerel işleme · Kayıt yok</span></header>
  <div class="intro"><div><p class="eyebrow">ÖNCE GÖRELİM, SONRA OYNAYALIM</p><h1>İki el hareket laboratuvarı</h1><p>Avuçlarını aç, yumruklarını kapat. Her elin konumunu ve hareketini ayrı ayrı incele.</p></div><span class="lab-mark" aria-hidden="true">✋</span></div>
  <div class="lab-grid"><section class="viewer" aria-label="Canlı el takibi">
    <div class="viewer-top"><span id="camera-light">● Kamera kapalı</span><span>Aynalı görüntü</span></div>
    <div class="preview"><video playsinline muted aria-label="Aynalı canlı kamera görüntüsü"></video><canvas aria-label="El iskeleti ve avuç işaretçileri"></canvas><div id="empty">Kamerayı başlatın.<small>Görüntü yalnızca bu cihazda işlenir.</small></div></div>
    <div class="legend"><span>✚ Ham avuç merkezi</span><span>◎ Filtrelenmiş avuç merkezi</span><span>● 21 eklem / el</span></div>
    <p id="status" role="status" aria-live="polite">Kamera kapalı. Başlatmak için düğmeye basın.</p>
    <p id="uncertainty" role="status"></p>
    <div class="actions"><button id="lab-start" class="primary">Kamerayı başlat</button><button id="lab-stop" disabled>Kamerayı durdur</button></div>
  </section>
  <aside class="settings"><h2>İnce ayarlar</h2><p>Kamera ve işlemci değişiklikleri için durdurup yeniden başlatın.</p>
    <label>Model hareket eşiği <output id="threshold-value"></output><input id="threshold" type="range" min="0.3" max="0.95" step="0.01" value="0.6"></label>
    <label>Açık el onayı (ms)<input id="open-ms" type="number" min="0" max="200" step="10" value="60"></label>
    <label>Kapalı el onayı (ms)<input id="closed-ms" type="number" min="0" max="200" step="10" value="60"></label>
    <label class="toggle"><input id="smoothing" type="checkbox" checked> Konum yumuşatmayı etkinleştir</label>
    <label>Yumuşatma gücü <output id="strength-value"></output><input id="strength" type="range" min="0.5" max="4" step="0.1" value="2"></label>
    <label>Kamera çözünürlüğü<select id="resolution"><option value="640">640 × 480 (istenen)</option><option value="1280">1280 × 960 (istenen)</option><option value="320">320 × 240 (istenen)</option></select></label>
    <label>Hedef çıkarım sıklığı (kare/sn)<input id="frequency" type="number" min="5" max="30" step="1" value="30"></label>
    <label>Çıkarım işlemcisi<select id="delegate"><option value="CPU">CPU</option><option value="GPU">GPU (desteklenirse)</option></select></label>
    <button id="defaults">Varsayılanlara dön</button>
  </aside></div>
  <section class="track-section"><div class="section-heading"><h2>Bağımsız el izleri</h2><span>Kimlikler anatomik sağ / sol anlamına gelmez.</span></div><div id="tracks" class="tracks"><p>Henüz el algılanmadı.</p></div></section>
  <section class="measurements"><h2>Canlı ölçümler</h2><p>Son 3 saniye · Atlanan kareler kuyruğa alınmaz · Fiziksel hareketten kameraya gecikme ölçülmez.</p><div id="metrics" class="metrics"></div><p id="model"></p></section>
  <details><summary>Sonuçları nasıl yorumlamalıyım?</summary><p>Yeşil veya mavi iskelet modelin gerçek eklem çıktısıdır. Artı ham avuç merkezini, halka One Euro filtresinin sonucunu gösterir. İskelete ikinci bir filtre uygulanmaz. Güven puanı hareket sınıflandırmasına aittir; elin varlığına veya kimliğine ait değildir.</p><p>Eller üst üste geldiğinde kimlik belirsizliği gösterilir. Ayrıldıktan sonra yeni kimlikler verilebilir; eski hareket durumu yeni ele aktarılmaz. Kayıp ellerin eski iskeleti ekranda tutulmaz.</p><p>Kontrol: Her eli 10 saniye açık, 10 saniye kapalı tutun. On kez açıp kapatın. İki elinizle bağımsız hareketler yapın, çaprazlayın, birini saklayıp geri getirin. Yumuşatmayı açıp kapatarak karşılaştırın. Sayfadan ayrılınca kamera ışığının söndüğünü doğrulayın.</p></details>
  <footer>Bu laboratuvar gerçek kamera kabul testi içindir. Yakalama, bırakma ve oyun bağlantısı bu aşamada eklenmemiştir.</footer>
</main>`;
const video=q<HTMLVideoElement>('video'),canvas=q<HTMLCanvasElement>('canvas');
const session=new LabSession(video);
const number=(id:string,min:number,max:number,fallback:number)=>{const input=q<HTMLInputElement>(id);const parsed=Number(input.value);const value=Math.max(min,Math.min(max,Number.isFinite(parsed)?parsed:fallback));input.value=String(value);return value;};
function configure(){
  session.tracks.settings={threshold:number('#threshold',.3,.95,.6),openMs:number('#open-ms',0,200,60),closedMs:number('#closed-ms',0,200,60),smoothing:q<HTMLInputElement>('#smoothing').checked,strength:number('#strength',.5,4,2)};
  session.frequency=number('#frequency',5,30,30);session.width=Number(q<HTMLSelectElement>('#resolution').value);session.requestedDelegate=q<HTMLSelectElement>('#delegate').value as 'CPU'|'GPU';
  q('#threshold-value').textContent=session.tracks.settings.threshold.toFixed(2);q('#strength-value').textContent=session.tracks.settings.strength.toFixed(1);
}
q('.settings').addEventListener('input',configure);
q('#defaults').addEventListener('click',()=>{
  q<HTMLInputElement>('#threshold').value=String(labDefaults.threshold);q<HTMLInputElement>('#open-ms').value='60';q<HTMLInputElement>('#closed-ms').value='60';q<HTMLInputElement>('#strength').value='2';q<HTMLInputElement>('#smoothing').checked=true;
  q<HTMLSelectElement>('#resolution').value='640';q<HTMLSelectElement>('#delegate').value='CPU';q<HTMLInputElement>('#frequency').value='30';configure();
});
session.onStatus=message=>{q('#status').textContent=message;syncButtons();};
function syncButtons(){
  q<HTMLButtonElement>('#lab-start').disabled=session.active||session.loading;
  q<HTMLButtonElement>('#lab-stop').disabled=!session.active&&!session.loading;
  q<HTMLSelectElement>('#resolution').disabled=session.active||session.loading;q<HTMLSelectElement>('#delegate').disabled=session.active||session.loading;
  q('#camera-light').textContent=session.active?'● Kamera açık':session.loading?'● Hazırlanıyor':'● Kamera kapalı';
  q('#empty').hidden=session.active;
}
q('#lab-start').addEventListener('click',()=>{configure();void session.start();});
q('#lab-stop').addEventListener('click',()=>session.stop());
const stop=()=>session.stop();
window.addEventListener('pagehide',stop);window.addEventListener('beforeunload',stop);
const visibility=()=>{if(document.hidden)session.stop();};
document.addEventListener('visibilitychange',visibility);
const connections=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];
const colors=['#72f0bb','#89bfff'];
function draw(now:number){
  const rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
  const w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  const ctx=canvas.getContext('2d')!;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);
  if(!video.videoWidth||!video.videoHeight||!session.active)return;
  const transform=videoTransform(video.videoWidth,video.videoHeight,rect.width,rect.height);
  const mapped=(p:Point)=>project(p,transform);
  function skeleton(points:Point[],color:string){
    const p=points.map(mapped);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=2;
    ctx.beginPath();for(const [a,b] of connections){ctx.moveTo(p[a].x,p[a].y);ctx.lineTo(p[b].x,p[b].y);}ctx.stroke();
    for(const point of p){ctx.beginPath();ctx.arc(point.x,point.y,3,0,Math.PI*2);ctx.fill();}
  }
  if(session.tracks.uncertain&&session.lastSample!==undefined&&now-session.lastSample<180)for(const d of session.raw)skeleton(d.landmarks,'#ffc56e');
  for(const track of session.tracks.tracks){
    if(track.status!=='visible'||!track.detection)continue;
    const color=colors[(track.id-1)%2];skeleton(track.detection.landmarks,color);
    const raw=mapped(track.raw),filtered=mapped(track.position);ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(raw.x-7,raw.y);ctx.lineTo(raw.x+7,raw.y);ctx.moveTo(raw.x,raw.y-7);ctx.lineTo(raw.x,raw.y+7);ctx.stroke();
    ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(filtered.x,filtered.y,13,0,Math.PI*2);ctx.stroke();
    ctx.font='bold 14px system-ui';ctx.fillStyle=color;ctx.fillText(`İz ${track.id} · ${labels[track.gesture.state]}`,filtered.x+18,filtered.y-12);
  }
}
const fixed=(value:number)=>value.toFixed(1);
function updateTrackCards(html:string){
  const container=q('#tracks'),template=document.createElement('template');template.innerHTML=html;
  const incoming=Array.from(template.content.querySelectorAll<HTMLElement>('[data-track-id]'));
  if(!incoming.length){if(container.innerHTML!==html)container.innerHTML=html;return;}
  container.querySelectorAll(':scope > p').forEach(node=>node.remove());
  const ids=new Set(incoming.map(card=>card.dataset.trackId));
  container.querySelectorAll<HTMLElement>('[data-track-id]').forEach(card=>{if(!ids.has(card.dataset.trackId))card.remove();});
  for(const next of incoming){
    const existing=container.querySelector<HTMLElement>(`[data-track-id="${next.dataset.trackId}"]`);
    if(!existing){container.append(next);continue;}
    // Keep the actual summary/focus/pointer nodes mounted while measurements
    // refresh. Rebuilding innerHTML can swallow a click between down and up.
    for(const selector of ['.track-title span','.pose','dl','.history','.conflict']){
      const before=existing.querySelector(selector),after=next.querySelector(selector);
      if(before&&after){if(before.innerHTML!==after.innerHTML)before.innerHTML=after.innerHTML;}
      else if(before)before.remove();else if(after)existing.insertBefore(after,existing.querySelector('.history'));
    }
    const before=existing.querySelector('details'),after=next.querySelector('details');
    if(before&&after){
      before.querySelector('summary')!.textContent=after.querySelector('summary')!.textContent;
      const oldRows=before.querySelectorAll('p'),newRows=after.querySelectorAll('p');
      newRows.forEach((row,index)=>{if(oldRows[index])oldRows[index].textContent=row.textContent;else before.append(row);});
    }else if(before)before.remove();else if(after)existing.insertBefore(after,existing.querySelector('.history'));
  }
}
function diagnostics(now:number){
  const expanded=new Set(Array.from(q('#tracks').querySelectorAll<HTMLElement>('[data-track-id]')).filter(card=>card.querySelector('details[open]')).map(card=>card.dataset.trackId));
  const warning=session.tracks.uncertain?'Kimlik belirsiz: eller örtüşüyor veya eşleştirme güvenilir değil.':session.tracks.identityResets?`Örtüşme sonrası ${session.tracks.identityResets} kez yeni kimlik verildi; önceki hareketler aktarılmadı.`:'';
  q('#uncertainty').textContent=warning;
  const cards=session.tracks.tracks.map(track=>{
    const d=track.detection,g=d?.modelGesture;
    const evidence=d?track.evidence:undefined;
    const source=evidence?.source==='geometry'?'Parmak geometrisi':evidence?.source==='agreement'?'Model + parmak geometrisi':evidence?.source==='model'?'Resmi model':'Yeterli kanıt yok';
    const geometry=evidence?.geometry;
    const fingerStates={extended:'uzanmış',curled:'bükülü',uncertain:'ara konum'};
    const geometryDetails=geometry?.valid?`<details class="finger-details" ${expanded.has(String(track.id))?'open':''}><summary>Parmak ölçümleri · ${geometry.space==='world'?'3B dünya koordinatları':'görüntü oranı düzeltilmiş 3B'}</summary>${geometry.fingers.map(f=>`<p>${f.name}: ${fingerStates[f.state]} · Eklem açıları ${Math.round(f.pip)}° / ${Math.round(f.dip)}° · Uzanım ${fixed(f.outward)}</p>`).join('')}</details>`:'';
    const modelLabel=g?.label==='Open_Palm'?'Açık avuç':g?.label==='Closed_Fist'?'Kapalı yumruk':g?.label==='None'?'Tanımlanmadı':g?'Diğer hareket':'—';
    const handed=d?(d.handedness==='Left'?'Sol':d.handedness==='Right'?'Sağ':'Bilinmiyor'):'—';
    const status=track.status==='visible'?'İzleniyor':track.status==='uncertain'?'Kimlik belirsiz':'Geçici olarak kayıp';
    return `<article class="track" data-track-id="${track.id}" style="--track:${colors[(track.id-1)%2]}"><div class="track-title"><h3>İz ${track.id}</h3><span>${status}</span></div><strong class="pose">${labels[track.gesture.state]}</strong><dl><dt>Karar kaynağı</dt><dd>${source}</dd><dt>Parmaklar (uzanmış / bükülü)</dt><dd>${geometry?.valid?`${geometry.extended} / ${geometry.curled}`:'—'}</dd><dt>Ham model hareketi</dt><dd>${modelLabel}</dd><dt>Ham model güveni</dt><dd>${g?`%${fixed(g.score*100)}`:'—'}</dd><dt>Model el etiketi (yardımcı)</dt><dd>${handed}</dd><dt>Ham konum (x, y)</dt><dd>${track.status==='visible'?`${fixed((1-track.raw.x)*100)}, ${fixed(track.raw.y*100)} %`:'—'}</dd><dt>Filtreli konum (x, y)</dt><dd>${track.status==='visible'?`${fixed((1-track.position.x)*100)}, ${fixed(track.position.y*100)} %`:'—'}</dd><dt>Son görülmeden beri</dt><dd>${fixed(now-track.lastSeen)} ms</dd><dt>Son onay süresi</dt><dd>${fixed(track.gesture.confirmationMs)} ms</dd></dl>${evidence?.conflict?'<p class="conflict">Model ve parmak geometrisi farklı sonuç veriyor.</p>':''}${geometryDetails}<div class="history" aria-label="Son hareket geçişleri">${track.history.map(event=>`<span title="Oturum içi zaman: ${fixed(event.time)} ms">${labels[event.state]}</span>`).join(' → ')}</div></article>`;
  }).join('')||'<p>Henüz el algılanmadı. İki el algılanması kameranın elleri görebilmesine bağlıdır.</p>';
  updateTrackCards(cards);
  const metrics=session.metrics(now);
  const cells=[['Kamera kare/sn',fixed(metrics.cameraFps)],['Çıkarım kare/sn',fixed(metrics.inferenceFps)],['Ortalama çıkarım',`${fixed(metrics.averageMs)} ms`],['P95 çıkarım',`${fixed(metrics.p95Ms)} ms`],['Eklem verisi yaşı',metrics.landmarkAgeMs===null?'—':`${fixed(metrics.landmarkAgeMs)} ms`],['Sonuç yaşı (ort.)',`${fixed(metrics.resultAgeMs)} ms`],['Aktarım + çıkarım',`${fixed(metrics.roundTripMs)} ms`],['Kare hazırlama',`${fixed(metrics.bitmapMs)} ms`],['Meşgulken atlanan',String(metrics.skippedBusy)],['Hız sınırında atlanan',String(metrics.skippedRate)],['Eski sonuç / atlanan kamera karesi',`${metrics.staleResults} / ${metrics.missedCameraFrames}`],['Ölçüm sayısı',String(metrics.sampleCount)]];
  q('#metrics').innerHTML=cells.map(([label,value])=>`<div><span>${label}</span><b>${value}</b></div>`).join('');
  q('#model').textContent=`Yerel Gesture Recognizer float16/1 · Tasks Vision 1.1.1 · En fazla 2 el · VIDEO · Algılama / varlık / takip eşikleri: 0,5 · ${session.active?`Etkin: ${session.delegate}`:`Seçilen: ${session.requestedDelegate}`} · Hedef: ${session.frequency} kare/sn · Gerçek kamera: ${video.videoWidth} × ${video.videoHeight} · One Euro: ${session.tracks.settings.smoothing?'açık':'kapalı'}, alt kesim ${fixed(3/session.tracks.settings.strength)} Hz, hız katsayısı 12`;
}
let lastUI=-Infinity,raf=0;
function render(now:number){session.tick(now);draw(now);if(now-lastUI>120){diagnostics(now);syncButtons();lastUI=now;}raf=requestAnimationFrame(render);}
configure();raf=requestAnimationFrame(render);
if(import.meta.hot)import.meta.hot.dispose(()=>{cancelAnimationFrame(raf);session.stop();window.removeEventListener('pagehide',stop);window.removeEventListener('beforeunload',stop);document.removeEventListener('visibilitychange',visibility);});
