"""Three new voice directions, keeping the selected game voice untouched."""
import ctypes
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.tools/vox'))
from ses_tasarim import ayarlar,motor,tasarla,oku
settings=ayarlar.load(ROOT/'.tools/vox/ayarlar.json')
buffer=ctypes.create_unicode_buffer(32768)
assert ctypes.windll.kernel32.GetShortPathNameW(str(ROOT),buffer,len(buffer))
short_root=buffer.value
aliases=Path(tempfile.mkdtemp(prefix='topik-extra-inputs-'))
def native_path(path):
    path=Path(path)
    if path.is_file():
        alias=aliases/(hashlib.sha256(str(path).encode()).hexdigest()[:20]+path.suffix)
        if not alias.exists():os.link(path,alias)
        return alias
    return Path(str(path).replace(str(ROOT),short_root))
original=motor.run_sequence
def run_ascii(settings,requests,work_dir,progress=None):
    native_settings={key:native_path(value) if isinstance(value,Path) else value for key,value in settings.items()}
    native_requests=[{key:str(native_path(value)) if key in ('audio','voice_ref') else value for key,value in request.items()} for request in requests]
    return original(native_settings,native_requests,native_path(work_dir),progress)
motor.run_sequence=run_ascii

styles=[
 {'number':4,'name':'Topik Masal','label':'Yumuşak masal tonu','prompt':'A young adult Turkish woman with a soft youthful voice and a warm reassuring smile, gentle preschool storyteller, intimate natural conversational delivery, smooth melodic intonation, calm but cheerful, clear native Turkish diction, clean studio recording, no background noise.'},
 {'number':5,'name':'Topik Neseli','label':'Neşeli çizgi film tonu','prompt':'A youthful Turkish male cartoon squirrel, light airy boyish voice, bright curious personality, playful and delighted, natural varied intonation, enthusiastic encouraging delivery without shouting, clear native Turkish diction at a relaxed pace, clean studio recording, no background noise.'},
 {'number':6,'name':'Topik Minik Dost','label':'Oyuncu minik dost tonu','prompt':'An original small cuddly Turkish forest creature with a soft rounded slightly husky voice, youthful gender neutral cartoon character, tender and mischievous, smiling with a little amused chuckle in the tone, expressive natural conversational rhythm, friendly unhurried native Turkish speech, clean studio recording, no background noise.'},
]
design_text='Merhaba, ben Topik, ormanın minik sincap arkadaşıyım, seninle oyun oynamayı ve doğayı korumayı çok seviyorum. Haydi birlikte atıkları ayıralım, her birini doğru kutuya bırakalım, ormandaki hayvanlara yardım edelim ve sonunda kocaman bir sevinçle birbirimize teşekkür edelim!'
audition_text='Merhaba, ben Topik!\nCamlar buraya, yeşil kutuya birlikte atalım!\nHarika gidiyorsun, doğa için bir iyilik daha!\nAtıkları ayırarak yeniden kullanılmalarına yardım ettin.\nTeşekkürler, doğa dostum!'
folder=ROOT/'public/audio/topik/auditions-2';folder.mkdir(parents=True,exist_ok=True)
exports=ROOT/'output/voice-auditions/round-2';exports.mkdir(parents=True,exist_ok=True)
manifest={'engine':'VoxCPM2, patched audio.cpp v0.7.2','steps':16,'cfg':2.0,'synthetic':True,'design_text':design_text,'audition_text':audition_text,'variants':[]}
def progress(done,total,elapsed):
    if int(elapsed)%15<3:print(f'{done}/{total}, {elapsed:.0f}s',flush=True)
for style in styles:
    print(f'Designing voice {style["number"]}: {style["label"]}',flush=True)
    base=settings['sesler']/tasarla.slug(style['name'])
    good=[path.parent for path in sorted(base.glob('cesit_*/ses.json')) if json.loads(path.read_text(encoding='utf-8'))['referans_sn']>=8] if base.exists() else []
    for attempt in range(3):
        if good:break
        tasarla.tasarla(settings,style['name'],style['prompt'],design_text,count=1,progress=progress,dil='tr')
        good=[path.parent for path in sorted(base.glob('cesit_*/ses.json')) if json.loads(path.read_text(encoding='utf-8'))['referans_sn']>=8]
    if not good:raise RuntimeError(f'No complete reference for {style["number"]}')
    voice=good[0];card=json.loads((voice/'ses.json').read_text(encoding='utf-8'))
    out=ROOT/'.tools/topik-output'/f'extra-{style["number"]}'
    summary=oku.oku(settings,voice,audition_text,out,progress)
    target=folder/f'voice-{style["number"]}.mp3'
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(out/'okuma.wav'),'-af','highpass=f=75,lowpass=f=11000,loudnorm=I=-21:TP=-3:LRA=7','-codec:a','libmp3lame','-b:a','128k',str(target)],check=True)
    shutil.copyfile(out/'okuma.wav',exports/f'voice-{style["number"]}.wav')
    (folder/f'voice-{style["number"]}.json').write_text(json.dumps(card,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    manifest['variants'].append({**style,'file':target.name,'seed':card['okuma_tohumu'],'reference_folder':str(voice.relative_to(ROOT)),'duration_seconds':summary['ses_sn'],'speed_gate_warnings':summary['supheli_satirlar'],'sentences':summary['satirlar']})
    print(f'VOICE_{style["number"]}_READY: {summary["ses_sn"]}s, warnings={summary["supheli_satirlar"]}',flush=True)
(folder/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
for alias in aliases.iterdir():
    assert alias.parent==aliases and alias.is_file();alias.unlink()
aliases.rmdir()
print('ALL_NEW_DIRECTIONS_READY',flush=True)
