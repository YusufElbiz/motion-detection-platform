"""Build-time only: generate local MP3s, never called by the game."""
import asyncio
import argparse
import ast
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.tools' / 'voice'))
import edge_tts

async def main():
    parser=argparse.ArgumentParser();parser.add_argument('--only-guides',action='store_true');args=parser.parse_args()
    source = (ROOT / 'src' / 'mascot.ts').read_text(encoding='utf-8')
    value = lambda name: ast.literal_eval(re.search(r'export const ' + name + r'=(.*?);', source).group(1))
    lines = {'hello': value('greetingSpeech'), 'retry': value('retrySpeech'), 'ending': value('endingSpeech')}
    lines.update({f'cheer-{i+1}': text for i, text in enumerate(value('encouragements'))})
    director = (ROOT / 'src' / 'mascot-director.ts').read_text(encoding='utf-8')
    guide_block = re.search(r'export const binGuideSpeech:Record<Category,string>=\{(.*?)\};',director,re.S).group(1)
    lines.update({f'guide-{name}': text for name,text in re.findall(r"(plastic|paper|glass|metal):'([^']+)'",guide_block)})
    folder = ROOT / 'public' / 'audio' / 'topik'
    folder.mkdir(parents=True, exist_ok=True)
    for name, text in lines.items():
        if args.only_guides and not name.startswith('guide-'):
            continue
        path = folder / f'{name}.mp3'
        await edge_tts.Communicate(text, 'tr-TR-EmelNeural', rate='+8%', pitch='+24Hz', volume='-8%').save(str(path))
        if path.stat().st_size < 1000:
            raise RuntimeError(f'Invalid audio: {name}')
        print(f'Generated {name}.mp3 ({path.stat().st_size} bytes)', flush=True)
    (folder / 'manifest.json').write_text(json.dumps({'engine': 'edge-tts 7.3.1', 'voice': 'tr-TR-EmelNeural', 'rate': '+8%', 'pitch': '+24Hz', 'volume': '-8%', 'lines': lines}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

asyncio.run(main())
