import './diagnostics.css';
import {CameraManager, cameraError} from './camera.ts';
import {HandTrackingService} from './service.ts';
import {TrackingProcessor} from './processor.ts';
import {CalibrationManager} from './calibration.ts';
import {TrackingMetrics} from './metrics.ts';
import {FrameGate} from './frameGate.ts';
import {mapPoint, mirrorPoint} from './coordinates.ts';
import {trackingConfig} from './config.ts';
import type {TrackedHand, TrackingFrame} from './types.ts';

const connections=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];
const colors=['#50f0cd','#ffc16b'];
const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const pair=(point:{x:number;y:number})=>`${point.x.toFixed(3)}, ${point.y.toFixed(3)}`;

export function mountTrackingDiagnostics(openButton:HTMLButtonElement, main:HTMLElement, pauseGame:()=>void) {
  const screen=document.createElement('section');screen.className='tracking-screen';screen.hidden=true;
  screen.setAttribute('aria-labelledby','tracking-title');
  screen.innerHTML=`<div class="tracking-heading"><div><span class="tracking-eyebrow">YETİŞKİN / ÖĞRETMEN ALANI · 2. AŞAMA</span><h1 id="tracking-title">El Takip Testi <span>✋</span></h1><p>Küçük hareketleri keşfedelim. Görüntü yalnızca bu cihazda işlenir.</p></div><button id="tracking-back" class="secondary">← Oyuna Dön</button></div>
  <div class="tracking-layout"><div class="tracking-left"><div class="camera-card"><div class="camera-caption"><span><i id="camera-light"></i> <span id="camera-status">Kamera kapalı</span></span><span id="camera-resolution">Görüntü bekleniyor</span></div>
  <div class="camera-stage"><video id="tracking-video" playsinline muted aria-label="Canlı kamera görüntüsü"></video><canvas id="tracking-overlay" aria-label="El noktaları ve bağlantıları"></canvas><div id="camera-placeholder"><span>✋</span><h2>Merhaba, minik eller!</h2><p>Kamerayı başlatın, sonra elinizi kaldırın.</p><small>Görüntü kaydedilmez veya gönderilmez.</small></div><div class="preview-badge">● Yerel işlem</div></div>
  <div class="landmark-legend"><span><i class="raw-dot"></i> Ham işaret ucu</span><span><i class="smooth-dot"></i> Yumuşatılmış uç</span><span>◇ Avuç merkezi</span><span>□ Bilek · ◉ Başparmak</span></div></div>
  <div class="tracking-metrics"><div><span>Algılanan el</span><b id="hand-count">0 <small>/ 2</small></b></div><div><span>Kamera FPS</span><b id="camera-fps">—</b></div><div><span>Çıkarım FPS</span><b id="inference-fps">—</b></div><div><span>Ort. işlem süresi</span><b id="inference-latency">—</b></div></div>
  <div class="tracking-status-box"><p id="tracking-status" role="status" aria-live="polite">Hazır olduğunuzda kamerayı başlatın.</p><small id="tracking-engine">Model yerel dosyalardan açılacak · En çok iki el</small></div>
  <div id="hand-details" class="hand-details"><p>Elinizi gösterdiğinizde bilek ve parmak konumları burada görünecek.</p></div>
  <p class="tracking-caveat">Sağ/sol, modelin bildirdiği etikettir; kalıcı kimlik değildir. Yüzde değeri yalnızca bu etiketin skorudur. El varlığı ve takip güveni sonuçta ayrı ölçüm olarak sunulmaz.</p></div>
  <aside class="tracking-sidebar"><div class="tracking-panel"><h2>Kamera ve takip</h2><label>Kamera<select id="camera-device"><option value="">Otomatik kamera</option></select></label><div class="setting-pair"><label>Kamera boyutu<select id="camera-size"><option value="640">640 × 480</option><option value="960">960 × 720</option><option value="1280">1280 × 960</option></select></label><label>İşleme genişliği<select id="inference-size"><option value="320">320 piksel</option><option value="480">480 piksel</option><option value="640" selected>640 piksel</option></select></label></div><div class="setting-pair"><label>Çıkarım sınırı<select id="inference-rate"><option value="15">15 FPS</option><option value="24" selected>24 FPS</option><option value="30">30 FPS</option></select></label><label>İşlemci<select id="tracking-delegate"><option value="CPU">CPU · önerilen</option><option value="GPU">GPU · deneysel</option></select></label></div>
  <div class="tracking-actions"><button id="camera-start" class="tracking-primary">Kamerayı Başlat</button><button id="camera-stop" class="secondary" disabled>Durdur</button></div><small>Kamera/boyut/işlemci değişikliği için durdurup yeniden başlatın. Kamera hedefi 30 FPS; gerçek değerler solda.</small></div>
  <div class="tracking-panel"><h2>Görüntü ve yumuşatma</h2><label class="toggle-row"><span>Ayna görüntüsü</span><input id="tracking-mirror" type="checkbox" checked></label><label class="toggle-row"><span>Hareketi yumuşat</span><input id="tracking-smoothing" type="checkbox" checked></label><label>Yumuşatma süresi <output id="smoothing-value">65 ms</output><input id="smoothing-time" type="range" min="20" max="160" step="5" value="65"></label><p class="setting-help">Düşük değer daha hızlı tepki, yüksek değer daha sakin hareket sağlar. İçi boş halka ile dolu noktayı karşılaştırın.</p></div>
  <div class="tracking-panel calibration-panel"><span class="tracking-eyebrow">BİRLİKTE HAZIRLANALIM</span><h2>Oyun alanını tanı</h2><p id="calibration-guide">Kameranın karşısında rahatça durun. Elinizin ulaşabildiği alanı birlikte keşfedelim.</p><progress id="calibration-progress" max="1" value="0" aria-label="Kalibrasyon adımı ilerlemesi"></progress><div class="calibration-steps"><span data-step="one">① Tek el</span><span data-step="two">② İki el</span><span data-step="reach">③ Her yöne</span></div><div class="tracking-actions"><button id="calibration-start" class="secondary" disabled>Alanı Tanı</button><button id="calibration-finish" class="secondary" disabled>Alanı Kullan</button></div><button id="calibration-reset" class="text-button">Alanı Sıfırla</button><small>Bu bir erişim denemesidir; boy, mesafe veya fiziksel uzunluk ölçümü değildir. Alan verisi yalnızca bu oturumda tutulur.</small></div></aside></div>`;
  document.querySelector('#app')!.append(screen);
  const get=<T extends HTMLElement=HTMLElement>(id:string)=>screen.querySelector<T>(`#${id}`)!;
  const video=get<HTMLVideoElement>('tracking-video');const canvas=get<HTMLCanvasElement>('tracking-overlay');
  const supportsVideoFrames=typeof video.requestVideoFrameCallback==='function';
  const context=canvas.getContext('2d')!;
  const camera=new CameraManager(video); const service=new HandTrackingService();
  const processor=new TrackingProcessor();const calibration=new CalibrationManager();const metrics=new TrackingMetrics();const frameGate=new FrameGate();
  let generation=0,active=false,loading=false,raf=0,videoCallback=0;
  let lastVideoTime=-1,lastCameraTime=0,busy=false,lastUi=0;
  let mirrored=true;let latest:TrackingFrame={timestamp:0,hands:[],ambiguous:false};
  let currentStage='idle';let lastDetails='';let expired=false;
  const setStatus=(message:string,error=false)=>{get('tracking-status').textContent=message;get('tracking-status').classList.toggle('tracking-error',error);};
  const select=(id:string)=>get<HTMLSelectElement>(id);
  function updateButtons(){
    get<HTMLButtonElement>('camera-start').disabled=active||loading;
    get<HTMLButtonElement>('camera-stop').disabled=!active&&!loading;
    for(const id of ['camera-device','camera-size','tracking-delegate'])select(id).disabled=active||loading;
    get<HTMLButtonElement>('calibration-start').disabled=!active||loading;
    get<HTMLButtonElement>('calibration-finish').disabled=!active||calibration.stage!=='reach';
  }
  function showCalibration(){
    const guides={idle:'Kameranın karşısında rahatça durun. Elinizin ulaşabildiği alanı birlikte keşfedelim.',one:'Bir elinizi kaldırın ve kısa bir süre gösterin. ✋',two:'Şimdi iki elinizi birlikte gösterin. 🙌',reach:'İşaret parmaklarınızı rahatça sola, sağa, yukarı ve aşağı uzatın. Sonra “Alanı Kullan”a basın.',ready:'Alan hazır! Kesikli çerçeve ulaşabildiğiniz alanı gösteriyor. Parmak konumu bu alana göre de eşlenir.'};
    get('calibration-guide').textContent=guides[calibration.stage];
    get<HTMLProgressElement>('calibration-progress').value=calibration.progress;
    screen.querySelectorAll<HTMLElement>('[data-step]').forEach(step=>step.classList.toggle('current',step.dataset.step===calibration.stage));
    currentStage=calibration.stage;updateButtons();
  }
  function draw(){
    const width=video.videoWidth||640,height=video.videoHeight||480;
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    context.clearRect(0,0,width,height);
    if(calibration.bounds){const b=calibration.bounds;context.save();context.strokeStyle='#fff5b6';context.lineWidth=3;context.setLineDash([10,8]);context.strokeRect(b.left*width,b.top*height,(b.right-b.left)*width,(b.bottom-b.top)*height);context.restore();}
    for(const hand of latest.hands){
      const color=colors[hand.colorSlot];const points=hand.landmarks.map(p=>mapPoint(p,width,height,mirrored));
      context.lineCap='round';context.lineJoin='round';
      for(const [from,to]of connections){context.beginPath();context.moveTo(points[from].x,points[from].y);context.lineTo(points[to].x,points[to].y);context.strokeStyle='#123e3b';context.lineWidth=7;context.stroke();context.strokeStyle=color;context.lineWidth=3;context.stroke();}
      for(const point of points){context.beginPath();context.arc(point.x,point.y,4,0,Math.PI*2);context.fillStyle=color;context.fill();context.strokeStyle='#123e3b';context.lineWidth=1.5;context.stroke();}
      const raw=mapPoint(hand.raw[8],width,height,mirrored);const tip=points[8];
      context.beginPath();context.arc(raw.x,raw.y,11,0,Math.PI*2);context.strokeStyle='white';context.lineWidth=2;context.stroke();
      context.beginPath();context.arc(tip.x,tip.y,7,0,Math.PI*2);context.fillStyle='#ffe266';context.fill();context.strokeStyle='#304a39';context.stroke();
      const palm=mapPoint(hand.palmCenter,width,height,mirrored);
      context.beginPath();context.moveTo(palm.x,palm.y-9);context.lineTo(palm.x+9,palm.y);context.lineTo(palm.x,palm.y+9);context.lineTo(palm.x-9,palm.y);context.closePath();context.fillStyle='white';context.fill();context.strokeStyle=color;context.lineWidth=3;context.stroke();
      context.strokeStyle='white';context.lineWidth=3;context.strokeRect(points[0].x-7,points[0].y-7,14,14);
      context.beginPath();context.arc(points[4].x,points[4].y,8,0,Math.PI*2);context.strokeStyle='#ff9dcd';context.stroke();
      context.font='bold 15px sans-serif';context.lineWidth=4;context.strokeStyle='#173e3d';context.fillStyle=color;
      const x=Math.max(5,Math.min(width-90,palm.x+14)),y=Math.max(20,palm.y-12);const label=`İz ${hand.id}`;context.strokeText(label,x,y);context.fillText(label,x,y);
    }
  }
  function details(hand:TrackedHand){
    const handedness=hand.handedness==='Left'?'Sol':hand.handedness==='Right'?'Sağ':'Bilinmiyor';
    const screenPoint=mapPoint(hand.indexTip,1280,720,mirrored,calibration.bounds);
    return `<article class="hand-card" style="--hand:${colors[hand.colorSlot]}"><h3>● İz ${hand.id} <span>Model: ${handedness} (${Math.round(hand.handednessScore*100)}%)</span></h3><dl><div><dt>Bilek · kamera x,y</dt><dd>${pair(hand.wrist)}</dd></div><div><dt>İşaret ucu · kamera x,y</dt><dd>${pair(hand.indexTip)}</dd></div><div><dt>Başparmak · kamera x,y</dt><dd>${pair(hand.thumbTip)}</dd></div><div><dt>Avuç · kamera x,y</dt><dd>${pair(hand.palmCenter)}</dd></div><div><dt>Ekran · ${calibration.bounds?'tanınan alan':'tam alan'} x,y</dt><dd>${Math.round(screenPoint.x)}, ${Math.round(screenPoint.y)}</dd></div></dl></article>`;
  }
  function updateUi(now:number){
    const values=metrics.snapshot(now);
    get('camera-fps').textContent=values.cameraFps?values.cameraFps.toFixed(1):'—';
    get('inference-fps').textContent=values.inferenceFps?values.inferenceFps.toFixed(1):'—';
    get('inference-latency').textContent=values.latencyMs?`${values.latencyMs.toFixed(1)} ms`:'—';
    get('hand-count').innerHTML=`${latest.hands.length} <small>/ 2</small>`;
    const markup=latest.hands.length?latest.hands.map(details).join(''):'<p>El görünmüyor. Elinizi kameraya gösterin; noktalar yeniden belirecek.</p>';
    if(markup!==lastDetails){get('hand-details').innerHTML=markup;lastDetails=markup;}
  }
  function stop(message='Kamera durduruldu. Hazır olduğunuzda yeniden başlayabilirsiniz.'){
    generation++;active=false;loading=false;busy=false;
    cancelAnimationFrame(raf);if(videoCallback&&supportsVideoFrames)video.cancelVideoFrameCallback(videoCallback);videoCallback=0;
    camera.stop();service.close();processor.reset();metrics.reset();calibration.reset();frameGate.reset();
    latest={timestamp:0,hands:[],ambiguous:false};context.clearRect(0,0,canvas.width,canvas.height);
    get('camera-light').classList.remove('live');get('camera-status').textContent='Kamera kapalı';
    get('camera-resolution').textContent='Görüntü bekleniyor';get('camera-placeholder').hidden=false;
    get('tracking-engine').textContent='Model yerel dosyalardan açılacak · En çok iki el';
    setStatus(message);updateUi(performance.now());showCalibration();
  }
  async function refreshDevices(){
    const previous=select('camera-device').value;
    try{const devices=await camera.devices();select('camera-device').innerHTML='<option value="">Otomatik kamera</option>'+devices.map((device,index)=>`<option value="${escapeHtml(device.deviceId)}">${escapeHtml(device.label||`Kamera ${index+1}`)}</option>`).join('');if(devices.some(device=>device.deviceId===previous))select('camera-device').value=previous;}catch{/* A camera can still run even if enumeration is unavailable. */}
  }
  async function infer(timestamp:number,session:number){
    busy=true;
    try{
      const targetWidth=Math.min(video.videoWidth,Number(select('inference-size').value));
      const frame=await createImageBitmap(video,{resizeWidth:targetWidth,resizeHeight:Math.max(1,Math.round(video.videoHeight*targetWidth/video.videoWidth))});
      if(session!==generation){frame.close();return;}
      const result=await service.infer(frame,timestamp);
      if(session!==generation)return;
      metrics.inferenceFrame(performance.now(),result.latencyMs);
      latest=processor.update(result.detections,result.timestamp);expired=false;
      calibration.observe(latest.hands.map(hand=>mirrorPoint(hand.indexTip,mirrored)),result.timestamp);
      if(calibration.stage!==currentStage)showCalibration();
      else get<HTMLProgressElement>('calibration-progress').value=calibration.progress;
      setStatus(latest.ambiguous?'Eller üst üste. Biraz ayırın; izler yeniden oluşturulur.':latest.hands.length?`${latest.hands.length} el izleniyor. Ellerinizi rahatça hareket ettirin.`:'El aranıyor. Avucunuzu kameraya gösterin.');
      draw();
    }catch(error){if(session===generation){stop();setStatus(error instanceof Error?error.message:'El takibi durdu. Yeniden deneyin.',true);}}
    finally{if(session===generation)busy=false;}
  }
  function onFrame(timestamp:number,session:number,mediaTime:number){
    if(session!==generation||!active)return;
    const gate=frameGate.accept(mediaTime,timestamp,Number(select('inference-rate').value),busy);
    if(!gate.fresh)return;
    lastCameraTime=timestamp;metrics.cameraFrame(timestamp);
    if(gate.due&&video.readyState>=2)void infer(timestamp,session);
  }
  function scheduleVideo(session:number){
    videoCallback=video.requestVideoFrameCallback((now,metadata)=>{onFrame(now,session,metadata.mediaTime);if(active&&session===generation)scheduleVideo(session);});
  }
  function tick(now:number,session:number){
    if(session!==generation||!active)return;
    if(!supportsVideoFrames && video.currentTime!==lastVideoTime && video.readyState>=2){lastVideoTime=video.currentTime;onFrame(now,session,video.currentTime);}
    if(now-lastCameraTime>5000){stop();setStatus('Kameradan görüntü gelmiyor. Bağlantıyı kontrol edip yeniden başlatın.',true);return;}
    if(latest.hands.length && now-latest.timestamp>trackingConfig.lossTimeoutMs && !expired){latest=processor.update([],now);expired=true;draw();setStatus('Güncel el konumu bekleniyor. Elinizi yeniden gösterin.');}
    if(now-lastUi>200){updateUi(now);lastUi=now;}
    raf=requestAnimationFrame(time=>tick(time,session));
  }
  async function start(){
    stop();const session=generation;loading=true;updateButtons();setStatus('Kamera izni bekleniyor… Tarayıcıdaki izin penceresini kontrol edin.');
    try{
      if(!await camera.start(select('camera-device').value,Number(select('camera-size').value))||session!==generation)return;
      get('camera-placeholder').hidden=true;
      get('camera-light').classList.add('live');get('camera-status').textContent='Görüntü açık · model hazırlanıyor';
      setStatus('Yerel el takip modeli hazırlanıyor…');
      const delegate=await service.initialize(select('tracking-delegate').value as 'CPU'|'GPU');
      if(session!==generation)return;
      active=true;loading=false;lastVideoTime=-1;lastCameraTime=performance.now();lastUi=0;
      get('camera-light').classList.add('live');get('camera-status').textContent='Kamera açık';
      get('camera-resolution').textContent=`${video.videoWidth} × ${video.videoHeight}`;
      screen.querySelector<HTMLElement>('.camera-stage')!.style.aspectRatio=`${video.videoWidth} / ${video.videoHeight}`;
      get('tracking-engine').textContent=`MediaPipe · ${delegate}${delegate!==select('tracking-delegate').value?' (yedek işlemci)':''} · Ayrı işlem · 21 nokta / el`;
      await refreshDevices();if(session!==generation)return;
      updateButtons();setStatus('El aranıyor. Bir elinizi kameraya gösterin.');
      if(supportsVideoFrames)scheduleVideo(session);
      raf=requestAnimationFrame(time=>tick(time,session));
    }catch(error){if(session===generation){const message=camera.active&&error instanceof Error?error.message:cameraError(error);stop();setStatus(message,true);}}
  }
  get('camera-start').onclick=()=>{void start();};get('camera-stop').onclick=()=>stop();
  camera.onDisconnect=()=>{stop();setStatus('Kamera bağlantısı kesildi. Kamerayı bağlayıp yeniden başlatın.',true);};
  get<HTMLInputElement>('tracking-mirror').onchange=event=>{mirrored=(event.target as HTMLInputElement).checked;video.style.transform=mirrored?'scaleX(-1)':'none';calibration.reset();showCalibration();draw();};
  video.style.transform='scaleX(-1)';
  get<HTMLInputElement>('tracking-smoothing').onchange=event=>{processor.smoothing=(event.target as HTMLInputElement).checked;processor.reset();latest={timestamp:0,hands:[],ambiguous:false};draw();};
  get<HTMLInputElement>('smoothing-time').oninput=event=>{processor.timeConstantMs=Number((event.target as HTMLInputElement).value);get('smoothing-value').textContent=`${processor.timeConstantMs} ms`;};
  get('calibration-start').onclick=()=>{calibration.start();showCalibration();draw();};
  get('calibration-finish').onclick=()=>{if(!calibration.finish())get('calibration-guide').textContent='Biraz daha keşfedelim: parmaklarınızı sola, sağa, yukarı ve aşağı uzatın. Sonra tekrar deneyin.';else showCalibration();draw();};
  get('calibration-reset').onclick=()=>{calibration.reset();showCalibration();draw();};
  const leave=()=>{stop();screen.hidden=true;main.hidden=false;openButton.focus();};
  get('tracking-back').onclick=leave;
  openButton.onclick=()=>{pauseGame();main.hidden=true;screen.hidden=false;get<HTMLButtonElement>('camera-start').focus();};
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&(active||loading))stop('Sekme gizlendiği için kamera kapatıldı. Yeniden başlatabilirsiniz.');});
  window.addEventListener('pagehide',()=>stop());
  navigator.mediaDevices?.addEventListener('devicechange',()=>{if(!screen.hidden)void refreshDevices();});
}
