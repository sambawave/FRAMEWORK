/** Actual pixel processing on Uint8ClampedArray RGBA; used identically for playback and WebM capture. */
import {Effect} from '../types';
const clamp=(v:number)=>Math.max(0,Math.min(255,Math.round(v)));
export function applyPixelEffect(data:Uint8ClampedArray,width:number,height:number,e:Effect):void{
 const a=e.amount,kind=e.type;
 if(kind==='gamma'||kind==='posterize'||kind==='threshold'||kind==='vignette'||kind==='grain'||kind==='exposure'||kind==='scanlines'){
  const levels=Math.max(2,Math.round(a)),gamma=100/Math.max(1,a),threshold=a/100*255;
  const stops=(a-100)/100,exposure=Math.pow(2,stops);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const i=(y*width+x)*4; if(data[i+3]===0)continue;
   const d=Math.hypot((x-width/2)/(width/2), (y-height/2)/(height/2));
   const vig=Math.max(0,1-(Math.max(0,d-.12)/1.3)**2*a/100);
   // Frame-stable spatial hash: grain does not flicker between preview and export.
   const random=(((Math.imul(x+61,374761393)^Math.imul(y+17,668265263))>>>0)%1024)/1023-.5;
   for(let c=0;c<3;c++){
    let v=data[i+c];
    if(kind==='gamma')v=255*Math.pow(v/255,gamma);
    else if(kind==='posterize')v=Math.round(v/255*(levels-1))/(levels-1)*255;
    else if(kind==='threshold')v=v>=threshold?255:0;
    else if(kind==='vignette')v*=vig;
    else if(kind==='grain')v+=random*2*a;
    else if(kind==='exposure')v*=exposure;
    else if(kind==='scanlines')v*=y%3===0?1-a/125:1;
    data[i+c]=clamp(v);
   }
  }
 }
 else if(kind==='rgbSplit'){
  const src=new Uint8ClampedArray(data),delta=Math.min(80,Math.round(a));
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const i=(y*width+x)*4;
   data[i]=src[(y*width+Math.max(0,Math.min(width-1,x+delta)))*4];
   data[i+2]=src[(y*width+Math.max(0,Math.min(width-1,x-delta)))*4+2];
  }
 }
 else if(kind==='pixelate'){
  const block=Math.max(1,Math.min(96,Math.round(a))),src=new Uint8ClampedArray(data);
  for(let y=0;y<height;y+=block)for(let x=0;x<width;x+=block){
   let r=0,g=0,b=0,alpha=0,count=0;
   for(let yy=y;yy<Math.min(height,y+block);yy++)for(let xx=x;xx<Math.min(width,x+block);xx++){
    const i=(yy*width+xx)*4;r+=src[i];g+=src[i+1];b+=src[i+2];alpha+=src[i+3];count++;
   }
   const rr=Math.round(r/count),gg=Math.round(g/count),bb=Math.round(b/count),aa=Math.round(alpha/count);
   for(let yy=y;yy<Math.min(height,y+block);yy++)for(let xx=x;xx<Math.min(width,x+block);xx++){
    const i=(yy*width+xx)*4;data[i]=rr;data[i+1]=gg;data[i+2]=bb;data[i+3]=aa;
   }
  }
 }
}
export const pixelEffectTypes=new Set<Effect['type']>(['gamma','posterize','threshold','vignette','grain','exposure','scanlines','rgbSplit','pixelate']);
