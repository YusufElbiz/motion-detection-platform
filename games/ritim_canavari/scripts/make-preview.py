"""Optional developer tool: composite the SAME runtime PNG frames into a GIF."""
from pathlib import Path
from io import BytesIO
from PIL import Image,ImageDraw,ImageFont,ImageOps

root=Path(__file__).resolve().parents[1]
selected=[('clap','Alkış','İki avucunu göğsünün önünde birleştir.'),('rightShoulder','Sağ el → sol omuz','Sağ elinle sol omzuna dokun.'),('leftShoulder','Sol el → sağ omuz','Sol elinle sağ omzuna dokun.'),('rightKnee','Sağ el → sol diz','Yalnızca sağ elin karşı dize gider.'),('leftKnee','Sol el → sağ diz','Yalnızca sol elin karşı dize gider.'),('rightHipLeftShoulder','Bel ve karşı omuz','Sağ el belde, sol el sağ omuzda.')]
font_path='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
large=ImageFont.truetype(font_path,25);small=ImageFont.truetype(font_path,16);tiny=ImageFont.truetype(font_path,13)
frames=[];durations=[]
for move,title,description in selected:
 prepare='clap-source-prepare' if move=='clap' else f'{move}-prepare'
 for key,phase,duration in [('idle','BAŞLANGIÇ',180),(prepare,'HAREKETE GEÇİŞ',320),(f'{move}-target','HEDEF POZ · TUT',1000),(prepare,'DÖNÜŞ',320),('idle','BAŞLANGIÇ',180)]:
  frame=Image.new('RGB',(640,800),'#f8f4eb');draw=ImageDraw.Draw(frame)
  draw.rounded_rectangle((18,18,622,782),radius=24,fill='#edf1fb',outline='#ded4e8',width=2)
  draw.text((320,42),'RİTİM CANAVARI · PNG ANİMASYON',font=tiny,fill='#a37d45',anchor='mm')
  draw.text((320,77),title,font=large,fill='#55416d',anchor='mm')
  image=ImageOps.mirror(Image.open(root/f'public/sprites/{key}.png').convert('RGBA'))
  image=image.resize((590,590),Image.Resampling.LANCZOS);frame.paste(image,(25,104),image)
  draw.text((320,711),phase,font=small,fill='#9a77bc',anchor='mm')
  draw.text((320,744),description,font=small,fill='#6b5c79',anchor='mm')
  draw.text((320,766),'Oyunda kullanılan kareler · ayna yönü',font=tiny,fill='#978a9e',anchor='mm')
  frames.append(frame.quantize(colors=256));durations.append(duration)
out=root/'docs/previews/Ritim-Animasyon-Onizleme.gif';buffer=BytesIO();frames[0].save(buffer,format='GIF',save_all=True,append_images=frames[1:],duration=durations,loop=0,optimize=False)
out.write_bytes(buffer.getvalue());check=Image.open(out);assert check.n_frames>=24
print(out,check.n_frames,'frames',out.stat().st_size,'bytes')
