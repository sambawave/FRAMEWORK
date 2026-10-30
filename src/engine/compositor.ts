import {Clip,Effect,Project} from '../types';
import {renderThreeClip} from './threeScene';
import {drawAnimatedText} from './textAnimation';
import {evaluate,isActive,valueAt} from './timeline';
import {maskPointsAt} from './masks';
import {shapePath} from './shapes';
import {applyPixelEffect,pixelEffectTypes} from './pixelEffects';
export const effectCatalog: {type:Clip['effects'][number]['type'];label:string;min:number;max:number;unit:string}[]=[
 {type:'brightness',label:'Brightness',min:0,max:300,unit:'%'},
 {type:'contrast',label:'Contrast',min:0,max:300,unit:'%'},
 {type:'saturate',label:'Saturation',min:0,max:400,unit:'%'},
 {type:'blur',label:'Gaussian Blur',min:0,max:80,unit:'px'},
 {type:'hue',label:'Hue Rotate',min:-180,max:180,unit:'°'},
 {type:'grayscale',label:'Black & White',min:0,max:100,unit:'%'},
 {type:'sepia',label:'Sepia',min:0,max:100,unit:'%'},
 {type:'invert',label:'Invert Colors',min:0,max:100,unit:'%'},
 {type:'chroma',label:'Chroma Key',min:0,max:90,unit:' tolerance'},
 {type:'pixelate',label:'Pixelate',min:1,max:80,unit:' px'},
 {type:'vignette',label:'Vignette',min:0,max:100,unit:'%'},
 {type:'grain',label:'Film Grain',min:0,max:100,unit:'%'},
 {type:'threshold',label:'Threshold',min:0,max:100,unit:'%'},
 {type:'posterize',label:'Posterize',min:2,max:32,unit:' colors'},
 {type:'gamma',label:'Gamma',min:10,max:300,unit:'%'},
 {type:'rgbSplit',label:'RGB Split',min:0,max:40,unit:' px'},
 {type:'scanlines',label:'CRT Scanlines',min:0,max:100,unit:'%'},
 {type:'glow',label:'Glow',min:0,max:60,unit:' px'},
 {type:'exposure',label:'Exposure',min:0,max:300,unit:'%'}
];
export function cssFilter(c:Clip){return c.effects.filter(e=>e.enabled&&!pixelEffectTypes.has(e.type)&&e.type!=='chroma'&&e.type!=='glow').map(e=>{
 const fn={hue:'hue-rotate',brightness:'brightness',contrast:'contrast',saturate:'saturate',blur:'blur',grayscale:'grayscale',sepia:'sepia',invert:'invert'}[e.type as 'hue'];
 return `${fn}(${e.amount}${e.type==='hue'?'deg':e.type==='blur'?'px':'%'})`;
}).join(' ')||'none'}
const blendTable:Record<Clip['blend'],GlobalCompositeOperation>={normal:'source-over',multiply:'multiply',screen:'screen',overlay:'overlay',lighten:'lighten',darken:'darken',difference:'difference',add:'lighter'};
export function layerSize(c:Clip,p:Project,asset?:{width?:number;height?:number}){
 if(c.kind==='solid')return {width:p.width,height:p.height};
 if(c.kind==='3d'){const side=Math.min(p.width,p.height)*.6;return {width:side,height:side}}
 if(c.kind==='shape'){if(c.shapeWidth&&c.shapeHeight)return {width:c.shapeWidth,height:c.shapeHeight};const radius=Math.min(p.width,p.height)*.21;return c.shape==='ellipse'||c.shape==='circle'?{width:radius*2,height:radius*2}:{width:p.width*.38,height:p.height*.38}}
 if(c.kind==='text'){
  const fontSize=c.fontSize??86,lines=(c.text||'').split('\n');
  // The compositor uses maxWidth = 90% of the composition width for text.
  const measure=typeof document!=='undefined'?document.createElement('canvas').getContext('2d'):null;
  if(measure)measure.font=`${c.fontWeight??'700'} ${fontSize}px ${c.fontFamily??'Arial'}`;
  return {width:Math.max(20,Math.min(p.width*.9,Math.max(...lines.map(s=>measure?.measureText(s).width??s.length*fontSize*.55))+8)),height:fontSize*1.15*lines.length};
 }
 if(asset?.width&&asset?.height){const k=Math.min(p.width/asset.width,p.height/asset.height);return {width:asset.width*k,height:asset.height*k}}
 return {width:p.width,height:p.height};
}
const hexRGB=(hex:string)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)||0);
export function applyChromaPixels(data:Uint8ClampedArray,e:Effect){
 const [r,g,b]=hexRGB(e.keyColor??'#00ff00'),tol=Math.max(0,e.amount)*4.416/1.35,soft=Math.max(1,(e.softness??12)*2),spill=(e.spill??35)/100;
 for(let i=0;i<data.length;i+=4){const dr=data[i]-r,dg=data[i+1]-g,db=data[i+2]-b;
  const d=Math.hypot(dr,dg,db);const alpha=Math.max(0,Math.min(1,(d-tol)/soft));
  if(alpha<1&&spill>0&&g>r&&g>b)data[i+1]=Math.round(data[i+1]-(Math.max(0,data[i+1]-Math.max(data[i],data[i+2])))*spill*(1-alpha));
  data[i+3]=Math.round(data[i+3]*alpha);
 }
}
// Reused scratch canvases avoid reallocating two multi-megabyte pixel buffers every frame.
const surfaces=new Map<string,[HTMLCanvasElement,HTMLCanvasElement]>();
function scratch(width:number,height:number):[HTMLCanvasElement,HTMLCanvasElement]{
 const key=`${width}x${height}`;let pair=surfaces.get(key);
 if(!pair){const create=()=>{const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;return canvas};pair=[create(),create()];
  if(surfaces.size>=4)surfaces.delete(surfaces.keys().next().value!);surfaces.set(key,pair)
 }
 const context=pair[0].getContext('2d');if(context){context.setTransform(1,0,0,1,0,0);context.globalAlpha=1;context.globalCompositeOperation='source-over';context.filter='none';context.clearRect(0,0,width,height)}
 return pair;
}
export function drawComposition(canvas:HTMLCanvasElement,p:Project,frame:number,getMedia:(c:Clip)=>HTMLVideoElement|HTMLAudioElement|HTMLImageElement|undefined){
 if(canvas.width!==p.width)canvas.width=p.width;if(canvas.height!==p.height)canvas.height=p.height;
 const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return;
 ctx.resetTransform();ctx.filter='none';ctx.globalAlpha=1;ctx.fillStyle=p.background;ctx.fillRect(0,0,p.width,p.height);
 const tracks=[...p.tracks].reverse();
 const solo=p.tracks.some(t=>t.kind==='video'&&t.solo);
 const applyAdjustment=(clip:Clip)=>{
  const buf=document.createElement('canvas');buf.width=p.width;buf.height=p.height;const b=buf.getContext('2d',{willReadFrequently:true});if(!b)return;
  b.drawImage(canvas,0,0);
  const active=clip.effects.filter(e=>e.enabled).map(e=>({...e,amount:evaluate(e.keyframes,e.amount,frame-clip.start,clip.smoothEasing)}));
  for(const e of active){if(e.type==='chroma')continue;
   if(pixelEffectTypes.has(e.type)){try{const pixels=b.getImageData(0,0,p.width,p.height);applyPixelEffect(pixels.data,p.width,p.height,e);b.putImageData(pixels,0,0)}catch{continue}}
   else {const tmp=document.createElement('canvas');tmp.width=p.width;tmp.height=p.height;const tctx=tmp.getContext('2d');if(!tctx)continue;tctx.filter=e.type==='glow'?`blur(${e.amount}px) brightness(150%)`:cssFilter({...clip,effects:[e]});tctx.drawImage(buf,0,0);b.clearRect(0,0,p.width,p.height);b.drawImage(tmp,0,0)}
  }
  const opacity=Math.max(0,Math.min(1,valueAt(clip,'opacity',frame)));ctx.save();ctx.globalAlpha=opacity;ctx.drawImage(buf,0,0);ctx.restore();
 };
 for(const t of tracks){if(t.kind!=='video'||t.hidden||(solo&&!t.solo))continue;
  for(const c of p.clips){if(c.trackId!==t.id||!isActive(c,frame)||c.kind==='audio'||c.kind==='null')continue;
   if(c.kind==='adjustment'){applyAdjustment(c);continue;}
   ctx.save();
   ctx.translate(p.width/2+valueAt(c,'x',frame),p.height/2+valueAt(c,'y',frame));
   ctx.rotate(valueAt(c,'rotation',frame)*Math.PI/180);
   const scale=Math.max(.001,valueAt(c,'scale',frame));ctx.scale(scale*valueAt(c,'scaleX',frame),scale*valueAt(c,'scaleY',frame));
   const local=frame-c.start;
   const fadeIn=c.fadeIn>0?Math.min(1,local/c.fadeIn):1;
   const fadeOut=c.fadeOut>0?Math.min(1,(c.duration-local)/c.fadeOut):1;
   ctx.globalAlpha=Math.max(0,Math.min(1,valueAt(c,'opacity',frame)))*Math.max(0,Math.min(fadeIn,fadeOut));
   ctx.globalCompositeOperation=blendTable[c.blend]??'source-over';
   if(c.mask==='rectangle'){ctx.beginPath();ctx.rect(-p.width*.33,-p.height*.33,p.width*.66,p.height*.66);ctx.clip()}
   if(c.mask==='ellipse'){ctx.beginPath();ctx.ellipse(0,0,p.width*.33,p.height*.33,0,0,Math.PI*2);ctx.clip()}
   if(c.mask==='polygon'&&maskPointsAt(c,frame).length>=3){
    const maskW=layerSize(c,p,p.assets.find(a=>a.id===c.mediaId)).width,maskH=layerSize(c,p,p.assets.find(a=>a.id===c.mediaId)).height;
    ctx.beginPath();if(c.maskInvert)ctx.rect(-p.width*4,-p.height*4,p.width*8,p.height*8);
    maskPointsAt(c,frame).forEach(([x,y],i)=>{if(i===0)ctx.moveTo(x*maskW/2,y*maskH/2);else ctx.lineTo(x*maskW/2,y*maskH/2)});ctx.closePath();ctx.clip(c.maskInvert?'evenodd':'nonzero');
   }
   const size=layerSize(c,p,p.assets.find(a=>a.id===c.mediaId));
   const draw=(target:CanvasRenderingContext2D)=>{
    if(c.kind==='solid'||c.kind==='shape'){
     target.fillStyle=c.color??'#ffffff';
     if(c.kind==='solid')target.fillRect(-size.width/2,-size.height/2,size.width,size.height);
     else {shapePath(target,c,size.width,size.height);if(c.shape!=='line'&&c.shape!=='bezier')target.fill();
      if(c.strokeWidth||c.shape==='line'||c.shape==='bezier'){target.strokeStyle=c.strokeColor??c.color??'#ffffff';target.lineWidth=c.strokeWidth??3;target.lineJoin='round';target.lineCap='round';target.stroke();}
      }
    
    }else if(c.kind==='text'){
     drawAnimatedText(target,c,frame,p.width);
    }else if(c.kind==='3d'){
     const rendered=renderThreeClip(c,frame,Math.min(size.width,size.height));if(rendered)target.drawImage(rendered,-size.width/2,-size.height/2,size.width,size.height);
    }else{
     const m=getMedia(c);
     if(m instanceof HTMLImageElement&&m.complete&&m.naturalWidth>0)target.drawImage(m,-size.width/2,-size.height/2,size.width,size.height);
     else if(m instanceof HTMLVideoElement&&m.readyState>=2){try{target.drawImage(m,-size.width/2,-size.height/2,size.width,size.height)}catch{/*decoder pending*/}}
    }
   };
   const activeEffects=c.effects.filter(e=>e.enabled).map(e=>({...e,amount:evaluate(e.keyframes,e.amount,frame-c.start,c.smoothEasing)}));
   if(activeEffects.some(e=>e.type==='chroma'||pixelEffectTypes.has(e.type)||e.type==='glow')){
    // Apply effects IN STACK ORDER. Chroma creates actual alpha that later effects can process.
    const width=Math.max(1,Math.ceil(size.width)),height=Math.max(1,Math.ceil(size.height));
    const buffers=scratch(width,height);const sourceCtx=buffers[0].getContext('2d',{willReadFrequently:true});
    if(sourceCtx){sourceCtx.translate(width/2,height/2);draw(sourceCtx);sourceCtx.setTransform(1,0,0,1,0,0);
     let current=0;
     for(const effect of activeEffects){
      if(effect.type==='chroma'||pixelEffectTypes.has(effect.type)){
       try{const pixels=buffers[current].getContext('2d',{willReadFrequently:true})?.getImageData(0,0,width,height);
        if(pixels){if(effect.type==='chroma')applyChromaPixels(pixels.data,effect);else applyPixelEffect(pixels.data,width,height,effect);buffers[current].getContext('2d')?.putImageData(pixels,0,0)}}
       catch(e){console.warn('Pixel effect unavailable for this media frame',e)}
      }else if(effect.type==='glow'){
       const next=1-current,out=buffers[next].getContext('2d');if(!out)continue;
       out.clearRect(0,0,width,height);out.filter=`blur(${effect.amount}px) brightness(150%)`;out.drawImage(buffers[current],0,0);out.filter='none';out.globalCompositeOperation='screen';out.drawImage(buffers[current],0,0);out.globalCompositeOperation='source-over';current=next;
      }else{
       const next=1-current,out=buffers[next].getContext('2d');if(!out)continue;
       out.clearRect(0,0,width,height);out.filter=cssFilter({...c,effects:[effect]});out.drawImage(buffers[current],0,0);out.filter='none';current=next;
      }
     }
     ctx.filter='none';ctx.drawImage(buffers[current],-size.width/2,-size.height/2,size.width,size.height);
    }
   }else{ctx.filter=cssFilter({...c,effects:activeEffects});draw(ctx)}
   ctx.restore();
  }
 }
 return ctx;
}
