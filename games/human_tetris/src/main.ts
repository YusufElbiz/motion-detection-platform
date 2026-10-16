import './style.css';
import {CameraTracker} from './vision/camera';
import type {Landmark,PosePacket} from './vision/types';
import {distribute,scorePose,smoothPose,type MatchResult} from './game/matcher';
import {GameEngine,type Mode} from './game/engine';
import {renderWall,renderCamera} from './game/render';
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const engine=new GameEngine();
const video=$<HTMLVideoElement>('webcam'),wall=$<HTMLCanvasElement>('wall'),cameraCanvas=$<HTMLCanvasElement>('pose-preview');
let connected=false,starting=false,playing=false,muted=true;
let tracked:(Landmark[]|null)[]=[null,null];let smoothed:(Landmark[]|null)[]=[null,null];
let lastFps=0,frames=0,renderFps=0;
let lastStage=engine.stage;
let mode:Mode='solo';

const audio=new (window.AudioContext||((window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext))();
function beep(frequency:number,duration=.12,type:OscillatorType='sine',volume=.08){
  if(muted)return;
  try{if(audio.state==='suspended')void audio.resume();const osc=audio.createOscillator(),gain=audio.createGain();osc.type=type;osc.frequency.setValueAtTime(frequency,audio.currentTime);gain.gain.setValueAtTime(volume,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);osc.connect(gain).connect(audio.destination);osc.start();osc.stop(audio.currentTime+duration)}catch{/* audio is optional */}
}
function setCameraMessage(message:string,error=false){$('camera-message').textContent=message;$('camera-message').classList.toggle('error',error)}
function setCamUI(isOn:boolean){$('camera-empty').hidden=isOn;$('camera-dot').textContent=isOn?'● AKTİF':'KAPALI';$('camera-dot').classList.toggle('active',isOn);$('camera-btn').innerHTML=isOn?'<span>◉</span><span>KAMERAYI KAPAT</span>':'<span>◉</span><span>KAMERAYI AÇ</span>';$<HTMLButtonElement>('start-btn').disabled=!isOn||starting;}
async function activateCamera(){
  if(connected){stopActive();engine.reset();playing=false;return;}
  if(starting)return;
  engine.reset();playing=false;$('demo-controls').hidden=true;
  starting=true;$<HTMLButtonElement>('camera-btn').disabled=true;$('camera-btn').textContent='KAMERA HAZIRLANIYOR...';
  const model=$<HTMLSelectElement>('model').value as 'full'|'lite';
  try{
    // Recreate if model changed: camera tracker owns its private settings.
    stopActive();
    const tracker=new CameraTracker(video,{model,delegate:'GPU',resolution:model==='full'?(mode==='duo'?768:960):640,numPoses:mode==='duo'?2:1});
    activeTracker=tracker;
    tracker.onPose=handlePose;tracker.onStatus=message=>setCameraMessage(message);tracker.onError=message=>setCameraMessage(message,true);
    await tracker.start();connected=true;setCamUI(true);$('demo-controls').hidden=true;
  }catch(e){activeTracker?.stop();connected=false;setCamUI(false);setCameraMessage(e instanceof Error?e.message:String(e),true)}
  finally{starting=false;$<HTMLButtonElement>('camera-btn').disabled=false;setCamUI(connected)}
}
let activeTracker:CameraTracker|null=null;
function stopActive(){activeTracker?.stop();activeTracker=null;connected=false;tracked=[null,null];smoothed=[null,null];setCamUI(false);}
// Swap the active camera tracker, ensuring device tracks are closed after model changes.
function handlePose(packet:PosePacket){
  if(!connected)return;
  tracked=mode==='solo'?[packet.poses[0]??null,null]:distribute(packet.poses);
  const t=performance.now();
  const precision=Number($<HTMLInputElement>('precision').value);
  const difficulty=$<HTMLSelectElement>('difficulty').value as 'easy'|'normal'|'hard';
  const ratio=video.videoWidth&&video.videoHeight?video.videoWidth/video.videoHeight:16/9;
  const targets=[engine.current.left,engine.current.right];
  const count=mode==='duo'?2:1;
  for(let i=0;i<count;i++){
    const pose=tracked[i];
    smoothed[i]=pose?smoothPose(smoothed[i],pose):null;
    const match=scorePose(smoothed[i],targets[i],ratio,precision,difficulty);
    if(playing&&engine.stage!=='complete')engine.updatePlayer(i as 0|1,match,t);
    else {engine.players[i].match=match;engine.players[i].holdMs=0;engine.players[i].ready=false;}
  }
  if(mode==='solo'){engine.players[1].match=null;smoothed[1]=null;}

  $('fps').textContent=`${Math.round(packet.inferenceMs)}ms İŞLEM`;
}
// Demo controls are visible ONLY in the non-camera interface test; they are never pose data.
const demoControls=document.createElement('div');demoControls.id='demo-controls';demoControls.className='demo-controls';demoControls.hidden=true;demoControls.innerHTML='<span>ARAYÜZ TESTİ (KAMERA YOK)</span><button id="demo-p1">1 · POZ DOĞRU</button><button id="demo-p2" hidden>2 · POZ DOĞRU</button>';
document.querySelector('.control-panel')?.append(demoControls);
// Controls are inserted before event registration at module evaluation time below.
// Override camera control with the selected tracker (not the reference example game).
$('camera-btn').addEventListener('click',async()=>{
  if(connected){stopActive();engine.reset();playing=false;return;}
  await activateCamera();
});
$('start-btn').addEventListener('click',()=>{
  if(!connected)return;
  engine.start(false);playing=true;
  $('reset-btn').hidden=false;$('start-btn').textContent='YENİDEN BAŞLAT';
  void audio.resume().catch(()=>{});
});
$('reset-btn').addEventListener('click',()=>{engine.reset();playing=false;$('reset-btn').hidden=true;$('start-btn').textContent='OYUNU BAŞLAT'});
$('demo-btn').addEventListener('click',()=>{
  if(connected)stopActive();engine.start(true);playing=true;
  $('reset-btn').hidden=false;
  setCameraMessage(mode==='duo'?'ARAYÜZ TESTİ: Kamera kullanılmaz. İki oyuncu için 1 ve 2 düğmelerine bas.':'ARAYÜZ TESTİ: Kamera kullanılmaz. 1 düğmesine bas.');
  $('camera-message').classList.remove('error');
  $('demo-controls').hidden=false;
});
$('home').addEventListener('click',event=>{event.preventDefault();stopActive();engine.reset();playing=false;$('overlay').classList.remove('hidden');$('demo-controls').hidden=true});
$('audio').addEventListener('click',()=>{muted=!muted;$('audio').textContent=muted?'♫':'♪';$('audio').classList.toggle('enabled',!muted);if(!muted)beep(900)});
// The model must be recreated on mode changes: MediaPipe's numPoses is immutable.
function chooseMode(next:Mode,closeOverlay=false){
  if(starting)return;
  stopActive();playing=false;engine.selectMode(next);mode=next;lastStage=engine.stage;
  $('reset-btn').hidden=true;$('start-btn').textContent='OYUNU BAŞLAT';
  $('demo-controls').hidden=true;
  $('app').classList.toggle('mode-duo',mode==='duo');
  $('solo-mode').classList.toggle('selected',mode==='solo');
  $('duo-mode').classList.toggle('selected',mode==='duo');
  $('mode-header').textContent=mode==='duo'?'İKİ KİŞİ · TEK KAMERA':'TEK KİŞİ · TEK KAMERA';
  $('p2-card').hidden=mode==='solo';$('p2-pill').hidden=mode==='solo';
  $('demo-p2').hidden=mode==='solo';
  $('p1-card-name').textContent=mode==='duo'?'OYUNCU 1 · SOL':'OYUNCU';
  $('camera-instruction').textContent=mode==='duo'?'İki kişi, baştan ayağa ve yan yana kadrajda':'Bütün vücudun kadrajda olmalı';
  $('mode-description').textContent=mode==='duo'?'Soldaki oyuncu sol, sağdaki oyuncu sağ silüeti yapar. İKİSİ de doğru değilse duvar çarpar ve geri gelir.':'Duvar geldiğinde tek başına poz ver. Yanlışsa çarpar ve aynı duvar tekrar gelir.';
  $('footer-mode').textContent=mode==='duo'?'DUO / 8 DUVAR':'SOLO / 16 DUVAR';
  $('duo-state').hidden=mode==='solo';
  setCameraMessage('Mod seçildi. Kamerayı açıp oyuna başlayabilirsin.');
  if(closeOverlay){$('overlay').classList.add('hidden');beep(770);}
}
$('solo-mode').addEventListener('click',()=>chooseMode('solo'));
$('duo-mode').addEventListener('click',()=>chooseMode('duo'));
$('choose-solo').addEventListener('click',()=>chooseMode('solo',true));
$('choose-duo').addEventListener('click',()=>chooseMode('duo',true));
$('info').addEventListener('click',()=>{$('help-modal').classList.remove('hidden')});
const arenaPanel=$('arena-panel');
function syncFullscreen(){
  const active=document.fullscreenElement===arenaPanel||arenaPanel.classList.contains('focused');
  $('fullscreen-btn').textContent=active?'⤢ KÜÇÜLT':'⛶ BÜYÜK EKRAN';
  $('fullscreen-btn').setAttribute('aria-pressed',String(active));
}
async function toggleFullscreen(){
  if(document.fullscreenElement===arenaPanel){await document.exitFullscreen();return;}
  if(arenaPanel.classList.contains('focused')){arenaPanel.classList.remove('focused');syncFullscreen();return;}
  try{await arenaPanel.requestFullscreen();}catch{arenaPanel.classList.add('focused');syncFullscreen();}
}
$('fullscreen-btn').addEventListener('click',()=>{void toggleFullscreen()});
document.addEventListener('fullscreenchange',syncFullscreen);
window.addEventListener('keydown',event=>{
  if((event.target as HTMLElement)?.matches('input,select,textarea'))return;
  if(event.key.toLowerCase()==='f'){event.preventDefault();void toggleFullscreen()}
  if(event.key==='Escape'&&arenaPanel.classList.contains('focused')){arenaPanel.classList.remove('focused');syncFullscreen()}
});
$('close-help').addEventListener('click',()=>{$('help-modal').classList.add('hidden')});
$('help-ok').addEventListener('click',()=>{$('help-modal').classList.add('hidden')});
$('precision').addEventListener('input',()=>{$('precision-label').textContent=`${Number($<HTMLInputElement>('precision').value).toFixed(2)}×`});
$('model').addEventListener('change',()=>{if(connected){stopActive();engine.reset();playing=false;setCameraMessage('Model değişti. Kamerayı yeniden aç.')}});
$('demo-p1').addEventListener('click',()=>demoPass(0));
$('demo-p2').addEventListener('click',()=>demoPass(1));

function demoPass(player:0|1){if(!engine.demo||!playing)return;const s=engine.players[player];s.match={score:1,accepted:true,visible:true,message:'DEMO BAŞARILI',worst:'',maxError:0,jointFeedback:{},segmentFeedback:[],highlights:[]};s.holdMs=900;s.ready=true;s.updatedAt=performance.now();}
window.addEventListener('keydown',event=>{if(!engine.demo||!playing)return;if(event.key==='1')demoPass(0);if(event.key==='2'&&mode==='duo')demoPass(1);});
function drawFrame(timestamp:number){
  engine.tick(timestamp);
  const s=engine.snapshot();
  renderWall(wall,s,timestamp);
  renderCamera(cameraCanvas,video,tracked,s.players.map(p=>p.ready),s.players.map(p=>p.match as MatchResult|null),timestamp);
  const scale=.77+.23*Math.min(1,s.progress);
  const wrap=$('wall-wrap');wrap.style.transform=`translate(-50%,-50%) scale(${scale})`;
  wrap.classList.toggle('wall-clear',s.stage==='clear');
  wrap.classList.toggle('wall-crash',s.stage==='bounce');
  const arena=$('arena');arena.classList.toggle('crashed',s.stage==='bounce');arena.classList.toggle('passed',s.stage==='clear');
  $('challenge-title').textContent=s.current.name;
  const level='level' in s.current?s.current.level:'EŞLİ GÖREV';
  $('challenge-level').textContent=level;
  $('challenge-level').className='challenge-level '+(level==='ÇILGIN'?'insane':level==='ZOR'?'hard':'fun');
  if(mode==='duo'){
    $('duo-state').hidden=false;
    $('duo-state').textContent=s.players[0].ready&&s.players[1].ready?'İKİSİ DE HAZIR ✓':s.players[0].ready?'OYUNCU 2 BEKLENİYOR':s.players[1].ready?'OYUNCU 1 BEKLENİYOR':'İKİ POZ GEREKLİ';
    $('duo-state').classList.toggle('linked',s.players[0].ready&&s.players[1].ready);
  }else $('duo-state').hidden=true;
  if(s.stage!==lastStage){
    if(s.stage==='bounce'){beep(115,.28,'sawtooth',.13);$('impact').classList.remove('burst');void $('impact').offsetWidth;$('impact').classList.add('burst')}
    if(s.stage==='clear'){beep(680,.15);window.setTimeout(()=>beep(910,.2),110)}
    if(s.stage==='complete')beep(1080,.5);
    lastStage=s.stage;
  }
  $('round').innerHTML=`${String(Math.min(engine.count,s.level+1)).padStart(2,'0')} <span>/ ${String(engine.count).padStart(2,'0')}</span>`;
  $('score').textContent=s.score.toString().padStart(4,'0');$('hits').textContent=String(s.hits).padStart(2,'0');
  $('phase').textContent=({idle:'HAZIR',approach:'YAKLAŞIYOR',bounce:'ÇARPIŞMA',clear:'GEÇTİN',complete:'TAMAMLANDI'})[s.stage];
  $('wall-distance').textContent=s.stage==='idle'?'—':s.stage==='complete'?'✓':`${Math.round(s.progress*100)}%`;
  const failing=s.players.slice(0,mode==='duo'?2:1).find(p=>!p.ready&&p.match);
  $('stage-msg').textContent=s.stage==='approach'&&!s.demo&&failing?.match
    ?`${failing.match.message} · TUTUŞ ${Math.round(Math.min(100,failing.holdMs/450*100))}%`
    :s.message;
  $('p1-label').textContent=s.players[0].ready?'HAZIR':'OYUNCU 1';
  $('p2-label').textContent=s.players[1].ready?'HAZIR':'OYUNCU 2';
  for(let i=0;i<(mode==='duo'?2:1);i++){
    const p=s.players[i];const prefix=`p${i+1}`;
    const match=p.match,visible=match?.visible??false;
    const percent=Math.round((match?.score??0)*100);
    const ready=p.ready;
    const label=s.demo?(ready?'TEST ✓':'TEST BEKLENİYOR'):(ready?'HAZIR':!connected?'KAMERA YOK':!visible?'GÖRÜNMÜYOR':'POZ KONTROL');
    $(`${prefix}-state`).textContent=label;
    $(`${prefix}-state`).classList.toggle('good',ready);
    $(`${prefix}-bar`).style.width=`${Math.max(0,Math.min(100,ready?100:percent))}%`;
    $(`${prefix}-bar`).classList.toggle('good',ready);
    $(`${prefix}-percent`).textContent=(!connected&&!s.demo)?'—':`${ready?100:percent}%`;
    const detail=match?.highlights?.length?` · ${match.highlights.slice(0,2).join(' / ')}`:'';
    $(`${prefix}-tip`).textContent=s.demo?(ready?'Poz doğru taklit edildi':'Demo başarı düğmesine bas'):(match?.message??'Oyuncu bekleniyor')+detail;

  }
  const activePlayers=s.players.slice(0,mode==='duo'?2:1);
  const hold=Math.round(Math.min(...activePlayers.map(p=>Math.min(1,p.holdMs/450)))*100);
  $('hold-progress').textContent=activePlayers.every(p=>p.ready)?'POZ TAMAM ✓':`${mode==='duo'?'İKİ KİŞİ':'POZU TUT'}: ${hold}%`;
  $('hold-bar').style.width=`${hold}%`;
  frames++;if(timestamp-lastFps>=1000){renderFps=Math.round(frames*1000/(timestamp-lastFps));lastFps=timestamp;frames=0;if(!connected)$('fps').textContent=`${renderFps} FPS GRAFİK`}
  requestAnimationFrame(drawFrame);
}
chooseMode('solo');setCamUI(false);renderWall(wall,engine.snapshot(),0);requestAnimationFrame(drawFrame);
window.addEventListener('beforeunload',()=>{stopActive();});
