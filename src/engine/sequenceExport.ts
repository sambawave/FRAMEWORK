import type {Project} from '../types';
import {fps,projectEnd} from '../types';
import {drawComposition} from './compositor';
import {prepareThree} from './threeScene';
import {isActive,sourceTime} from './timeline';
import {ensureProjectFonts} from '../fonts/fontLibrary';

/** Store-only ZIP writer. Compatible with standard unzip tools, zero external dependencies. */
const crcTable=Array.from({length:256},(_,n)=>{let x=n;for(let k=0;k<8;k++)x=x&1?0xedb88320^(x>>>1):x>>>1;return x>>>0});
export function crc32(bytes:Uint8Array){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0}
const u16=(n:number)=>[n&255,(n>>>8)&255],u32=(n:number)=>[n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255];
export function zipStored(files:{name:string;bytes:Uint8Array}[]){const local:BlobPart[]=[],central:BlobPart[]=[];let offset=0;for(const {name,bytes} of files){const filename=new TextEncoder().encode(name),crc=crc32(bytes),size=bytes.length;
 const head=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(size),...u32(size),...u16(filename.length),...u16(0)]);
 local.push(head,filename,bytes.slice());central.push(new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(size),...u32(size),...u16(filename.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset)]),filename);offset+=head.length+filename.length+size;
 }const centralLength=central.reduce((n,b)=>n+(b as Uint8Array).byteLength,0);const count=files.length;if(count>65535)throw Error('Too many frames for ZIP format');return new Blob([...local,...central,new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(count),...u16(count),...u32(centralLength),...u32(offset),...u16(0)])],{type:'application/zip'})}
/** GIF89a encoder. Real image frames, 256-color RGB332 palette and LZW compression.
 * GIF has no audio or alpha channel; requested frame durations are quantized to centiseconds. */
function gifPalette(){const out=new Uint8Array(768);for(let i=0;i<256;i++){out[i*3]=Math.round((i>>5)*255/7);out[i*3+1]=Math.round(((i>>2)&7)*255/7);out[i*3+2]=Math.round((i&3)*255/3)}return out}
function gifQuantize(rgba:Uint8ClampedArray){const indices=new Uint8Array(rgba.length/4);for(let i=0,j=0;i<rgba.length;i+=4,j++){// GIF has no alpha: composite transparent pixels against the composition background.
 const a=rgba[i+3]/255;const r=Math.round(rgba[i]*a),g=Math.round(rgba[i+1]*a),b=Math.round(rgba[i+2]*a);
 indices[j]=((r>>5)<<5)|((g>>5)<<2)|(b>>6)}return indices}
function gifLzw(data:Uint8Array){const output:number[]=[];let current=0,used=0;
 const emit=(code:number,bits:number)=>{current|=code<<used;used+=bits;while(used>=8){output.push(current&255);current>>>=8;used-=8}};
 const dict=new Map<number,number>();let codeSize=9,next=258;
 emit(256,codeSize);let prefix=data[0]??0;
 for(let i=1;i<data.length;i++){
  const value=data[i],key=(prefix<<8)|value,known=dict.get(key);
  if(known!==undefined){prefix=known;continue}
  emit(prefix,codeSize);
  if(next<4096){dict.set(key,next++);if(next>(1<<codeSize)&&codeSize<12)codeSize++}
  else {emit(256,codeSize);dict.clear();codeSize=9;next=258}
  prefix=value;
 }
 emit(prefix,codeSize);emit(257,codeSize);if(used>0)output.push(current&255);
 const blocks:number[]=[8];for(let i=0;i<output.length;i+=255){const block=output.slice(i,i+255);blocks.push(block.length,...block)}blocks.push(0);return new Uint8Array(blocks)
}
export function gifHeader(width:number,height:number){if(width<1||height<1||width>65535||height>65535)throw Error('Invalid GIF dimensions');
 const name=new TextEncoder().encode('GIF89a');const palette=gifPalette();const app=new TextEncoder().encode('NETSCAPE2.0');
 return [name,new Uint8Array([...u16(width),...u16(height),0xf7,0,0]),palette,new Uint8Array([0x21,0xff,11,...app,3,1,0,0,0])]}
export function gifFrame(width:number,height:number,rgba:Uint8ClampedArray,frameRate:number){const delay=Math.max(1,Math.round(100/frameRate));
 return [new Uint8Array([0x21,0xf9,4,0x08,...u16(delay),0,0,0x2c,...u16(0),...u16(0),...u16(width),...u16(height),0]),gifLzw(gifQuantize(rgba))]}
const blobFromCanvas=(canvas:HTMLCanvasElement,mime:'image/png'|'image/jpeg',quality:number)=>new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Browser image encoder failed')),mime,quality));
function waitForMedia(el:HTMLMediaElement,timeout=10000){if(el.readyState>=2)return Promise.resolve();return new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>finish(Error('Media decoder timed out')),timeout);const finish=(err?:Error)=>{clearTimeout(timer);el.removeEventListener('loadeddata',ok);el.removeEventListener('error',fail);err?reject(err):resolve()};const ok=()=>finish(),fail=()=>finish(Error('Failed to decode media'));el.addEventListener('loadeddata',ok,{once:true});el.addEventListener('error',fail,{once:true})})}
function seekTo(el:HTMLVideoElement,time:number){if(Math.abs(el.currentTime-time)<.002&&el.readyState>=2)return Promise.resolve();return new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>done(Error('Video seek timed out')),12000);const done=(err?:Error)=>{clearTimeout(timer);el.removeEventListener('seeked',ok);el.removeEventListener('error',fail);err?reject(err):resolve()};const ok=()=>done(),fail=()=>done(Error('Video decoder failed while seeking'));el.addEventListener('seeked',ok,{once:true});el.addEventListener('error',fail,{once:true});try{el.currentTime=Math.max(0,time)}catch(e){done(e as Error)}})}
export interface SequenceOptions {mime:'image/png'|'image/jpeg'|'image/gif';width:number;height:number;frameRate:number;quality:number}
export function exportImageSequence(p:Project,urls:Record<string,string>,options:SequenceOptions,onProgress:(x:number)=>void){let cancelled=false;
 const finished=(async()=>{await ensureProjectFonts(p);if(p.clips.some(c=>c.mediaId&&!urls[c.mediaId]))throw Error('Relink missing media before export');if(p.clips.some(c=>c.kind==='3d'))await prepareThree();
 const video=new Map<string,HTMLVideoElement>(),images=new Map<string,HTMLImageElement>();try{
  await Promise.all(p.clips.filter(c=>c.mediaId).map(async c=>{const url=urls[c.mediaId!];if(c.kind==='video'){const element=document.createElement('video');element.preload='auto';element.playsInline=true;element.muted=true;element.src=url;video.set(c.id,element);await waitForMedia(element)}else if(c.kind==='image'&&!images.has(c.mediaId!)){const image=new Image();image.src=url;images.set(c.mediaId!,image);await image.decode()}}));
  const source=document.createElement('canvas');const output=document.createElement('canvas');output.width=options.width;output.height=options.height;const ctx=output.getContext('2d');if(!ctx)throw Error('Canvas unavailable');
  const duration=projectEnd(p)/fps(p),frames=Math.max(1,Math.ceil(duration*options.frameRate)),result:{name:string;bytes:Uint8Array}[]=[],gifFrames:Uint8Array[]=options.mime==='image/gif'?gifHeader(options.width,options.height):[];
  for(let i=0;i<frames;i++){if(cancelled)return null;const at=Math.min(projectEnd(p)-1,Math.floor(i/options.frameRate*fps(p)));
   await Promise.all(p.clips.filter(c=>c.kind==='video'&&isActive(c,at)).map(c=>seekTo(video.get(c.id)!,sourceTime(c,at,p))));
   drawComposition(source,p,at,c=>c.kind==='image'?images.get(c.mediaId??''):video.get(c.id));
   ctx.clearRect(0,0,output.width,output.height);ctx.drawImage(source,0,0,output.width,output.height);
   if(options.mime==='image/gif'){gifFrames.push(...gifFrame(options.width,options.height,ctx.getImageData(0,0,options.width,options.height).data,options.frameRate))}
   else {const blob=await blobFromCanvas(output,options.mime,options.quality);result.push({name:`frame_${String(i+1).padStart(6,'0')}.${options.mime==='image/png'?'png':'jpg'}`,bytes:new Uint8Array(await blob.arrayBuffer())})}onProgress((i+1)/frames);
   if(i%4===0)await new Promise(resolve=>setTimeout(resolve,0));
  }return options.mime==='image/gif'?new Blob([...gifFrames,new Uint8Array([0x3b])],{type:'image/gif'}):zipStored(result);
 }finally{for(const v of video.values()){v.pause();v.removeAttribute('src');v.load()}images.clear()}
 })();return {cancel:()=>{cancelled=true},finished};
}
