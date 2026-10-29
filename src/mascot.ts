import {binGuideSpeech} from './mascot-director.ts';
export {squirrelArt} from './squirrel.ts';

export const encouragements=['Harika gidiyorsun! Doğa için bir iyilik daha!','Yaşasın! Birlikte doğayı koruyoruz!','Doğru kutuyu buldun! Böyle devam!'];
export const endingSpeech='Atıkları ayırarak yeniden kullanılmalarına yardım ettin. Enerji tasarrufuna ve doğanın temiz kalmasına katkı sağladın. Teşekkürler, doğa dostum!';
export const greetingSpeech='Merhaba! Ben Topik. Haydi, atıkları ayırıp doğaya yardım edelim!';
export const retrySpeech='Olsun, birlikte tekrar deneyelim! Resmine benzeyen kutuyu bulabilirsin.';
export const tutorialMessages={
 mouse:'Merhaba, ben Topik! Atığı fareyle tut, resmine benzeyen kutuya taşı ve bırak. Haydi, doğayı birlikte temizleyelim!',
 fist:'Merhaba, ben Topik! Açık elinle atığa yaklaş, yumruk yapıp tut. Doğru kutuya taşı, elini açıp bırak. Haydi, doğayı birlikte temizleyelim!',
 pinch:'Merhaba, ben Topik! Atığa yaklaş, başparmağınla işaret parmağını birleştirip tut. Doğru kutuya taşı, parmaklarını açıp bırak. Haydi başlayalım!',
 dwell:'Merhaba, ben Topik! Elini atığın üzerinde biraz bekletip tut. Doğru kutuya taşı ve orada biraz bekleyip bırak. Haydi başlayalım!',
};

const voiceClips=new Map<string,string>([
 [greetingSpeech,'hello'],[retrySpeech,'retry'],[endingSpeech,'ending'],
 ...encouragements.map((line,i):[string,string]=>[line,`cheer-${i+1}`]),
 ...Object.entries(binGuideSpeech).map(([category,line]):[string,string]=>[line,`guide-${category}`]),
 ...Object.entries(tutorialMessages).map(([mode,line]):[string,string]=>[line,`tutorial-${mode}`]),
]);

export class MascotSpeech {
 private lastSpoken=-Infinity;
 private timer?:ReturnType<typeof setTimeout>;
 private audio?:HTMLAudioElement;
 private utterance?:SpeechSynthesisUtterance;
 constructor(private panel:HTMLElement,private text:HTMLElement,private muted:()=>boolean,private onSpeaking:(active:boolean)=>void=()=>{}){}
 say(message:string,force=false,onDone?:()=>void){
  this.text.textContent=message;this.panel.hidden=false;
  this.panel.classList.add('greeting');
  if(this.timer)clearTimeout(this.timer);
  this.timer=setTimeout(()=>this.panel.classList.remove('greeting'),3200);
  if(this.muted()||(!force&&performance.now()-this.lastSpoken<8000))return;
  const clip=voiceClips.get(message);if(!clip){this.speak(message,onDone);return;}
  try{
   this.stopAudio();
   const audio=new Audio(`/audio/topik/voice-3/${clip}.mp3`);audio.preload='auto';audio.volume=.8;this.audio=audio;
   audio.onplaying=()=>{if(this.audio===audio){this.panel.classList.add('speaking');this.onSpeaking(true);}};
   const finish=()=>{if(this.audio===audio){this.panel.classList.remove('speaking');this.onSpeaking(false);}};
   const complete=()=>{if(this.audio===audio){finish();onDone?.();}};
   audio.onended=complete;audio.onerror=complete;audio.onpause=finish;
   this.lastSpoken=performance.now();
   void audio.play().catch(complete);
  }catch{/* The same short speech is always visible as text. */}
 }
 // Lines without a recorded clip (the workshop) use a local Turkish system
 // voice when the browser has one; the bubble text is always shown anyway.
 private speak(message:string,onDone?:()=>void){
  const synth=typeof speechSynthesis==='undefined'?undefined:speechSynthesis;
  const voice=synth?.getVoices().find(v=>v.lang.toLowerCase().startsWith('tr'));
  if(!synth||!voice||typeof SpeechSynthesisUtterance==='undefined'){onDone?.();return;}
  this.stopAudio();
  const utterance=new SpeechSynthesisUtterance(message);utterance.voice=voice;utterance.lang=voice.lang;utterance.pitch=1.4;utterance.rate=.95;utterance.volume=.85;
  this.utterance=utterance;this.lastSpoken=performance.now();
  utterance.onstart=()=>{if(this.utterance===utterance){this.panel.classList.add('speaking');this.onSpeaking(true);}};
  const complete=()=>{if(this.utterance===utterance){this.utterance=undefined;this.panel.classList.remove('speaking');this.onSpeaking(false);onDone?.();}};
  utterance.onend=complete;utterance.onerror=complete;
  synth.speak(utterance);
 }
 private stopAudio(){
  const old=this.audio;this.audio=undefined;if(old){old.pause();old.removeAttribute('src');old.load();}
  if(this.utterance){this.utterance=undefined;speechSynthesis.cancel();}
  this.panel.classList.remove('speaking');this.onSpeaking(false);
 }
 stop(){if(this.timer)clearTimeout(this.timer);this.stopAudio();this.panel.classList.remove('greeting');}
 hide(){this.stop();this.panel.hidden=true;}
}
