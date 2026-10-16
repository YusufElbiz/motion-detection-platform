// HUMAN TETRIS SOLO — eklem bazli yeni hedef hareketler.
// Coordinates are displayed in the mirrored camera view, in torso-height units.
// This file deliberately keeps the original data contract; camera, scoring,
// wall animation, renderer and UI are unchanged.
export type Joint = 'head'|'leftShoulder'|'rightShoulder'|'leftElbow'|'rightElbow'|'leftWrist'|'rightWrist'|'leftHip'|'rightHip'|'leftKnee'|'rightKnee'|'leftAnkle'|'rightAnkle';
export type XY = readonly [number,number];
export type Pose = Record<Joint,XY>;
const base:Pose={head:[0,-.92],leftShoulder:[-.32,-.42],rightShoulder:[.32,-.42],leftElbow:[-.50,.02],rightElbow:[.50,.02],leftWrist:[-.50,.50],rightWrist:[.50,.50],leftHip:[-.24,.36],rightHip:[.24,.36],leftKnee:[-.26,.91],rightKnee:[.26,.91],leftAnkle:[-.26,1.49],rightAnkle:[.26,1.49]};
export function pose(overrides:Partial<Pose>={}):Pose{return {...base,...overrides};}

// 1. Referans: tek ayak ustunde, diz karin hizasinda, dirsekler onde.
const kneeGuard=pose({
  leftElbow:[-.02,-.42],leftWrist:[.31,-.44],rightElbow:[.73,-.38],rightWrist:[.43,-.15],
  leftKnee:[-.27,.92],leftAnkle:[-.27,1.47],rightKnee:[.82,.32],rightAnkle:[.67,.68]
});
// 2. Referans: cartwheel/hareketli yan denge hissi; tavsiye edilen 2B guvenli uyarlama.
const sideBalance=pose({
  head:[-.49,-.81],leftShoulder:[-.70,-.39],rightShoulder:[-.10,-.45],leftHip:[-.62,.36],rightHip:[-.18,.36],
  leftElbow:[-.81,.10],leftWrist:[-.86,.57],rightElbow:[-.10,-.94],rightWrist:[-.06,-1.40],
  leftKnee:[-.62,.91],leftAnkle:[-.72,1.46],rightKnee:[.61,.30],rightAnkle:[1.29,.26]
});
// 3. Referans: pistol squat; tek bacak destek, diger bacak ileri uzanir.
const pistol=pose({
  head:[-.07,-.52],leftShoulder:[-.32,-.09],rightShoulder:[.32,-.09],
  leftElbow:[-.58,.16],leftWrist:[-.80,.40],rightElbow:[.67,-.01],rightWrist:[1.08,.11],
  leftHip:[-.24,.50],rightHip:[.24,.50],leftKnee:[-.61,.94],leftAnkle:[-.48,1.43],
  rightKnee:[.72,.66],rightAnkle:[1.37,.62]
});
const pistolReverse=pose({
  head:[.07,-.52],leftShoulder:[-.32,-.09],rightShoulder:[.32,-.09],
  rightElbow:[.58,.16],rightWrist:[.80,.40],leftElbow:[-.67,-.01],leftWrist:[-1.08,.11],
  leftHip:[-.24,.50],rightHip:[.24,.50],rightKnee:[.61,.94],rightAnkle:[.48,1.43],
  leftKnee:[-.72,.66],leftAnkle:[-1.37,.62]
});
const highKick=pose({
  leftElbow:[-.73,-.74],leftWrist:[-.46,-1.17],rightElbow:[.78,-.44],rightWrist:[1.28,-.43],
  leftKnee:[-.22,.96],leftAnkle:[-.22,1.47],rightKnee:[.83,.44],rightAnkle:[1.35,.24]
});
const highKickReverse=pose({
  rightElbow:[.73,-.74],rightWrist:[.46,-1.17],leftElbow:[-.78,-.44],leftWrist:[-1.28,-.43],
  rightKnee:[.22,.96],rightAnkle:[.22,1.47],leftKnee:[-.83,.44],leftAnkle:[-1.35,.24]
});
const ninja=pose({
  leftElbow:[-.60,-.94],leftWrist:[-.36,-1.40],rightElbow:[.80,-.43],rightWrist:[1.27,-.40],
  leftKnee:[-.75,.95],leftAnkle:[-1.08,1.42],rightKnee:[.65,.96],rightAnkle:[.73,1.48]
});
const ninjaReverse=pose({
  rightElbow:[.60,-.94],rightWrist:[.36,-1.40],leftElbow:[-.80,-.43],leftWrist:[-1.27,-.40],
  rightKnee:[.75,.95],rightAnkle:[1.08,1.42],leftKnee:[-.65,.96],leftAnkle:[-.73,1.48]
});
const flamingo=pose({
  leftElbow:[-.74,-.84],leftWrist:[-1.06,-1.22],rightElbow:[.74,-.84],rightWrist:[1.06,-1.22],
  leftKnee:[-.23,.96],leftAnkle:[-.24,1.49],rightKnee:[.82,.69],rightAnkle:[.49,.33]
});
const flamingoReverse=pose({
  leftElbow:[-.74,-.84],leftWrist:[-1.06,-1.22],rightElbow:[.74,-.84],rightWrist:[1.06,-1.22],
  rightKnee:[.23,.96],rightAnkle:[.24,1.49],leftKnee:[-.82,.69],leftAnkle:[-.49,.33]
});
const angular=pose({
  head:[-.12,-.91],leftElbow:[-.86,-.43],leftWrist:[-1.33,-.42],
  rightElbow:[.36,-.91],rightWrist:[.29,-1.40],
  leftKnee:[-.54,.96],leftAnkle:[-.81,1.47],rightKnee:[.56,.92],rightAnkle:[.73,1.49]
});
const angularReverse=pose({
  head:[.12,-.91],rightElbow:[.86,-.43],rightWrist:[1.33,-.42],
  leftElbow:[-.36,-.91],leftWrist:[-.29,-1.40],
  rightKnee:[.54,.96],rightAnkle:[.81,1.47],leftKnee:[-.56,.92],leftAnkle:[-.73,1.49]
});
const sumo=pose({
  head:[0,-.60],leftShoulder:[-.35,-.14],rightShoulder:[.35,-.14],
  leftElbow:[-.82,-.38],leftWrist:[-1.17,-.16],rightElbow:[.82,-.38],rightWrist:[1.17,-.16],
  leftHip:[-.25,.46],rightHip:[.25,.46],leftKnee:[-.91,.85],rightKnee:[.91,.85],
  leftAnkle:[-1.02,1.30],rightAnkle:[1.02,1.30]
});
const archer=pose({
  leftElbow:[-.82,-.44],leftWrist:[-1.30,-.45],rightElbow:[.57,-.83],rightWrist:[.23,-.73],
  leftKnee:[-.72,.87],leftAnkle:[-1.04,1.25],rightKnee:[.37,1.01],rightAnkle:[.43,1.47]
});
const lowBalance=pose({
  head:[.03,-.56],leftShoulder:[-.34,-.12],rightShoulder:[.34,-.12],
  leftElbow:[-.89,-.10],leftWrist:[-1.29,-.08],rightElbow:[.61,-.57],rightWrist:[.78,-.99],
  leftHip:[-.25,.50],rightHip:[.25,.50],leftKnee:[-.78,.96],leftAnkle:[-.90,1.39],
  rightKnee:[.64,.96],rightAnkle:[1.03,1.20]
});
const whirlwind=pose({
  leftElbow:[-.87,-.53],leftWrist:[-1.32,-.80],rightElbow:[.65,-.91],rightWrist:[.51,-1.42],
  leftKnee:[-.57,.96],leftAnkle:[-.83,1.49],rightKnee:[.89,.52],rightAnkle:[1.36,.19]
});

export interface Contact {a:Joint;b:Joint;maxTorso:number;hint:string}
export interface Challenge {name:string;left:Pose;right:Pose;hint:string;level:'EĞLENCELİ'|'ZOR'|'ÇILGIN';contact?:Contact}
// Preserve 16 chapters and the existing interface used by the engine.
export const CHALLENGES:Challenge[]=[
 {name:'DİZ HAVADA',left:kneeGuard,right:kneeGuard,level:'EĞLENCELİ',hint:'Bir dizini öne kaldır, iki kolunu göğüs hizasında bük.'},
 {name:'YANA SAVRULMA',left:sideBalance,right:sideBalance,level:'ZOR',hint:'Bir kolun yukarı, bir kolun aşağı; bacağını yana uzat.'},
 {name:'PİSTOL ÇÖMELME',left:pistol,right:pistol,level:'ÇILGIN',hint:'Destek dizini bük, diğer bacağını öne düz uzat. Dengeni koru.'},
 {name:'TERS PİSTOL',left:pistolReverse,right:pistolReverse,level:'ÇILGIN',hint:'Bu kez diğer bacağını ileri uzat.'},
 {name:'HAVADA TEKME',left:highKick,right:highKick,level:'ÇILGIN',hint:'Bir bacağını yana kaldır; üst kolun yukarıda olsun.'},
 {name:'TERS TEKME',left:highKickReverse,right:highKickReverse,level:'ÇILGIN',hint:'Tekmeni diğer tarafa uzat.'},
 {name:'NİNJA DENGESİ',left:ninja,right:ninja,level:'ZOR',hint:'Bir kol tavanda, diğeri düz yanda; bacaklar açık.'},
 {name:'TERS NİNJA',left:ninjaReverse,right:ninjaReverse,level:'ZOR',hint:'Ninja pozunu ters yönde yap.'},
 {name:'FLAMİNGO',left:flamingo,right:flamingo,level:'ÇILGIN',hint:'Tek ayakta dur, iki kolunu yukarı aç.'},
 {name:'TERS FLAMİNGO',left:flamingoReverse,right:flamingoReverse,level:'ÇILGIN',hint:'Diğer ayak havada, kollar yukarı.'},
 {name:'DİK AÇI',left:angular,right:angular,level:'ZOR',hint:'Bir kol tamamen yana, diğeri dik yukarı.'},
 {name:'TERS DİK AÇI',left:angularReverse,right:angularReverse,level:'ZOR',hint:'Kolların yerini değiştir.'},
 {name:'DERİN SUMO',left:sumo,right:sumo,level:'ÇILGIN',hint:'Dizlerini iki yana aç, kollarını kanat gibi bük.'},
 {name:'DENGE OKÇUSU',left:archer,right:archer,level:'ZOR',hint:'Sol kolu ileri uzat, diğer kolu ok çeker gibi bük.'},
 {name:'ALÇAK DENGE',left:lowBalance,right:lowBalance,level:'ÇILGIN',hint:'Yarı çömel, kollarını farklı açılarda tut.'},
 {name:'FİNAL: KASIRGA',left:whirlwind,right:whirlwind,level:'ÇILGIN',hint:'Bir kol tavana, bir kol yana; bacağın da havada!'}
];
export const LINKS:readonly [Joint,Joint][]=[['leftShoulder','leftElbow'],['leftElbow','leftWrist'],['rightShoulder','rightElbow'],['rightElbow','rightWrist'],['leftHip','leftKnee'],['leftKnee','leftAnkle'],['rightHip','rightKnee'],['rightKnee','rightAnkle']];
export const LANDMARKS:Record<Joint,number>={head:0,leftShoulder:11,rightShoulder:12,leftElbow:13,rightElbow:14,leftWrist:15,rightWrist:16,leftHip:23,rightHip:24,leftKnee:25,rightKnee:26,leftAnkle:27,rightAnkle:28};
