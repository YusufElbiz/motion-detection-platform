import {inflateSync} from 'node:zlib';
import fs from 'node:fs';
// Tiny read-only validator for the shipped non-interlaced RGBA8 PNG assets.
export function rgbaPNG(path){
 const buffer=fs.readFileSync(path);if(buffer.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Not PNG: '+path);
 let offset=8,width=0,height=0,end=false;const compressed=[];
 while(offset+12<=buffer.length){const length=buffer.readUInt32BE(offset),type=buffer.toString('ascii',offset+4,offset+8),finish=offset+12+length;if(finish>buffer.length)throw Error('Truncated PNG: '+path);
  if(type==='IHDR'){width=buffer.readUInt32BE(offset+8);height=buffer.readUInt32BE(offset+12);if(buffer[offset+16]!==8||buffer[offset+17]!==6||buffer[offset+20]!==0)throw Error('Expected RGBA8 non-interlaced PNG: '+path);}
  if(type==='IDAT')compressed.push(buffer.subarray(offset+8,offset+8+length));if(type==='IEND'){end=true;offset=finish;break;}offset=finish;
 }
 if(!end||!width||!height)throw Error('Incomplete PNG: '+path);
 const bytes=inflateSync(Buffer.concat(compressed)),stride=width*4;if(bytes.length!==(stride+1)*height)throw Error('Unexpected PNG scanlines: '+path);
 const rgba=new Uint8Array(stride*height),paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
 for(let y=0;y<height;y++){const type=bytes[y*(stride+1)];if(type>4)throw Error('Bad PNG filter: '+path);for(let x=0;x<stride;x++){const i=y*stride+x,left=x>=4?rgba[i-4]:0,up=y?rgba[i-stride]:0,corner=y&&x>=4?rgba[i-stride-4]:0,predict=type===0?0:type===1?left:type===2?up:type===3?Math.floor((left+up)/2):paeth(left,up,corner);rgba[i]=(bytes[y*(stride+1)+x+1]+predict)&255;}}
 return {width,height,rgba};
}
