import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';import ts from 'typescript';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const target=path.join(root,'.test-build');fs.rmSync(target,{recursive:true,force:true});fs.mkdirSync(path.join(target,'game'),{recursive:true});fs.writeFileSync(path.join(target,'package.json'),'{"type":"module"}');
for(const file of ['moves','engine','sprites','presentation']){
 let js=ts.transpileModule(fs.readFileSync(path.join(root,`src/game/${file}.ts`),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
 js=js.replace(/from '(\.\/[^']+)'/g,(_,src)=>`from '${src}.js'`);
 fs.writeFileSync(path.join(target,`game/${file}.js`),js);
}
const r=spawnSync(process.execPath,['--test','tests/game.test.mjs','tests/sprites.test.mjs'],{cwd:root,stdio:'inherit'});process.exit(r.status??1);
