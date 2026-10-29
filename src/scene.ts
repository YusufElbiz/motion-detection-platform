import {categories,config,type Category,type Difficulty} from './config.ts';
import {advance,createState,spawn,wasteName} from './game.ts';
import {attachMouse,type GameInputEvent} from './input.ts';
import {AudioFeedback} from './audio.ts';
import {EnvironmentProgress} from './environment.ts';
import {EncouragementSchedule} from './encouragement.ts';
import {MascotSpeech,encouragements,endingSpeech,tutorialMessages,squirrelArt} from './mascot.ts';
import {MascotDirector,binGuideSpeech} from './mascot-director.ts';
import {wasteArt} from './art.ts';
import {InteractionController,type InteractionResult} from './interaction.ts';
import {MotionInput} from './motion/input.ts';
import {TrackingSession} from './tracking/session.ts';
import {CalibrationManager} from './tracking/calibration.ts';
import {TwoHandsReady} from './motion/readyStart.ts';
import {mirrorPoint} from './tracking/coordinates.ts';
import {CartoonArms} from './motion/arms.ts';
import {WorkshopScene} from './workshop/scene.ts';
import type {GrabMethod} from './motion/config.ts';
import type {TrackingEngine} from './tracking/types.ts';
import {mountTrackingDiagnostics} from './tracking/diagnostics.ts';
import './motion/style.css';

export function mountGameScene(){
  const element=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
  const field=element('playfield');const audio=new AudioFeedback();
  const environment=new EnvironmentProgress(document.querySelector<HTMLElement>('.game')!);
  const encouragementSchedule=new EncouragementSchedule();let activeSeconds=0;
  environment.update(0,config.goal);
  const companion=element('mascot-companion');
  const mascotDirector=new MascotDirector(companion,document.querySelector<HTMLElement>('.game')!);
  const mascot=new MascotSpeech(companion,element('mascot-message'),()=>audio.muted,active=>audio.setVoiceActive('companion',active));
  const resultMascot=new MascotSpeech(element('result'),element('result-speech'),()=>audio.muted,active=>audio.setVoiceActive('result',active));
  element('hand-setup').insertAdjacentHTML('afterend',`<div id="instructions" class="overlay" hidden><div class="welcome instruction-card"><div class="instruction-mascot">${squirrelArt('instructions')}</div><span class="pill">TOPİK ANLATIYOR</span><p id="instruction-text" role="status"></p><small>Anlatım bitince oyun kendiliğinden başlayacak.</small><button id="instruction-skip" class="plain-game-button" type="button">Anlatımı geç</button></div></div>`);
  const tutorialMascot=new MascotSpeech(element('instructions'),element('instruction-text'),()=>audio.muted,active=>audio.setVoiceActive('instructions',active));
  let introducing=false,introSeconds=0,introLimit=24;
  element('mascot-repeat').onclick=()=>{mascot.stop();resultMascot.say(endingSpeech,true);};
  const countInput=element<HTMLInputElement>('waste-count');
  countInput.onchange=()=>{countInput.value=String(createState(countInput.valueAsNumber).goal);};
  let state=createState(),running=false,paused=false,difficulty:Difficulty='relaxed';
  let mode:'mouse'|'hand'='mouse',preparing=false,setupResume=false,messageUntil=0,previous=performance.now(),lastMetrics=0;
  let noHandSince=0;
  const interaction=new InteractionController(state);
  const nodes=new Map<number,HTMLButtonElement>();
  const arms=new CartoonArms(document.querySelector<HTMLElement>('.game')!,element('hand-cursors'));
  const video=element<HTMLVideoElement>('motion-video');
  const session=new TrackingSession(video);const calibration=new CalibrationManager();
  const handsReady=new TwoHandsReady();
  element('setup-progress').insertAdjacentHTML('afterend','<p id="setup-ready-status" class="setup-ready-status" role="status">Alan ayarı tamamlanınca iki elini göster; oyun otomatik başlayacak.</p>');
  const motion=new MotionInput(interaction,dispatch);
  // Second level: the sorted waste becomes material for the workshop.
  const game=document.querySelector<HTMLElement>('.game')!;
  const collected:string[]=[];let workshopActive=false,nextLevel:'sorting'|'workshop'='sorting',resultAdvanceAt=0;
  const workshop=new WorkshopScene(game,{audio,mode:()=>mode,onExit:choice=>{leaveWorkshop();if(choice==='replay'){nextLevel='sorting';void start();}else returnToMenu();}});
  session.processor.lossTimeoutMs=motion.settings.lossGraceMs+150;

  const settings=document.createElement('details');settings.className='motion-settings';
  settings.innerHTML=`<summary>Yetişkin / Öğretmen · Kontrol ayarları</summary><div class="motion-settings-grid"><label>Tutma yöntemi<select id="grab-method"><option value="dwell">Bekleterek tut · küçük eller için</option><option value="pinch">Parmakları birleştirerek tut</option></select></label><label>Tutmak için bekleme<select id="dwell-grab"><option value="600">0,6 saniye</option><option value="900" selected>0,9 saniye</option><option value="1300">1,3 saniye</option></select></label><label>Kutuda bırakma süresi<select id="dwell-release"><option value="450">0,45 saniye</option><option value="650" selected>0,65 saniye</option><option value="1000">1 saniye</option></select></label><label>Hareket hassasiyeti<select id="motion-sensitivity"><option value="0.8">Daha geniş hareket · 0,8</option><option value="1" selected>Dengeli · 1</option><option value="1.25">Daha küçük hareket · 1,25</option><option value="1.5">Küçük hareket · 1,5</option></select></label></div><div class="motion-settings-bottom"><button id="recalibrate" class="secondary" disabled>Oyun Alanını Yeniden Tanı</button><span id="motion-metrics">Kamera kapalı · Fare ile oynayabilirsiniz.</span></div><p>Ayar değişikliği taşınan atığı güvenle bırakır. Hassasiyeti artırmak daha küçük bir el hareketini tüm oyun alanına yayar. Kamerayı kapatmak için ana menüye dönün.</p>`;
  const main=document.querySelector('main')!;main.insertBefore(settings,document.querySelector('footer'));
  settings.querySelector('.motion-settings-grid')!.insertAdjacentHTML('beforeend',`<label>El takibi işlemcisi<select id="game-delegate"><option value="GPU" selected>GPU · desteklenmezse CPU</option><option value="CPU">CPU · uyumlu seçenek</option></select></label><label>İşleme ayrıntısı<select id="game-inference-width"><option value="640" selected>Dengeli · 640 piksel</option><option value="480">Hafif · 480 piksel</option></select></label>`);
  settings.insertAdjacentHTML('beforeend','<p>İşlemci ve ayrıntı ayarı kamera kapalıyken değişir. Hafif mod uzaktaki küçük ellerin algılanmasını zorlaştırabilir. Etkin işlemci ve gecikme aşağıda gösterilir.</p>');
  for(const id of ['game-delegate','game-inference-width'])element(id).onchange=()=>{
    if(session.active||session.loading)return;
    session.requestedDelegate=element<HTMLSelectElement>('game-delegate').value as 'CPU'|'GPU';
    session.inferenceWidth=Number(element<HTMLSelectElement>('game-inference-width').value);
  };
  element<HTMLSelectElement>('grab-method').insertAdjacentHTML('afterbegin','<option value="fist" selected>Elini kapat, tut · elini aç, bırak</option>');
  settings.insertAdjacentHTML('beforeend',`<details class="gesture-lab"><summary>Geliştirici · Hareket tanısı ve ince ayarlar</summary><div class="motion-settings-grid"><label>Algılama yaklaşımı<select id="gesture-engine"><option value="gestures">Model + 3B parmak geometrisi · önerilen</option><option value="landmarks">Noktalardan geometri · karşılaştırma</option></select></label><label>Jest doğrulama süresi<select id="fist-confirm"><option value="60" selected>60 ms · hızlı</option><option value="90">90 ms · dengeli</option><option value="120">120 ms · daha kararlı</option><option value="160">160 ms · daha kararlı</option></select></label><label>Model giriş skoru<input id="fist-confidence" type="range" min="0.5" max="0.9" value="0.6" step="0.05"></label><label>Dururken yumuşatma (ms)<input id="smooth-still" type="range" min="20" max="90" value="55" step="5"></label><label>Hızlı harekette yumuşatma (ms)<input id="smooth-fast" type="range" min="0" max="20" value="8" step="2"></label><label>Uyarlanır yumuşatma<input id="smooth-enabled" type="checkbox" checked></label></div><p>Yaklaşımı değiştirmek için ana menüye dönüp kamerayı kapatın. Aynı anda yalnız bir izleme modeli çalışır. Geometri uyum oranı, modelin olasılık skoru değildir.</p><label class="debug-toggle"><input id="gesture-debug" type="checkbox"> Canlı teknik bilgileri göster (yalnız bu bölümde)</label><pre id="gesture-details" hidden></pre></details>`);
  function feedback(message:string,category?:Category){
    element('feedback').textContent=message;element('feedback').style.borderColor=category?categories[category].color:'#91c99a';
    element('feedback').classList.add('visible');messageUntil=performance.now()+3800;
  }
  function render(){
    const held=interaction.heldIds,hovered=new Set(interaction.hovered.values());
    for(const [id,node]of nodes)if(!state.objects.some(o=>o.id===id)){node.remove();nodes.delete(id);}
    for(const object of state.objects){
      let node=nodes.get(object.id);
      if(!node){node=document.createElement('button');node.className='waste';node.dataset.objectId=String(object.id);field.append(node);nodes.set(object.id,node);}
      // IDs restart each round. A reused DOM node must show the NEW material
      // and variant, otherwise randomized rounds retain the old icon/label.
      if(node.dataset.category!==object.category||node.dataset.variant!==(object.variant??'')){
        node.innerHTML=wasteArt(object.category,object.variant);const label=document.createElement('span');label.className='waste-name';label.textContent=wasteName(object);node.append(label);node.setAttribute('aria-label',wasteName(object)+' — kutuya taşı');node.title=wasteName(object);node.dataset.category=object.category;node.dataset.variant=object.variant??'';
      }
      node.style.left=`${object.x/config.width*100}%`;node.style.top=`${object.y/config.height*100}%`;
      node.classList.toggle('held',held.has(object.id));node.classList.toggle('grab-hover',hovered.has(object.id));
    }
    element('score').textContent=String(state.score);
    element('score-goal').textContent=String(state.goal);
    environment.update(state.score,state.goal);
    const bins=new Set(interaction.binHighlights.values());
    document.querySelectorAll<HTMLElement>('.bin').forEach(bin=>bin.classList.toggle('hovered',bins.has(bin.dataset.category as Category)));
  }
  function handleResult(result:InteractionResult){
    if(result.kind==='correct'){
      if(result.object.variant)collected.push(result.object.variant);
      const wasGuiding=!!companion.dataset.guideCategory;
      mascotDirector.celebrate();
      if(!state.complete&&encouragementSchedule.take(state.score,activeSeconds))mascot.say(encouragements[Math.floor(state.score/4)%encouragements.length],true);
      else if(wasGuiding)mascot.stop();
      audio.play(true);feedback(['Harika! Doğa sana teşekkür ediyor! 🌿','Yaşasın! Bir yıldız daha kazandın! ★','Çok güzel! Doğru kutuyu buldun! ♻'][state.score%3]);
      const bin=document.querySelector<HTMLElement>(`.bin[data-category="${result.bin}"]`)!;bin.classList.add('celebrate');setTimeout(()=>bin.classList.remove('celebrate'),650);
    }else if(result.kind==='incorrect'){
      encouragementSchedule.postpone(activeSeconds);
      mascotDirector.guide(result.object.category);
      mascot.say(binGuideSpeech[result.object.category],true);
      audio.play(false);feedback(`Birlikte deneyelim! ${wasteName(result.object)} → ${categories[result.object.category].label} kutusu.`,result.object.category);
    }else if(result.kind==='grabbed'&&mode==='hand')feedback(motion.settings.method==='fist'?'Yakaladın! Yumruğun kapalı taşı, elini açıp bırak.':motion.settings.method==='dwell'?'Yakaladın! Kutunun içinde biraz bekle.':'Yakaladın! Kutunun üstünde parmaklarını aç.');
  }
  function dispatch(event:GameInputEvent){
    if((mode==='mouse')!==(event.source==='mouse'))return;
    if(workshopActive){workshop.dispatch(event);return;}
    const result=interaction.dispatch(event);if(result)handleResult(result);
    if(state.complete&&running){
      audio.stopMusic();running=false;interaction.disable();motion.disable();
      // Hand mode keeps the camera for the workshop; inference pauses meanwhile.
      if(mode==='hand')session.suspended=true;else session.stop();
      mascot.hide();element('result-count').textContent=`${state.goal} atığı doğru kutularla buluşturdun!`;element('result').hidden=false;
      resultAdvanceAt=performance.now()+(audio.muted?7000:16000);
      resultMascot.say(endingSpeech,true,()=>{if(resultAdvanceAt)resultAdvanceAt=Math.min(resultAdvanceAt,performance.now()+1800);});
      element<HTMLButtonElement>('to-workshop').focus();
    }
    // Rendering is coalesced into the existing scene animation frame.
    if(event.source==='mouse'||state.complete)render();
  }
  attachMouse(field,dispatch,config.width,config.height);

  function renderCursors(){
    const cursors=(running||workshopActive)&&!paused&&mode==='hand'?motion.cursors:[];
    arms.update(cursors,performance.now());
    element('hand-hint').hidden=mode!=='hand'||!running||paused;
    if(mode==='hand'&&running&&!paused){
      const lost=cursors.some(c=>c.state==='TRACKING_LOST');
      if(!cursors.length)noHandSince||=performance.now();else noHandSince=0;
      const hint=!cursors.length?(performance.now()-noHandSince>6000?'Elini göster. Ulaşamıyorsan bir büyüğünle oyun alanını yeniden tanı. 🌿':'Ellerini göster, birlikte devam edelim. 🌿'):lost?'Elini yeniden göster. Atığın seni bekliyor. 🌿':motion.settings.method==='fist'?'Elin açık yaklaş → yumruk yap ve taşı → elini açıp bırak':motion.settings.method==='dwell'?'Atığın üstünde bekle → kutuya taşı → kutuda bekle':'Önce elini aç → parmaklarını birleştirerek tut → kutuda aç';
      if(element('hand-hint').textContent!==hint)element('hand-hint').textContent=hint;
    }else noHandSince=0;
  }
  function showSetup(message?:string){
    const guides={idle:'Ellerimizi hazırlayalım.',one:'Bir elini kaldır ve biraz göster. ✋',two:'Şimdi iki elini birlikte göster. 🙌',reach:motion.settings.method==='fist'?'Açık avuçlarını rahatça sola, sağa, yukarı ve aşağı taşı. Alanı tanıdıktan sonra iki elini birlikte göster.':'İşaret parmaklarını rahatça sola, sağa, yukarı ve aşağı uzat. Alanı tanıdıktan sonra iki elini birlikte göster.',ready:'Oyun alanın hazır!'};
    element('setup-guide').textContent=message??guides[calibration.stage];
    element<HTMLProgressElement>('setup-progress').value=calibration.progress;
    element<HTMLButtonElement>('setup-finish').disabled=!session.active||calibration.stage!=='reach';
  }
  function showInstructions(){
    introducing=true;introSeconds=0;introLimit=audio.muted?7:24;
    running=false;paused=false;preparing=false;interaction.disable();motion.disable();session.suspended=true;
    mascot.hide();resultMascot.hide();mascotDirector.reset();
    state=createState(countInput.valueAsNumber);interaction.replaceState(state);render();
    for(const id of ['menu','result','paused','hand-setup'])element(id).hidden=true;
    element('motion-preview').classList.remove('visible');
    audio.stopMusic();audio.startMusic();
    tutorialMascot.say(tutorialMessages[mode==='mouse'?'mouse':motion.settings.method],true,()=>{
      if(!introducing)return;
      if(introSeconds<1)introLimit=7;else finishInstructions();
    });
  }
  function finishInstructions(){
    if(!introducing)return;
    if(document.hidden){introLimit=introSeconds+.2;return;}
    introducing=false;tutorialMascot.hide();beginRound();
  }
  element('instruction-skip').onclick=finishInstructions;
  function enterWorkshop(){
    resultAdvanceAt=0;nextLevel='sorting';introducing=false;tutorialMascot.hide();
    running=false;paused=false;preparing=false;interaction.disable();motion.disable();
    mascot.hide();resultMascot.stop();mascotDirector.stop();
    for(const id of ['menu','result','paused','hand-setup'])element(id).hidden=true;
    element('motion-preview').classList.remove('visible');element('feedback').classList.remove('visible');
    game.classList.add('workshop-mode');companion.hidden=true;workshopActive=true;
    environment.update(1,1); // the garden is clean: the workshop happens in it
    element('nature-status').textContent='Atıklardan yeni şeyler üretelim! 🎨';
    motion.useWorld(workshop.world);workshop.world.brushOnHold=motion.settings.method!=='dwell';
    if(mode==='hand'){
      motion.bounds=calibration.bounds;motion.aspect=video.videoWidth/video.videoHeight||4/3;session.suspended=false;motion.enable();
      if(!session.active)void session.start();
    }
    audio.startMusic();workshop.start(collected);
  }
  function leaveWorkshop(){
    if(!workshopActive)return;
    workshopActive=false;workshop.stop();motion.disable();motion.useWorld(interaction);game.classList.remove('workshop-mode');
  }
  function beginRound(){
    handsReady.reset();collected.length=0;motion.useWorld(interaction);
    activeSeconds=0;encouragementSchedule.reset();
    mascotDirector.reset();
    mascot.hide();resultMascot.stop();
    interaction.disable();motion.disable();state=createState(countInput.valueAsNumber);countInput.value=String(state.goal);interaction.replaceState(state);interaction.enable();
    running=true;paused=false;preparing=false;session.suspended=false;
    difficulty=element<HTMLSelectElement>('difficulty').value as Difficulty;
    for(const id of ['menu','result','paused','hand-setup'])element(id).hidden=true;
    element('motion-preview').classList.remove('visible');
    element('feedback').classList.remove('visible');
    if(mode==='hand'){motion.bounds=calibration.bounds;motion.aspect=video.videoWidth/video.videoHeight||4/3;motion.enable();}
    audio.startMusic();
    companion.hidden=false;
    spawn(state);render();feedback(mode==='mouse'?'Atığı tut, resmine benzeyen kutuya bırak! ☝':motion.settings.method==='fist'?'Açık elinle yaklaş. Yumruk yapıp yakala, elini açıp bırak!':motion.settings.method==='dwell'?'Elini atığın üstünde beklet. Halka dolunca yakalarsın!':'Önce parmaklarını aç. Atığın üstünde birleştirerek tut!');
  }
  async function start(){
    handsReady.reset();introducing=false;tutorialMascot.hide();resultAdvanceAt=0;leaveWorkshop();
    if(mode==='mouse'){session.stop();if(nextLevel==='workshop')enterWorkshop();else showInstructions();return;}
    interaction.disable();motion.disable();preparing=true;running=false;paused=false;setupResume=false;
    for(const id of ['menu','result','paused'])element(id).hidden=true;
    element('hand-setup').hidden=false;element('motion-preview').classList.add('visible');
    showSetup('Kamerayı hazırlıyoruz…');
    session.engine=motion.settings.method==='fist'?element<HTMLSelectElement>('gesture-engine').value as TrackingEngine:'landmarks';
    if(!await session.start())return;
    if(calibration.stage==='ready'){if(nextLevel==='workshop')enterWorkshop();else showInstructions();return;}
    calibration.start();showSetup();
  }
  function returnToMenu(){
    handsReady.reset();introducing=false;tutorialMascot.hide();resultAdvanceAt=0;nextLevel='sorting';leaveWorkshop();
    audio.stopMusic();
    mascotDirector.stop();
    mascot.hide();resultMascot.stop();
    running=false;paused=false;preparing=false;interaction.disable();motion.disable();session.stop();
    for(const id of ['result','paused','hand-setup'])element(id).hidden=true;
    element('menu').hidden=false;element('motion-preview').classList.remove('visible');render();renderCursors();
  }
  function chooseMode(value:'mouse'|'hand'){
    if(value!==mode){interaction.disable();motion.disable();session.stop();calibration.reset();}
    mode=value;element('choose-mouse').setAttribute('aria-pressed',String(mode==='mouse'));element('choose-hand').setAttribute('aria-pressed',String(mode==='hand'));
    element<HTMLButtonElement>('recalibrate').disabled=mode!=='hand';
    element<HTMLButtonElement>('start').textContent=mode==='mouse'?'Oyuna Başla ▶':'Ellerimle Başla ✋';
  }
  async function setPaused(value:boolean){
    if((!running||state.complete)&&!workshopActive)return;
    if(value){audio.pauseMusic();mascot.stop();workshop.pauseVoice();companion.hidden=true;paused=true;interaction.disable();motion.disable();session.suspended=true;element('paused').hidden=false;render();renderCursors();return;}
    if(mode==='hand'&&!session.active){
      element<HTMLButtonElement>('resume').disabled=true;
      const ready=await session.start();element<HTMLButtonElement>('resume').disabled=false;if(!ready||!(running||workshopActive))return;
    }
    paused=false;session.suspended=false;audio.startMusic();if(!workshopActive)interaction.enable();if(mode==='hand')motion.enable();element('paused').hidden=true;companion.hidden=workshopActive;
  }
  session.onFrame=frame=>{
    if(mode!=='hand')return;
    if(preparing){
      if(calibration.stage==='one'||calibration.stage==='two'||calibration.stage==='reach'){
        calibration.observe(frame.ambiguous?[]:frame.hands.map(hand=>mirrorPoint(motion.settings.method==='fist'?hand.palmCenter:hand.indexTip,true)),frame.timestamp);showSetup();
        const ready=calibration.canFinish;
        const confirmed=handsReady.update(frame,calibration.stage==='reach'&&ready);
        element('setup-ready-status').textContent=handsReady.progress>0?'İki elini gördüm! Topik birazdan anlatacak…':ready?'İki elini göster; oyun otomatik başlayacak.':'Önce ellerini sola, sağa, yukarı ve aşağı uzat.';
        if(confirmed){element<HTMLButtonElement>('setup-finish').click();return;}
      }
      element('setup-hands').textContent=frame.hands.length?`✋ ${frame.hands.length===1?'Bir elini gördük!':'İki elini gördük!'}`:'✋ Ellerini göster';
    }else if((running||workshopActive)&&!paused){
      // Gesture continuity/loss uses result-arrival time. Camera timestamps are
      // retained separately for frame identity and measured pipeline age; mixing
      // them caused fresh but delayed results to be treated as missing hands.
      motion.update(frame,performance.now());
    }
  };
  session.onStatus=(status,message)=>{
    if(mode!=='hand')return;
    if(status==='ready')element('motion-preview').style.aspectRatio=`${video.videoWidth} / ${video.videoHeight}`;
    if(preparing&&(status==='permission'||status==='loading'||status==='error'))showSetup(message);
    if(status==='error'&&!preparing){void setPaused(true);feedback(message);}
    if(status==='stopped'){
      element('motion-metrics').textContent='Kamera kapalı.';
      if(preparing)showSetup('Kamera kapalı. Yeniden başlamak için menüye dön.');
    }
  };
  element('start').onclick=()=>{nextLevel='sorting';void start();};element('again').onclick=()=>{nextLevel='sorting';void start();};
  element('start-workshop').onclick=()=>{nextLevel='workshop';void start();};element('to-workshop').onclick=enterWorkshop;
  element('restart').onclick=()=>{if(workshopActive){workshop.start(collected);return;}if(mode==='hand'&&session.active&&calibration.stage==='ready')showInstructions();else void start();};
  element('home').onclick=returnToMenu;element('setup-cancel').onclick=returnToMenu;
  element('choose-mouse').onclick=()=>chooseMode('mouse');element('choose-hand').onclick=()=>chooseMode('hand');
  function finishHandSetup(){
    if(!preparing||mode!=='hand'||!session.active)return;
    if(!calibration.finish()){showSetup('Biraz daha uzanalım: sola, sağa, yukarı ve aşağı. Sonra yeniden deneyelim.');return;}
    handsReady.reset();
    motion.bounds=calibration.bounds;
    if(setupResume){preparing=false;running=true;paused=false;companion.hidden=false;session.suspended=false;audio.startMusic();interaction.enable();motion.enable();element('hand-setup').hidden=true;element('motion-preview').classList.remove('visible');}
    else if(nextLevel==='workshop')enterWorkshop();
    else showInstructions();
  }
  element('setup-finish').onclick=finishHandSetup;
  element('recalibrate').onclick=async()=>{
    handsReady.reset();
    if(mode!=='hand')return;
    if(workshopActive){leaveWorkshop();nextLevel='workshop';}
    setupResume=running;running=false;paused=false;preparing=true;interaction.disable();motion.disable();
    for(const id of ['menu','result','paused'])element(id).hidden=true;element('hand-setup').hidden=false;element('motion-preview').classList.add('visible');
    calibration.start();session.suspended=false;if(!session.active&&!await session.start())return;showSetup();
  };
  async function changeSettings(){
    interaction.disable();motion.disable();
    const previous=motion.settings.method;
    motion.settings.method=element<HTMLSelectElement>('grab-method').value as GrabMethod;
    motion.settings.dwellGrabMs=Number(element<HTMLSelectElement>('dwell-grab').value);motion.settings.dwellReleaseMs=Number(element<HTMLSelectElement>('dwell-release').value);
    motion.settings.sensitivity=Number(element<HTMLSelectElement>('motion-sensitivity').value);
    const engine=motion.settings.method==='fist'?element<HTMLSelectElement>('gesture-engine').value as TrackingEngine:'landmarks';
    if(session.engine!==engine){session.stop();session.engine=engine;}
    if((previous==='fist')!==(motion.settings.method==='fist')){
      calibration.reset();if(mode==='hand'&&(running||preparing||workshopActive)){element<HTMLButtonElement>('recalibrate').click();return;}
    }
    if((running||workshopActive)&&!paused&&mode==='hand'&&!session.active&&!await session.start())return;
    workshop.world.brushOnHold=motion.settings.method!=='dwell';
    if(running&&!paused){interaction.enable();if(mode==='hand')motion.enable();}
    else if(workshopActive&&!paused&&mode==='hand')motion.enable();
    render();
  }
  for(const id of ['grab-method','dwell-grab','dwell-release','motion-sensitivity','gesture-engine'])element(id).onchange=()=>{void changeSettings();};
  function tuneGestures(){
    interaction.disable();motion.disable();
    motion.thresholds.confirmMs=Number(element<HTMLSelectElement>('fist-confirm').value);
    motion.thresholds.modelEnter=Number(element<HTMLInputElement>('fist-confidence').value);
    motion.thresholds.modelKeep=Math.max(.4,motion.thresholds.modelEnter-.12);
    session.processor.stationaryMs=Number(element<HTMLInputElement>('smooth-still').value);session.processor.fastMs=Number(element<HTMLInputElement>('smooth-fast').value);session.processor.smoothing=element<HTMLInputElement>('smooth-enabled').checked;
    if(running&&!paused){interaction.enable();if(mode==='hand')motion.enable();}
    else if(workshopActive&&!paused&&mode==='hand')motion.enable();
    render();
  }
  for(const id of ['fist-confirm','fist-confidence','smooth-still','smooth-fast','smooth-enabled'])element(id).onchange=tuneGestures;
  element<HTMLInputElement>('gesture-debug').onchange=()=>{element('gesture-details').hidden=!element<HTMLInputElement>('gesture-debug').checked;};
  element('sound').onclick=()=>{audio.muted=!audio.muted;if(audio.muted){mascot.stop();resultMascot.stop();tutorialMascot.stop();if(introducing)introLimit=introSeconds+7;}element('sound').textContent=audio.muted?'♪̸':'♫';element('sound').setAttribute('aria-label',audio.muted?'Sesi aç':'Sesi kapat');element('sound').setAttribute('aria-pressed',String(audio.muted));};
  element('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector<HTMLElement>('.game')!.requestFullscreen();}catch{feedback('Tam ekran açılamadı. Pencereyi büyütebilirsin.');}};
  element('pause').onclick=()=>{void setPaused(!paused);};element('resume').onclick=()=>{void setPaused(false);};
  document.addEventListener('visibilitychange',()=>{if(document.hidden){audio.pauseMusic();mascot.stop();resultMascot.stop();tutorialMascot.stop();void setPaused(true);if(mode==='hand')session.stop();}});
  window.addEventListener('blur',()=>{audio.pauseMusic();mascot.stop();resultMascot.stop();tutorialMascot.stop();void setPaused(true);});
  window.addEventListener('pagehide',()=>{audio.stopMusic();mascot.stop();resultMascot.stop();tutorialMascot.stop();interaction.disable();motion.disable();session.stop();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')void setPaused(!paused);});
  const trackingEntry=document.createElement('div');trackingEntry.className='tracking-entry';
  const trackingButton=document.createElement('button');trackingButton.id='tracking-open';trackingButton.textContent='Yetişkin / Öğretmen · El Takip Testi';
  trackingEntry.append(trackingButton);main.insertBefore(trackingEntry,settings);
  mountTrackingDiagnostics(trackingButton,main,()=>{
    if(preparing){returnToMenu();return;}
    void setPaused(true);motion.disable();session.stop();
  });
  function frame(now:number){
    const dt=(now-previous)/1000;previous=now;session.tick(now);
    if(introducing&&!document.hidden){introSeconds+=Math.max(0,Math.min(dt,.05));if(introSeconds>=introLimit)finishInstructions();}
    if(running&&!paused&&!state.complete){activeSeconds+=Math.max(0,Math.min(dt,.05));motion.tick(now);advance(state,dt,difficulty,interaction.heldIds);mascotDirector.tick(dt,state.objects);render();}
    if(workshopActive&&!paused){motion.tick(now);workshop.tick(now,mode==='hand'?motion.cursors:[]);}
    if(resultAdvanceAt&&now>=resultAdvanceAt&&!element('result').hidden)enterWorkshop();
    renderCursors();
    if(now>messageUntil)element('feedback').classList.remove('visible');
    if(now-lastMetrics>250){
        for(const id of ['gesture-engine','game-delegate','game-inference-width'])element<HTMLSelectElement>(id).disabled=session.active||session.loading;
        if(session.active){
          const values=session.metrics.snapshot(now),pipeline=session.pipeline.snapshot(now);
          const delegate=session.actualDelegate===session.requestedDelegate?session.actualDelegate:`${session.actualDelegate} (${session.requestedDelegate} yerine)`;
          element('motion-metrics').textContent=`${delegate} · Kamera ${values.cameraFps.toFixed(1)} FPS · Çıkarım ${values.inferenceFps.toFixed(1)} FPS · İşlem ${values.latencyMs.toFixed(1)} ms · P95 ${pipeline.p95ModelMs.toFixed(1)} ms · Veri yaşı ${pipeline.landmarkAgeMs?.toFixed(0)??'—'} ms · Atlanan ${pipeline.skippedBusy}`;
        }
      if(element<HTMLInputElement>('gesture-debug').checked){
        element('gesture-details').textContent=JSON.stringify({yaklaşım:session.engine,zamanlama:session.timings,eller:motion.diagnostics.map(d=>({...d,skorTürü:d.measurement.source==='model'?'Gerçek model jest skoru':'Geometri uyumu; olasılık değil'})),sonOlaylar:motion.records.slice(-8)},null,2);
      }
      lastMetrics=now;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
