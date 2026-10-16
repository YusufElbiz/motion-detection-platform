// HUMAN TETRIS DUO — supplied pictures interpreted as two independent 2D pose templates.
// Nothing outside the movement database is changed.
import type {Pose,Joint} from './poses';
const base:Pose={head:[0,-.92],leftShoulder:[-.32,-.42],rightShoulder:[.32,-.42],leftElbow:[-.50,.02],rightElbow:[.50,.02],leftWrist:[-.50,.50],rightWrist:[.50,.50],leftHip:[-.24,.36],rightHip:[.24,.36],leftKnee:[-.26,.91],rightKnee:[.26,.91],leftAnkle:[-.26,1.49],rightAnkle:[.26,1.49]};
export function pose(overrides:Partial<Pose>={}):Pose{return {...base,...overrides};}
function mirror(p:Pose):Pose{
  const r={...p};
  const pair:[Joint,Joint][]=[['leftShoulder','rightShoulder'],['leftElbow','rightElbow'],['leftWrist','rightWrist'],['leftHip','rightHip'],['leftKnee','rightKnee'],['leftAnkle','rightAnkle']];
  r.head=[-p.head[0],p.head[1]];
  for(const [a,b] of pair){r[a]=[-p[b][0],p[b][1]];r[b]=[-p[a][0],p[a][1]];}
  return r;
}
// Referans 4: iki kisi yan yana asker selami (kol bükme açısı kritik).
const salute=pose({
  rightElbow:[.62,-.64],rightWrist:[.17,-.90],leftElbow:[-.45,-.05],leftWrist:[-.47,.45],
  leftKnee:[-.25,.92],rightKnee:[.25,.92],leftAnkle:[-.25,1.47],rightAnkle:[.25,1.47]
});
// Referans 5: bas ustunde eller birlestirilip cati/sevgi kalbi sekli.
const roofLeft=pose({
  leftElbow:[-.49,.01],leftWrist:[-.58,.44],rightElbow:[.83,-.83],rightWrist:[1.53,-1.36],
  leftKnee:[-.42,.86],leftAnkle:[-.62,1.42],rightKnee:[.26,1.02],rightAnkle:[.29,1.45]
});
// Referans 6: iki oyuncu alçakta çömelip ellerini içe uzatiyor.
const bridgeLowLeft=pose({
  head:[.08,-.53],leftShoulder:[-.30,-.07],rightShoulder:[.30,-.07],
  leftElbow:[-.63,.42],leftWrist:[-.94,.89],rightElbow:[.85,.36],rightWrist:[1.53,.64],
  leftHip:[-.26,.51],rightHip:[.26,.51],leftKnee:[-.85,.91],rightKnee:[.66,.92],
  leftAnkle:[-1.05,1.32],rightAnkle:[.72,1.33]
});
// Referans 7: dışa uzanan kol ve bacakla iki kisilik genis T pozu.
const tPoseLeft=pose({
  leftElbow:[-.86,-.42],leftWrist:[-1.45,-.43],rightElbow:[.48,-.12],rightWrist:[.55,.35],
  leftKnee:[-.70,.65],leftAnkle:[-1.42,.62],rightKnee:[.26,.96],rightAnkle:[.26,1.45]
});
// Referans 8: hem tek ayak ustunde durma hem kollarda zit yon.
const dancerLeft=pose({
  leftElbow:[-.75,-.45],leftWrist:[-1.23,-.45],rightElbow:[.42,-.95],rightWrist:[.39,-1.43],
  leftKnee:[-.73,.72],leftAnkle:[-.49,.37],rightKnee:[.26,.98],rightAnkle:[.27,1.48]
});
// Referans 9: bir dis kol yana, diger kol yukari; derin diz bükme.
const asymmetricLeft=pose({
  head:[0,-.66],leftShoulder:[-.35,-.18],rightShoulder:[.35,-.18],
  leftElbow:[-.83,-.19],leftWrist:[-1.40,-.21],rightElbow:[.51,-.85],rightWrist:[.53,-1.43],
  leftHip:[-.25,.45],rightHip:[.25,.45],leftKnee:[-.76,.85],leftAnkle:[-.91,1.32],
  rightKnee:[.66,.85],rightAnkle:[.77,1.32]
});
// Iki kisilik yuksek beslik varyasyonu: ic taraftaki bilekler tepede.
const highFiveLeft=pose({
  leftElbow:[-.81,-.39],leftWrist:[-1.25,-.38],rightElbow:[.88,-.64],rightWrist:[1.50,-1.08],
  leftKnee:[-.52,.95],leftAnkle:[-.69,1.48],rightKnee:[.35,.96],rightAnkle:[.48,1.46]
});
// Finale: kollar orta hatta bir çati, bacaklar ikisi de dışarı açik.
const archLeft=pose({
  head:[-.03,-.78],leftShoulder:[-.34,-.27],rightShoulder:[.34,-.27],
  leftElbow:[-.90,-.46],leftWrist:[-1.36,-.74],rightElbow:[.89,-.92],rightWrist:[1.51,-1.34],
  leftHip:[-.28,.44],rightHip:[.28,.44],leftKnee:[-.88,.84],rightKnee:[.49,.91],
  leftAnkle:[-1.11,1.34],rightAnkle:[.45,1.42]
});
export interface Challenge {name:string;left:Pose;right:Pose;hint:string}
export const DUO_CHALLENGES:Challenge[]=[
 {name:'İKİLİ SELAM',left:salute,right:salute,hint:'İkiniz de aynı anda asker selamı verin; diğer kol aşağıda.'},
 {name:'KALP ÇATISI',left:roofLeft,right:mirror(roofLeft),hint:'İç kollarınızı başınızın üstüne, çatı gibi kaldırın. Dizler hafif kırık.'},
 {name:'ÇÖMELME KÖPRÜSÜ',left:bridgeLowLeft,right:mirror(bridgeLowLeft),hint:'İkiniz de geniş çömelin; iç elleriniz merkezde, dış elleriniz alçakta.'},
 {name:'ÇİFT KANAT',left:tPoseLeft,right:mirror(tPoseLeft),hint:'Dış kollar ve dış bacaklar yanlara doğru uzansın.'},
 {name:'İKİLİ DANS',left:dancerLeft,right:mirror(dancerLeft),hint:'Dış kol yana, iç kol yukarı! Bir ayağınızı dizden kaldırın.'},
 {name:'NİNJA SENKRONU',left:asymmetricLeft,right:mirror(asymmetricLeft),hint:'Dış kol yatay, iç kol dik. Dizleri iki yana bükün.'},
 {name:'YÜKSEK BEŞLİK',left:highFiveLeft,right:mirror(highFiveLeft),hint:'İç elleriniz yukarıda buluşsun; dış kollarınızı yana uzatın.'},
 {name:'FİNAL: KÖPRÜ',left:archLeft,right:mirror(archLeft),hint:'Birlikte kocaman çatı yapın, dış bacaklarınızı açın.'}
];
export const LINKS:readonly [Joint,Joint][]=[['leftShoulder','leftElbow'],['leftElbow','leftWrist'],['rightShoulder','rightElbow'],['rightElbow','rightWrist'],['leftHip','leftKnee'],['leftKnee','leftAnkle'],['rightHip','rightKnee'],['rightKnee','rightAnkle']];
export const LANDMARKS:Record<Joint,number>={head:0,leftShoulder:11,rightShoulder:12,leftElbow:13,rightElbow:14,leftWrist:15,rightWrist:16,leftHip:23,rightHip:24,leftKnee:25,rightKnee:26,leftAnkle:27,rightAnkle:28};
