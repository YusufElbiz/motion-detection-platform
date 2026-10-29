"""Produce all game lines using the user-selected third synthetic voice."""
import ctypes
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.tools/vox'))
from ses_tasarim import ayarlar,motor

settings=ayarlar.load(ROOT/'.tools/vox/ayarlar.json')
card_path=ROOT/'.tools/vox/sesler/topik_sincap/cesit_03/ses.json'
card=json.loads(card_path.read_text(encoding='utf-8'))
assert card['okuma_tohumu']==3637895427 and card['cesit']==3
parser=argparse.ArgumentParser();parser.add_argument('--tutorials',action='store_true');parser.add_argument('--workshop',action='store_true');args=parser.parse_args()
if args.workshop:
    # Workshop lines live in TypeScript; Node prints them as JSON.
    code="import('./src/workshop/speech.ts').then(m=>process.stdout.write(JSON.stringify(m.workshopVoiceLines)))"
    lines=json.loads(subprocess.run(['node','--experimental-strip-types','--no-warnings','-e',code],cwd=ROOT,capture_output=True,text=True,encoding='utf-8',check=True).stdout)
    assert lines and all(name.startswith('ws-') for name in lines)
elif args.tutorials:
    source=(ROOT/'src/mascot.ts').read_text(encoding='utf-8')
    block=re.search(r'export const tutorialMessages=\{(.*?)\};',source,re.S).group(1)
    lines={f'tutorial-{mode}':text for mode,text in re.findall(r"(mouse|fist|pinch|dwell):'([^']+)'",block)}
    assert len(lines)==4
else:
    lines=json.loads((ROOT/'public/audio/topik/manifest.json').read_text(encoding='utf-8'))['lines']
buffer=ctypes.create_unicode_buffer(32768)
assert ctypes.windll.kernel32.GetShortPathNameW(str(ROOT),buffer,len(buffer))
short_root=buffer.value
aliases=Path(tempfile.mkdtemp(prefix='topik-selected-inputs-'))
def native_path(path):
    path=Path(path)
    if path.is_file():
        link=aliases/(hashlib.sha256(str(path).encode()).hexdigest()[:20]+path.suffix)
        if not link.exists():os.link(path,link)
        return link
    return Path(str(path).replace(str(ROOT),short_root))
native_settings={key:native_path(value) if isinstance(value,Path) else value for key,value in settings.items()}
reference=native_path(card_path.parent/card['referans'])
requests=[];groups={}
for name,text in lines.items():
    groups[name]=[]
    for index,sentence in enumerate(re.split(r'(?<=[.!?])\s+',text.strip()),1):
        request_id=f'{name}-{index}';groups[name].append(request_id)
        requests.append(motor.read_request(request_id,sentence,card['okuma_tohumu'],reference,card['ses_yaratilirken_okutulan_metin']))
work=ROOT/'.tools/topik-output'/('workshop-3' if args.workshop else 'tutorials-3' if args.tutorials else 'selected-3')
def progress(done,total,elapsed):
    if int(elapsed)%15<3:print(f'{done}/{total} sentences, {elapsed:.0f}s',flush=True)
print(f'Generating {len(requests)} sentences with fixed voice 3 / seed {card["okuma_tohumu"]}',flush=True)
result=motor.run_sequence(native_settings,requests,native_path(work),progress)
if result['bad']:raise RuntimeError(f'Incomplete sentences: {result["bad"]}')
folder=ROOT/'public/audio/topik/voice-3';folder.mkdir(parents=True,exist_ok=True)
filters='highpass=f=75,lowpass=f=11000,equalizer=f=2800:t=q:w=1:g=1.5,loudnorm=I=-21:TP=-3:LRA=7'
for name,ids in groups.items():
    waveform=motor.join_lines([result['audios'][i] for i in ids],[.16]*len(ids))
    wav=work/f'{name}.wav';motor.write_wav(wav,waveform)
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-af',filters,'-codec:a','libmp3lame','-b:a','128k',str(folder/f'{name}.mp3')],check=True)
    print(f'{name}: {len(waveform)/48000:.2f}s',flush=True)
manifest={'engine':'VoxCPM2, patched audio.cpp v0.7.2','voice':'Topik Sincap variant 3','selected_variant':3,'seed':card['okuma_tohumu'],'steps':16,'cfg':2.0,'synthetic':True,'filters':filters,'loudness_lufs':-21,'pitch_shift':False,'lines':lines,'durations_seconds':{name:round(sum(len(result['audios'][i])/48000 for i in ids)+max(0,len(ids)-1)*.16,3) for name,ids in groups.items()}}
(folder/('workshop-manifest.json' if args.workshop else 'tutorials-manifest.json' if args.tutorials else 'manifest.json')).write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
for link in aliases.iterdir():
    assert link.parent==aliases and link.is_file();link.unlink()
aliases.rmdir()
print('SELECTED_VOICE_3_READY',flush=True)
