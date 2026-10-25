import './style.css';
import {CameraTracker} from './vision/camera';
import type {Landmark, PosePacket} from './vision/types';
import {assignPeople, CHAPTERS, MOVES, toBody, type Body} from './game/moves';
import {RhythmGame, type PlayerState} from './game/engine';
import {renderKid,preloadSprites,spritesReady} from './game/characters';
import {characterCue} from './game/presentation';
import {SpriteInspector} from './ui/SpriteInspector';
import {BeatAudio} from './game/audio';

const $ = (id: string) => document.getElementById(id)!;
const game = new RhythmGame();
const sound = new BeatAudio();
const video = $('webcam') as HTMLVideoElement;
const STORAGE_KEY = 'ritim-canavari-progress-v2';
const hints=new Map<number,{key:string;at:number}>();
let mirrorTeaching=true;
try{mirrorTeaching=localStorage.getItem('ritim-teaching-direction')!=='front';}catch{}
const inspector=new SpriteInspector(()=>mirrorTeaching,mirror=>{mirrorTeaching=mirror;try{localStorage.setItem('ritim-teaching-direction',mirror?'mirror':'front');}catch{}});

type SavedProgress = {
  count: 1 | 2 | 3;
  savedAt: number;
  players: {stage: number; score: number; longestCombo: number;}[];
};

let count: 1 | 2 | 3 = 1,
  tracker: CameraTracker | null = null,
  connecting = false,
  cameraReady = false,
  livePoses: (Landmark[] | null)[] = [],
  bodies: (Body | null)[] = [],
  centers: (number | null)[] = [],
  lastFeedback: number[] = [],
  lastStages: number[] = [],
  lastBeat = -1,
  lastRender = 0,
  lastSavedSignature = '';

const n = (i: number) => i + 1;

function showMessage(s: string, error = false) {
  $('camera-message').textContent = s;
  $('camera-message').classList.toggle('error', error);
}

function readSavedProgress(): SavedProgress | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedProgress;
    if (!parsed || !Array.isArray(parsed.players)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveProgress() {
  if (!game.active || game.mode !== 'webcam' || !game.players.length) return;
  const payload: SavedProgress = {
    count,
    savedAt: Date.now(),
    players: game.players.map((p) => ({
      stage: p.stage,
      score: p.score,
      longestCombo: p.longestCombo,
    })),
  };
  const signature = JSON.stringify(payload);
  if (signature === lastSavedSignature) return;
  lastSavedSignature = signature;
  localStorage.setItem(STORAGE_KEY, signature);
}

function applySavedProgress() {
  const saved = readSavedProgress();
  if (!saved || saved.count !== count || saved.players.length !== game.players.length) return;
  saved.players.forEach((sp, i) => {
    const p = game.players[i];
    if (!p) return;
    p.stage = Math.max(0, Math.min(CHAPTERS.length - 1, sp.stage ?? 0));
    p.score = Math.max(0, sp.score ?? 0);
    p.longestCombo = Math.max(0, sp.longestCombo ?? 0);
    p.feedback = sp.stage > 0 ? 'Kayıtlı aşaman yüklendi. Hazırsan ritmi izle!' : p.feedback;
  });
}

function syncSetup() {
  document.querySelectorAll<HTMLButtonElement>('.count-card').forEach((b) => b.classList.toggle('selected', Number(b.dataset.count) === count));
  const saved = readSavedProgress();
  ($('camera-button') as HTMLButtonElement).textContent = connecting ? '⏳ MODEL HAZIRLANIYOR' : cameraReady ? '✓ KAMERAYI KAPAT' : '📷 KAMERAYI AÇ';
  ($('camera-button') as HTMLButtonElement).disabled = connecting;
  ($('start-button') as HTMLButtonElement).disabled = !cameraReady || connecting || !spritesReady();
  ($('test-button') as HTMLButtonElement).disabled = !spritesReady();
  ($('start-button') as HTMLButtonElement).textContent = saved && saved.count === count ? '▶ DEVAM ET' : '▶ OYUNU BAŞLAT';
}

function stopCamera() {
  tracker?.stop();
  tracker = null;
  cameraReady = false;
  connecting = false;
  livePoses = [];
  bodies = [];
  centers = [];
  syncSetup();
}

async function toggleCamera() {
  if (cameraReady) {
    stopCamera();
    showMessage('Kamera kapatıldı.');
    return;
  }
  if (connecting) return;
  connecting = true;
  syncSetup();
  showMessage('Kamera izni ve MediaPipe modeli hazırlanıyor…');
  try {
    tracker = new CameraTracker(video, {model: 'lite', resolution: 768, numPoses: count, delegate: 'GPU'});
    tracker.onPose = posePacket;
    tracker.onStatus = (m) => {
      showMessage(m);
      $('tracker-health').textContent = m;
    };
    tracker.onError = (m) => {
      $('tracker-health').textContent = 'Algılama: ' + m;
    };
    await tracker.start();
    cameraReady = true;
    showMessage(`${count} kişilik kamera hazır! Herkes baştan dize kadar görünsün.`);
  } catch (err) {
    stopCamera();
    showMessage('Kamera açılamadı: ' + (err instanceof Error ? err.message : String(err)) + '. Chrome + localhost kullan.', true);
  } finally {
    connecting = false;
    syncSetup();
  }
}

function posePacket(packet: PosePacket) {
  const assigned = assignPeople(packet.poses, count, centers);
  const aspect = video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9;
  livePoses = assigned;
  bodies = assigned.map((p) => toBody(p, aspect));
  centers = bodies.map((b, i) => b?.centerX ?? centers[i] ?? null);
  $('tracker-health').textContent = `● ${bodies.filter((b) => b?.visible).length}/${count} oyuncu görüldü · ${Math.round(packet.inferenceMs)} ms`;
}

function start(mode: 'webcam' | 'test') {
  if(!spritesReady()){showMessage('Karakter animasyonlarının yüklenmesini bekle.');return;}
  const now = performance.now();
  game.start(count, now, mode);
  if (mode === 'webcam') applySavedProgress();
  lastFeedback = [];
  lastStages = [];
  lastBeat = -1;
  hints.clear();
  $('welcome').classList.add('hidden');
  $('game').classList.remove('hidden');
  $('finish-overlay').classList.add('hidden');
  $('player-grid').className = 'player-grid players-' + count;
  $('rule-show').textContent = 'İLK BİTİREN KAZANIR';
  $('player-grid').innerHTML = game.players.map((p) => laneHTML(p)).join('');
  document.querySelectorAll<HTMLButtonElement>('.hint-button').forEach((b) => b.addEventListener('click', () => {const id=Number(b.dataset.player),p=game.players[id];game.setHint(id);hints.set(id,{key:`${p.stage}:${p.step}`,at:performance.now()});}));
  document.querySelectorAll<HTMLButtonElement>('.replay-button').forEach((b) => b.addEventListener('click', () => game.replay(game.players[Number(b.dataset.player)], performance.now())));
  document.querySelectorAll<HTMLButtonElement>('.manual-button').forEach((b) => b.addEventListener('click', () => game.debugAdvance(Number(b.dataset.player), performance.now())));
  if (mode === 'test') {
    $('tracker-health').textContent='Kamerasız arayüz testi · hareket algılama kapalı';
    const flag = document.createElement('span');
    flag.id = 'test-flag';
    flag.className = 'test-flag';
    flag.textContent = 'TEST MODU · GERÇEK HAREKET TANIMA YOK';
    document.body.append(flag);
  }
  sound.wake();
  sound.note('level');
  saveProgress();
}

function laneHTML(p: PlayerState) {
  return `<article class="player-lane lane-${p.id}" id="lane-${p.id}">
  <div class="lane-top"><div class="lane-number"><span class="player-mini">${['👦', '👧', '👦'][p.id]}</span> ${p.name} <small>· OYUNCU ${n(p.id)}</small></div><div class="lane-score">⭐ <span data-field="score">0</span></div></div>
  <div class="chapter-badge"><span data-field="level">01 / 10</span><strong data-field="title">Isınma Dansı</strong></div>
  <div class="world-name" data-field="world">Şeker Ormanı</div>
  <div class="progress-dots" data-field="chapters">${CHAPTERS.map((_, i) => `<i class="${i === 0 ? 'current' : ''}"></i>`).join('')}</div>
  <div class="kid-arena"><span class="stage-cloud">✦</span><span class="stage-cloud c2">♪</span><div class="stage-ground"></div><canvas class="kid-canvas" id="kid-${p.id}" aria-label="Hareketi gösteren çizgi film çocuk karakteri"></canvas></div>
  <div class="instruction-box"><span class="stage-label" data-field="phase">ÖNCE İZLE</span><div class="big-instruction" data-field="prompt">BÖLÜMÜ ÖĞREN</div><div class="instruction-detail" data-field="detail">Hareketleri sırasıyla izle.</div></div>
  <div class="beat-progress" data-field="beats"></div>
  <div class="camera-and-control">
   <div class="camera-mini">
      <div class="camera-hud"><span class="camera-stage" data-field="cam-stage">AŞAMA 1</span><span class="camera-score" data-field="cam-score">0 PUAN</span></div>
      <canvas id="camera-${p.id}"></canvas>
      <span class="camera-caption" data-field="camera-caption">KAMERA</span>
      <div class="cam-missing" data-field="cam-missing" hidden>Oyuncu aranıyor…</div>
   </div>
   <div class="lane-controls"><div class="feedback" data-field="feedback">Ritmi izle!</div><button data-player="${p.id}" class="hint-button" type="button">💡 İPUCU GÖSTER</button><button data-player="${p.id}" class="replay-button" type="button">↻ RİTMİ TEKRAR İZLE</button>${game.mode === 'test' ? `<button data-player="${p.id}" class="manual-button" type="button">TEST: ADIMI GEÇ</button>` : ''}</div>
  </div><div class="celebration hidden" data-field="celebrate"><div class="emoji" data-field="celebrate-emoji">🎉</div><strong data-field="celebrate-text">BÖLÜM TAMAM!</strong><p data-field="celebrate-detail">Yeni ritim yükleniyor...</p></div>
 </article>`;
}

function field(p: PlayerState, key: string) {
  return document.querySelector<HTMLElement>(`#lane-${p.id} [data-field="${key}"]`)!;
}

function paintCamera(canvas: HTMLCanvasElement, p: PlayerState) {
  const box = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const ww = Math.round(box.width * dpr);
  const hh = Math.round(box.height * dpr);
  if (!ww || !hh) return;
  if (canvas.width !== ww || canvas.height !== hh) {
    canvas.width = ww;
    canvas.height = hh;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = box.width;
  const h = box.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = ['#f9cdb9', '#dfd2ff', '#c7f0e5'][p.id];
  ctx.fillRect(0, 0, w, h);
  if (game.mode === 'test') {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 16px system-ui';
    ctx.fillText('TEST MODU', w / 2, h / 2);
    field(p, 'cam-missing').hidden = true;
    return;
  }
  if (!video.videoWidth || !cameraReady) {
    field(p, 'cam-missing').hidden = false;
    return;
  }
  const wwVideo = video.videoWidth;
  const hhVideo = video.videoHeight;
  const b = bodies[p.id];
  const center = b?.centerX ?? (1 - (p.id + 0.5) / count);
  const slice = 1 / count;
  const sw = wwVideo * Math.min(1, Math.max(0.34, slice * 1.08));
  const sx = Math.max(0, Math.min(wwVideo - sw, (center - sw / wwVideo / 2) * wwVideo));
  const targetAspect = w / h;
  const sourceAspect = sw / hhVideo;
  let drawW = w;
  let drawH = h;
  if (sourceAspect > targetAspect) drawH = w / sourceAspect;
  else drawW = h * sourceAspect;
  ctx.save();
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, 0, sw, hhVideo, (w - drawW) / 2, (h - drawH) / 2, drawW, drawH);
  ctx.restore();
  const points = livePoses[p.id];
  if (points) {
    const pairs: [number, number][] = [[11, 13], [13, 15], [12, 14], [14, 16], [11, 12], [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28]];
    ctx.strokeStyle = '#fff075';
    ctx.lineWidth = 3.4;
    ctx.lineCap = 'round';
    const px = (i: number) => w - (((points[i].x * wwVideo - sx) / sw) * drawW + (w - drawW) / 2);
    const py = (i: number) => points[i].y * drawH + (h - drawH) / 2;
    for (const [a, c] of pairs) {
      if ((points[a]?.visibility ?? 1) < 0.4 || (points[c]?.visibility ?? 1) < 0.4) continue;
      ctx.beginPath();
      ctx.moveTo(px(a), py(a));
      ctx.lineTo(px(c), py(c));
      ctx.stroke();
    }
    for (const i of [11, 12, 15, 16, 23, 24, 25, 26]) {
      ctx.beginPath();
      ctx.fillStyle = '#fff7cf';
      ctx.arc(px(i), py(i), 4.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const missing = field(p, 'cam-missing');
  missing.hidden = !!b?.visible;
  missing.textContent = b ? 'Baş, eller ve dizler görünsün.' : 'Oyuncu kamerada bulunamadı.';
}

function updateLane(p: PlayerState, now: number) {
  const c = game.getChapter(p);
  field(p, 'level').textContent = `${String(Math.min(p.stage + 1, 10)).padStart(2, '0')} / 10`;
  field(p, 'title').textContent = c.name;
  field(p, 'world').textContent = c.world + ' · ' + c.tempo + ' BPM';
  field(p, 'score').textContent = p.score.toLocaleString('tr-TR');
  field(p, 'cam-stage').textContent = `AŞAMA ${Math.min(p.stage + 1, 10)}`;
  field(p, 'cam-score').textContent = `${p.score.toLocaleString('tr-TR')} PUAN`;
  field(p, 'chapters').innerHTML = CHAPTERS.map((_, i) => `<i class="${i < p.stage ? 'passed' : i === p.stage ? 'current' : ''}"></i>`).join('');
  const demoStep = game.demoIndex(p, now);
  const isDemo = p.phase === 'demo';
  let moveId = c.sequence[Math.min(c.sequence.length - 1, p.step)];
  if (isDemo) moveId = game.demoMove(p, now);
  if (p.phase === 'finished') moveId = 'star';
  const hint=hints.get(p.id),hintValid=!!hint&&hint.key===`${p.stage}:${p.step}`;
  if(p.hint&&!hintValid)p.hint=false;
  const cue=characterCue(game,p,now,hintValid?hint!.at:null);
  const canvas=$('kid-'+p.id) as HTMLCanvasElement;
  renderKid(canvas,p.id,cue.move,now,1,{...cue,mirror:mirrorTeaching});
  canvas.setAttribute('aria-label',cue.move?MOVES[cue.move].description:'Nötr duruş. Sıradaki hareket hafızandan yapılır.');
  field(p, 'phase').textContent = p.phase === 'finished' ? 'EFSANE!' : isDemo ? (p.retrying?'RİTİM BAŞTAN · TEKRAR İZLE':'ÖNCE İZLE · HAFIZANA KAZI') : p.phase === 'play' ? 'ŞİMDİ SENİN SIRAN' : 'SEVİYE TAMAM!';
  field(p, 'prompt').textContent = p.phase === 'finished' ? 'TÜM BÖLÜMLER BİTTİ!' : isDemo ? (demoStep < 0 ? (p.retrying?'RİTMİ BAŞTAN İZLE':'RİTMİ HAZIRLA') : MOVES[moveId].label) : p.phase === 'play' ? (p.hint ? MOVES[moveId].label : 'HAFIZANDAN YAP!') : 'MUHTEŞEMSİN!';
  field(p, 'detail').textContent = p.phase === 'finished' ? 'Şampiyonumuz belli oldu!' : isDemo ? (demoStep < 0 ? (p.retrying?'5 saniye geçti · aynı hareket dizisi yeniden başlıyor.':'Birazdan hareketleri göstereceğim…') : MOVES[moveId].description) : p.phase === 'play' ? (p.hint ? MOVES[moveId].description : `${p.step + 1}. hareket · doğru yapana kadar devam etmez`) : 'Sıradaki bölüm geliyor.';
  field(p, 'beats').innerHTML = c.sequence.map((m, i) => `<span class="${!isDemo && i < p.step ? 'done' : (isDemo ? i === demoStep : i === p.step) ? 'on' : ''}" title="${i + 1}. hareket">${isDemo ? MOVES[m].emoji : i < p.step ? '✓' : '♪'}</span>`).join('');
  field(p, 'feedback').textContent = p.phase === 'finished' ? '10 SEVİYE TAMAM!' : p.phase === 'demo' ? `${Math.max(0, Math.min(c.sequence.length, demoStep + 1))}/${c.sequence.length} hareket gösteriliyor` : p.phase === 'celebrate' ? '🎉 Harikasın, yeni bölüm geliyor!' : p.feedback;
  field(p, 'cam-missing').hidden = game.mode === 'test';
  const cele = field(p, 'celebrate');
  cele.classList.toggle('hidden', p.phase !== 'celebrate' && p.phase !== 'finished');
  cele.classList.toggle('finish-lane', p.phase === 'finished');
  if (p.phase === 'finished') {
    field(p, 'celebrate-emoji').textContent = '🏆';
    field(p, 'celebrate-text').textContent = 'BİTİRDİN!';
    field(p, 'celebrate-detail').textContent = `${p.score.toLocaleString('tr-TR')} PUAN · SONUÇ BEKLENİYOR`;
  } else if (p.phase === 'celebrate') {
    field(p, 'celebrate-emoji').textContent = '🎉';
    field(p, 'celebrate-text').textContent = 'BÖLÜM TAMAM!';
    field(p, 'celebrate-detail').textContent = `${p.stage} / 10 · SIRADAKİ RİTİM GELİYOR`;
  }
  field(p, 'camera-caption').textContent = game.mode === 'test' ? 'KAMERASIZ TEST' : `OYUNCU ${p.id + 1} · ${bodies[p.id]?.visible ? 'GÖRÜLDÜ' : 'ARANIYOR'}`;
  paintCamera($('camera-' + p.id) as HTMLCanvasElement, p);
}

function showFinish() {
  $('finish-overlay').classList.remove('hidden');
  const champion = game.players[game.winner ?? 0];
  $('finish-title').textContent = champion.name + ' KAZANDI!';
  $('finish-description').textContent = '10 ritmi ilk tamamlayan oyuncu kazandı!';
  $('finish-results').innerHTML = game.players
    .slice()
    .sort((a, b) => (a.finishedAt !== null && b.finishedAt === null ? -1 : a.finishedAt === null && b.finishedAt !== null ? 1 : a.finishedAt !== null && b.finishedAt !== null ? a.finishedAt - b.finishedAt : b.stage - a.stage || b.score - a.score))
    .map((p, i) => `<div class="finish-rank">${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} ${p.name} · ${p.score.toLocaleString('tr-TR')} puan · ${p.finishedAt === null ? `${p.stage}/10 aşama` : `${((p.finishedAt - game.startedAt) / 1000).toFixed(1)} sn`}</div>`)
    .join('');
  sound.note('win');
  saveProgress();
}

function loop(now: number) {
  inspector.tick(now);
  if (game.active && !$('game').classList.contains('hidden')) {
    game.tick(now, bodies);
    const advanced = Math.max(0, ...game.players.map((p) => Math.min(9, p.stage)));
    const bpm = CHAPTERS[advanced].tempo;
    $('global-bpm').textContent = `${bpm} BPM`;
    const beat = Math.floor((now - game.startedAt) / (60000 / bpm));
    if (beat !== lastBeat) {
      lastBeat = beat;
      const led = $('global-pulse');
      led.classList.remove('on');
      void led.offsetWidth;
      led.classList.add('on');
      if (game.players.some((p) => p.phase === 'play' || p.phase === 'demo')) sound.note('beat', beat % 4 === 0 ? 2 : 0);
    }
    for (const p of game.players) {
      if (p.lastGoodAt && (lastFeedback[p.id] ?? 0) !== p.lastGoodAt) {
        sound.note('good');
        lastFeedback[p.id] = p.lastGoodAt;
      }
      if ((lastStages[p.id] ?? 0) !== p.stage && p.phase !== 'finished') {
        sound.note('level');
        lastStages[p.id] = p.stage;
        saveProgress();
      }
    }
    if (now - lastRender > 60) {
      game.players.forEach((p) => updateLane(p, now));
      lastRender = now;
      saveProgress();
    }
    if (game.winner !== null && $('finish-overlay').classList.contains('hidden')) showFinish();
  } else if (!$('welcome').classList.contains('hidden')) {
    for (let i = 0; i < 3; i++) {
      const choices: ['clap', 'rightHead', 'star'] = ['clap', 'rightHead', 'star'];
      renderKid($('intro-kid-' + i) as HTMLCanvasElement, i, choices[i], now,1,{mirror:mirrorTeaching});
    }
  }
  requestAnimationFrame(loop);
}

function returnMenu() {
  game.active = false;
  $('game').classList.add('hidden');
  $('welcome').classList.remove('hidden');
  $('finish-overlay').classList.add('hidden');
  document.getElementById('test-flag')?.remove();
  saveProgress();
}

for (const b of document.querySelectorAll<HTMLButtonElement>('.count-card')) {
  b.addEventListener('click', () => {
    const next = Number(b.dataset.count) as 1 | 2 | 3;
    if (next !== count) {
      count = next;
      if (cameraReady || connecting) {
        stopCamera();
        showMessage('Oyuncu sayısı değişti. Kamerayı tekrar aç.');
      }
      syncSetup();
    }
  });
}
$('camera-button').addEventListener('click', () => {
  void toggleCamera();
});
$('start-button').addEventListener('click', () => {
  if (cameraReady) start('webcam');
});
$('test-button').addEventListener('click', () => start('test'));
$('back-menu').addEventListener('click', returnMenu);
$('fullscreen').addEventListener('click', () => {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void $('game').requestFullscreen();
});
$('audio-button').addEventListener('click', () => {
  sound.enabled = !sound.enabled;
  $('audio-button').textContent = sound.enabled ? '♫ SES AÇIK' : '♪ SES KAPALI';
  if (sound.enabled) sound.wake();
});
$('again-button').addEventListener('click', () => {
  const mode = game.mode;
  start(mode);
});
$('finish-menu').addEventListener('click', returnMenu);
$('help-open').addEventListener('click', () => $('help-overlay').classList.remove('hidden'));
$('help-close').addEventListener('click', () => $('help-overlay').classList.add('hidden'));
$('help-okay').addEventListener('click', () => $('help-overlay').classList.add('hidden'));
$('sprite-review').addEventListener('click',()=>void inspector.open());
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') $('help-overlay').classList.add('hidden');
});
window.addEventListener('pagehide', stopCamera);
syncSetup();
void preloadSprites().then(()=>{syncSetup();$('sprite-status').textContent='✓ 13 hareket hazır';if(new URLSearchParams(location.search).has('sprites'))void inspector.open();}).catch(error=>{showMessage(String(error),true);$('sprite-status').textContent='Görseller yüklenemedi · sayfayı yenile';});
requestAnimationFrame(loop);
