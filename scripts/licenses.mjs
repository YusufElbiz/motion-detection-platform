import {readdir,readFile,mkdir,writeFile} from 'node:fs/promises';
const packages=[];
const notices=[];
async function inspect(path){
 for(const entry of await readdir(path,{withFileTypes:true})){
  if(!entry.isDirectory() || entry.name.startsWith('.'))continue;
  const folder=`${path}/${entry.name}`;
  if(entry.name.startsWith('@')){await inspect(folder);continue;}
  try{const p=JSON.parse(await readFile(`${folder}/package.json`,'utf8'));packages.push({name:p.name,version:p.version,license:p.license??'UNDECLARED'});
   for(const file of await readdir(folder))if(/license|notice|copying/i.test(file)){
    try{notices.push(`## ${p.name} ${p.version} — ${file}\n\n${await readFile(`${folder}/${file}`,'utf8')}\n`);}catch{}
   }
  }catch{}
  try{await inspect(`${folder}/node_modules`);}catch{}
 }
}
await inspect('node_modules');
await mkdir('docs',{recursive:true});
await writeFile('docs/dependency-licenses.json',JSON.stringify(packages.sort((a,b)=>a.name.localeCompare(b.name)),null,2)+'\n');
await writeFile('docs/THIRD_PARTY_LICENSES.txt',notices.join('\n\n'));
console.log(`${packages.length} installed package license declarations inventoried.`);
const concerns=packages.filter(p=>typeof p.license!=='string'||!/^(MIT|Apache-2.0|BSD-2-Clause|BSD-3-Clause|ISC|0BSD|CC0-1.0|\(MIT OR CC0-1.0\))$/.test(p.license));
console.log('Declarations requiring review:',JSON.stringify(concerns));
