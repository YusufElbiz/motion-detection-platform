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

// Other scenes add their own recorded lines (clip name → text).
export function registerVoiceClips(lines:Record<string,string>){for(const [clip,line] of Object.entries(lines))voiceClips.set(line,clip);}
// A longer message is spoken as consecutive recorded lines, e.g. a welcome
// followed by the first instruction.
function clipsFor(message:string):string[]|undefined {
 const exact=voiceClips.get(message);if(exact)return [exact];
 const clips:string[]=[];let rest=message.trim();
 while(rest){
  const line=[...voiceClips.keys()].filter(known=>rest.startsWith(known)).sort((a,b)=>b.length-a.length)[0];
  if(!line)return;clips.push(voiceClips.get(line)!);rest=rest.slice(line.length).trim();
 }
 return clips.length?clips:undefined;
}
export class MascotSpeech {
 private lastSpoken=-Infinity;
 private timer?:ReturnType<typeof setTimeout>;
 private audio?:HTMLAudioElement;
 constructor(private panel:HTMLElement,private text:HTMLElement,private muted:()=>boolean,private onSpeaking:(active:boolean)=>void=()=>{}){}
 say(message:string,force=false,onDone?:()=>void){
  this.text.textContent=message;this.panel.hidden=false;
  this.panel.classList.add('greeting');
  if(this.timer)clearTimeout(this.timer);
  this.timer=setTimeout(()=>this.panel.classList.remove('greeting'),3200);
  if(this.muted()||(!force&&performance.now()-this.lastSpoken<8000))return;
  // Only Topik's recorded voice is used; an unrecorded line stays text-only.
  const clips=clipsFor(message);if(!clips)return;
  this.stopAudio();this.lastSpoken=performance.now();this.play(clips,0,onDone);
 }
 private play(clips:string[],index:number,onDone?:()=>void){
  try{
   const audio=new Audio(`/audio/topik/voice-3/${clips[index]}.mp3`);audio.preload='auto';audio.volume=.8;this.audio=audio;
   audio.onplaying=()=>{if(this.audio===audio){this.panel.classList.add('speaking');this.onSpeaking(true);}};
   const finish=()=>{if(this.audio===audio){this.panel.classList.remove('speaking');this.onSpeaking(false);}};
   const complete=()=>{if(this.audio!==audio)return;if(index+1<clips.length){this.play(clips,index+1,onDone);return;}finish();onDone?.();};
   audio.onended=complete;audio.onerror=complete;audio.onpause=()=>{if(!audio.ended)finish();};
   void audio.play().catch(complete);
  }catch{/* The same short speech is always visible as text. */}
 }
 private stopAudio(){
  const old=this.audio;this.audio=undefined;if(old){old.pause();old.removeAttribute('src');old.load();}
  this.panel.classList.remove('speaking');this.onSpeaking(false);
 }
 stop(){if(this.timer)clearTimeout(this.timer);this.stopAudio();this.panel.classList.remove('greeting');}
 hide(){this.stop();this.panel.hidden=true;}
}
