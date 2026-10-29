"""Local-only synthesis. Requires the approved VoxCPM2 preparation install."""
import json
import ctypes
import hashlib
import os
import tempfile
import subprocess
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
VOX=ROOT/'.tools'/'vox'
sys.path.insert(0,str(VOX))
from ses_tasarim import ayarlar, motor, tasarla, oku

# The native engine uses narrow Windows file APIs. Use NTFS's existing ASCII
# alias only at its boundary; no drives, junctions or system settings are added.
buffer=ctypes.create_unicode_buffer(32768)
assert ctypes.windll.kernel32.GetShortPathNameW(str(ROOT),buffer,len(buffer))
SHORT_ROOT=buffer.value
# The GGUF loader expands NTFS short names again. Temporary hard links give
# that narrow API an ASCII filename, without copying the 3 GB model bytes.
INPUT_ALIASES=Path(tempfile.mkdtemp(prefix='topik-voice-inputs-'))
print('Temporary input aliases:',INPUT_ALIASES,flush=True)
def cli_path(path):
    return Path(str(path).replace(str(ROOT),SHORT_ROOT))
def input_alias(path):
    path=Path(path)
    if not path.is_file():return cli_path(path)
    name=hashlib.sha256(str(path).encode()).hexdigest()[:20]+path.suffix
    alias=INPUT_ALIASES/name
    if not alias.exists():os.link(path,alias)
    return alias
original_run=motor.run_sequence
def run_ascii(settings,requests,work_dir,progress=None):
    native_settings={key:(input_alias(value) if key=='model' else cli_path(value)) if isinstance(value,Path) else value for key,value in settings.items()}
    native_requests=[{key:str(input_alias(value)) if key in ('audio','voice_ref') else value for key,value in request.items()} for request in requests]
    return original_run(native_settings,native_requests,cli_path(work_dir),progress)
motor.run_sequence=run_ascii

settings=ayarlar.load(VOX/'ayarlar.json')
print(motor.list_devices(settings),flush=True)
voices=oku.list_voices(settings)
assert len(voices['hazir'])==14, 'Bundled voices incomplete'
print('BUNDLED_VOICES_OK: 14',flush=True)

def progress(done,total,elapsed):
    if int(elapsed)%15<3: print(f'Progress {done}/{total}, {elapsed:.0f}s',flush=True)

smoke=ROOT/'.tools'/'topik-output'/'smoke'
oku.oku(settings,VOX/'hazir_sesler'/'belgesel_hanim','Merhaba, bu bir deneme okumasıdır.',smoke,progress)
print('SMOKE_OK',flush=True)

description=(ROOT/'.tools'/'topik-voice-prompt.txt').read_text(encoding='utf-8').strip()
design_text=(ROOT/'.tools'/'topik-design-text.txt').read_text(encoding='utf-8').strip()
audition_text=(ROOT/'.tools'/'topik-audition-text.txt').read_text(encoding='utf-8').strip()
name='Topik Sincap'
base=settings['sesler']/tasarla.slug(name)
existing=sorted(base.glob('cesit_*/ses.json')) if base.exists() else []
good=[p.parent for p in existing if json.loads(p.read_text(encoding='utf-8'))['referans_sn']>=motor.MIN_REFERENCE_SECONDS]
for attempt in range(3):
    if len(good)>=3:break
    result=tasarla.tasarla(settings,name,description,design_text,count=3-len(good),progress=progress,dil='tr')
    print(json.dumps(result,ensure_ascii=False),flush=True)
    good=[p.parent for p in sorted(base.glob('cesit_*/ses.json')) if json.loads(p.read_text(encoding='utf-8'))['referans_sn']>=motor.MIN_REFERENCE_SECONDS]
if len(good)<3:raise RuntimeError('Could not obtain three complete references')

folder=ROOT/'public'/'audio'/'topik'/'auditions'
folder.mkdir(parents=True,exist_ok=True)
manifest={'engine':'VoxCPM2, patched audio.cpp v0.7.2','steps':16,'cfg':2.0,'synthetic':True,'prompt':description,'design_text':design_text,'audition_text':audition_text,'variants':[]}
for index,voice_dir in enumerate(good[:3],1):
    out=ROOT/'.tools'/'topik-output'/f'audition-{index}'
    summary=oku.oku(settings,voice_dir,audition_text,out,progress)
    if summary['supheli_satirlar']:print('SPEED_GATE_WARNING',index,summary['supheli_satirlar'],flush=True)
    target=folder/f'voice-{index}.mp3'
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(out/'okuma.wav'),'-af','loudnorm=I=-18:TP=-2:LRA=7','-codec:a','libmp3lame','-b:a','128k',str(target)],check=True)
    card=json.loads((voice_dir/'ses.json').read_text(encoding='utf-8'))
    (folder/f'voice-{index}.json').write_text(json.dumps(card,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    manifest['variants'].append({'number':index,'file':target.name,'seed':card['okuma_tohumu'],'reference_folder':str(voice_dir.relative_to(ROOT)), 'duration_seconds':summary['ses_sn'],'speed_gate_warnings':summary['supheli_satirlar'],'sentences':summary['satirlar']})
    print(f'AUDITION_{index}_OK: {summary["ses_sn"]} seconds',flush=True)
(folder/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('ALL_THREE_AUDITIONS_READY',flush=True)
for alias in INPUT_ALIASES.iterdir():
    assert alias.parent==INPUT_ALIASES and alias.is_file()
    alias.unlink()
INPUT_ALIASES.rmdir()
