import {recipes,paintColors} from './recipes.ts';

// Everything Topik says in the workshop. Each line has a recorded clip in the
// same voice as the first level (public/audio/topik/voice-3/ws-*.mp3), made by
// scripts/generate-selected-topik.py --workshop. Keep this module free of DOM
// and CSS imports: the generator reads it through Node.
export const workshopSpeech={
  welcome:'Atölyeye hoş geldin! Topladığın atıklarla yeni şeyler yapalım.',
  another:'Süper! Şimdi diğerini de tezgaha getir.',
  wrong:'Bu sefer onu kullanmayacağız. Parlayan malzemelerden birini al!',
  readyHand:'İkisi de tezgahta! Sihirli düğmeye yumruk yap, birleştirelim!',
  readyMouse:'İkisi de tezgahta! Sihirli düğmeye dokun, birleştirelim!',
  paintHand:'Boyayı başparmağın ve işaret parmağınla tut. Boyamak istediğin yere götür, parmaklarını aç!',
  paintMouse:'Boyayı tut, boyamak istediğin yere sürükle ve bırak!',
  paintDwell:'Bir boyanın üstünde bekle, sonra boyamak istediğin yerde bekle!',
  needColor:'Önce bir boya kutusu seç!',
  colorful:'Rengârenk oldu! Bitirince Bitti düğmesine dokun.',
  gallery:'Bak ne güzel şeyler yaptık! Atıklar çöp değil, yeniden hayat buldu. Teşekkürler, küçük mucit!',
};
export const colorSpeech=(colorId:string)=>`${paintColors.find(c=>c.id===colorId)?.name??''} seçtin!`;

// Clip name → line. Longer messages are spoken as a sequence of these clips.
export const workshopVoiceLines:Record<string,string>={
  ...Object.fromEntries(Object.entries(workshopSpeech).map(([key,line])=>[`ws-${key}`,line])),
  ...Object.fromEntries(recipes.flatMap(r=>[[`ws-${r.id}-gather`,r.gather],[`ws-${r.id}-crafted`,r.crafted],[`ws-${r.id}-finished`,r.finished]])),
  ...Object.fromEntries(paintColors.map(c=>[`ws-color-${c.id}`,colorSpeech(c.id)])),
};
