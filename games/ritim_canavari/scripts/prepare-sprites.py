"""Developer-only atlas slicing. Runtime needs Node only, never Python.

All character artwork comes from supplied/generated PNGs. This script only
cuts and uniformly places their pixels; it does not draw or warp any limb.
"""
from pathlib import Path
import json
from io import BytesIO
import os
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/sprites'
ATLAS = OUT / 'generated-atlases'
SHEETS = {
    'shoulders.png': ['rightShoulder', 'leftShoulder', 'cross'],
    'head-hips.png': ['leftHead', 'rightHead', 'hips'],
    'knees.png': ['bothKnees', 'rightKnee', 'leftKnee'],
    'mixed-clap.png': ['rightHipLeftShoulder', 'leftHipRightShoulder', 'clap'],
}

def save_png(image,path):
    buffer=BytesIO();image.save(buffer,format='PNG',optimize=True)
    data=buffer.getvalue();Image.open(BytesIO(data)).load()
    temporary=path.with_suffix('.png.tmp')
    with open(temporary,'wb') as stream:
        stream.write(data);stream.flush();os.fsync(stream.fileno())
    os.replace(temporary,path)

def place(cell, scale, baseline=1000):
    alpha=np.asarray(cell.getchannel('A'))
    yy,xx=np.where(alpha>128)
    assert len(xx)>1000, 'Empty sprite'
    bottom=int(yy.max())+1
    low=alpha[max(0,bottom-30):bottom]
    row_weights=low.sum(axis=0,dtype=np.float64)
    anchor=float((np.arange(cell.width)*row_weights).sum()/row_weights.sum())
    # One uniform factor; the bending poses retain their lowered heads.
    image=cell.resize((round(cell.width*scale),round(cell.height*scale)),Image.Resampling.LANCZOS)
    frame=Image.new('RGBA',(1024,1024))
    offset=[round(512-anchor*scale),round(baseline-bottom*scale)]
    frame.alpha_composite(image,tuple(offset))
    a=np.asarray(frame.getchannel('A')); ys,xs=np.where(a>64)
    assert xs.min()>15 and xs.max()<1009 and ys.min()>15 and ys.max()<1010, 'Character clipped'
    return frame,{'destination':[offset[0],offset[1],image.width,image.height]}

report={}
runtime={name:{'src':name+'.png','source':[0,0,1024,1024],'destination':[0,0,1024,1024]} for name in ['idle','star-target','clap-source-prepare']}
for filename,moves in SHEETS.items():
    sheet=Image.open(ATLAS/filename).convert('RGBA')
    assert sheet.width%3==0 and sheet.height%2==0
    cw,ch=sheet.width//3,sheet.height//2
    assert cw==ch
    for col,move in enumerate(moves):
        for row,phase in enumerate(['prepare','target']):
            cell=sheet.crop((col*cw,row*ch,(col+1)*cw,(row+1)*ch))
            scale=1.9 if filename!='mixed-clap.png' else 1.78
            frame,placement=place(cell,scale)
            name=f'{move}-{phase}.png'
            save_png(frame,OUT/name)
            report[name]={'atlas':filename,'cell':[col,row],'source_cell_size':cw,'uniform_scale':scale,'frame':[1024,1024]}
            runtime[f'{move}-{phase}']={'src':f'generated-atlases/{filename}','source':[col*cw,row*ch,cw,ch],**placement}

# The supplied original clap preparation remains an actual animation frame.
# Supplied idle and star target frames were extracted without resampling.
star=Image.open(ATLAS/'star-prepare-original.png').convert('RGBA')
a=np.asarray(star.getchannel('A')); y,x=np.where(a>128)
scale=931/(y.max()-y.min()+1)
frame,placement=place(star,scale)
save_png(frame,OUT/'star-prepare.png')
runtime['star-prepare']={'src':'generated-atlases/star-prepare-original.png','source':[0,0,star.width,star.height],**placement}
(OUT/'slicing-report.json').write_text(json.dumps(report,indent=2))
(OUT/'runtime-frames.json').write_text(json.dumps(runtime,indent=2))
print(f'Prepared {len(report)+1} PNG animation frames; no character redrawing or nonuniform scaling.')
