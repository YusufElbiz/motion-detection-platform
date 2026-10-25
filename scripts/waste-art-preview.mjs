import {writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {wasteCatalog} from '../src/waste.ts';
import {wasteArt} from '../src/art.ts';
import {categories} from '../src/config.ts';
const html=`<!doctype html><html lang="tr"><meta charset="utf-8"><title>Atık görselleri</title><style>body{font:16px Segoe UI,sans-serif;background:#f3f7ec;color:#355d46;margin:35px}h1{margin-bottom:8px}p{color:#73846c}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}.card{background:#fffdf3;border:2px solid white;border-radius:20px;padding:18px;text-align:center}.card svg{display:block;width:130px;height:130px;margin:auto}.card b{display:block;margin-top:8px}.card small{display:inline-block;padding:4px 12px;border-radius:20px;background:var(--color);margin-top:8px}</style><h1>16 farklı atık · 4 malzeme</h1><p>Özgün SVG çizimleri · Oyunda görseller ve düşme konumları karışık seçilir.</p><div class="grid">${wasteCatalog.map(item=>`<div class="card" style="--color:${categories[item.category].color}">${wasteArt(item.category,item.id)}<b>${item.name}</b><small>${categories[item.category].label}</small></div>`).join('')}</div></html>`;
await mkdir('docs/screenshots',{recursive:true});await writeFile('docs/waste-catalog.html',html);
const browser=await chromium.launch({channel:'chrome',headless:true});
try{const page=await browser.newPage({viewport:{width:1200,height:1100}});await page.setContent(html);await page.screenshot({path:'docs/screenshots/waste-catalog.png',fullPage:true});console.log('Rendered 16 local SVG waste illustrations: docs/waste-catalog.html and docs/screenshots/waste-catalog.png');}finally{await browser.close();}
