import {copyFile,mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const source='node_modules/@mediapipe/tasks-vision';
const target='public/tracking';
const pinnedModelSha256='fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1';
if(createHash('sha256').update(await readFile(`${target}/hand_landmarker.task`)).digest('hex')!==pinnedModelSha256)throw new Error('Bundled model differs from the reviewed float16/1 asset; inspect source/license before updating.');
if(createHash('sha256').update(await readFile(`${target}/gesture_recognizer.task`)).digest('hex')!=='97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482')throw new Error('Gesture model differs from reviewed float16/1 bytes.');
await mkdir(`${target}/wasm`,{recursive:true});
await copyFile(`${source}/vision_bundle.js`,`${target}/vision_bundle.js`);
await copyFile(`${source}/package.json`,`${target}/sdk-package.json`);
await copyFile('THIRD_PARTY_NOTICES.md',`${target}/ATTRIBUTION.md`);
// Classic worker uses SIMD and non-SIMD loaders, not the unused ES module build.
for(const name of ['vision_wasm_internal.js','vision_wasm_internal.wasm','vision_wasm_nosimd_internal.js','vision_wasm_nosimd_internal.wasm'])await copyFile(`${source}/wasm/${name}`,`${target}/wasm/${name}`);
const files=['hand_landmarker.task','gesture_recognizer.task','vision_bundle.js','inference-worker.js','LICENSE.mediapipe.txt','sdk-package.json','ATTRIBUTION.md',...(await readdir(`${target}/wasm`)).map(name=>`wasm/${name}`)];
const manifest={sdk:JSON.parse(await readFile(`${source}/package.json`,'utf8')).version,model:'hand_landmarker/hand_landmarker/float16/1',modelSource:'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',files:[]};
manifest.gestureModel='gesture_recognizer/gesture_recognizer/float16/1';
manifest.gestureModelSource='https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';
for(const file of files){const data=await readFile(`${target}/${file}`);manifest.files.push({file,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});}
await writeFile(`${target}/asset-manifest.json`,JSON.stringify(manifest,null,2)+'\n');
console.log(`Prepared ${files.length} local inference assets; SDK ${manifest.sdk}. No network required.`);
