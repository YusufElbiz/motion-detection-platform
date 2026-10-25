import {readFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const manifest=JSON.parse(await readFile('public/tracking/asset-manifest.json','utf8'));
for(const file of manifest.files){const data=await readFile(`dist/tracking/${file.file}`);assert.equal(data.length,file.bytes,file.file);assert.equal(createHash('sha256').update(data).digest('hex'),file.sha256,file.file);}
await access('dist/tracking/inference-worker.js');
const worker=await readFile('dist/tracking/inference-worker.js','utf8');assert.ok(worker.includes("runningMode:'VIDEO'"));
console.log(`PASS: ${manifest.files.length} production model/runtime/license assets match SHA-256 manifest; local worker included.`);
