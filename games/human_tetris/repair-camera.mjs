import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// 0.10.32's debug fallback declares a function inside an if block. In an ES
// module that binding is block-scoped, so the following call throws. Keep the
// logger function-scoped and use Module options instead of a free identifier.
const broken='function custom_emscripten_dbgn(str,len){if(typeof dbg!=="undefined"){dbg(UTF8ToString(str,len))}else{if(typeof custom_dbg==="undefined"){function custom_dbg(text){console.warn.apply(console,arguments)}}custom_dbg(UTF8ToString(str,len))}}';
const fixed='function custom_emscripten_dbgn(str,len){var logger=Module["custom_dbg"]||Module["printErr"];if(typeof logger!=="function")logger=console.warn.bind(console);logger(UTF8ToString(str,len))}';
const root=path.dirname(fileURLToPath(import.meta.url));
for(const name of ['vision_wasm_internal.js','vision_wasm_nosimd_internal.js']){
  const file=path.join(root,'public/vendor',name),source=fs.readFileSync(file,'utf8');
  if(source.includes(fixed)){console.log(name+': already patched');continue;}
  if(!source.includes(broken))throw new Error(name+': unexpected upstream loader; inspect before patching');
  fs.writeFileSync(file,source.replace(broken,fixed));console.log(name+': ESM debug callback fixed');
}
