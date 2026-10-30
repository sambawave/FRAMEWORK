import {splitMaskKeys} from './masks';
import {Clip,Keyframe,AnimProp,Project,EffectType,uuid} from '../types';
/** Resolve automatic smoothing at evaluation time, not only when a keyframe is created.
 * Explicit per-key easing always wins (including authored preset motion / Hold).
 * Legacy easeInOut/linear keys with no explicit marker follow the layer switch.
 * Both preview and export call this single evaluation path. */
export function resolvedEase(key:Keyframe,smooth?:boolean):Keyframe['ease'] {
 if(key.manualEase || (key.ease!=='linear' && key.ease!=='easeInOut'))return key.ease;
 // Old files never tagged explicitly linear keys: preserve those edits.
 // Legacy auto-Ease-In-Out keys (created by pre-2.6 editor) remain switchable.
 if(!key.autoEase && key.ease==='linear')return 'linear';
 return smooth===false?'linear':smooth===true?'easeInOut':key.ease;
}
export function evaluate(keys:Keyframe[]|undefined,base:number,frame:number,smooth?:boolean):number{
 if(!keys?.length)return base;
 const sorted=[...keys].sort((a,b)=>a.frame-b.frame);
 if(frame<=sorted[0].frame)return sorted[0].value;
 if(frame>=sorted[sorted.length-1].frame)return sorted[sorted.length-1].value;
 for(let i=0;i<sorted.length-1;i++){
  const a=sorted[i],b=sorted[i+1];if(frame<a.frame||frame>b.frame)continue;
  let t=(frame-a.frame)/(b.frame-a.frame);
  const easing=resolvedEase(a,smooth);
  if(easing==='hold')t=0;
  else if(easing==='easeIn')t=t*t;
  else if(easing==='easeOut')t=1-(1-t)*(1-t);
  else if(easing==='easeInOut')t=t*t*t*(t*(t*6-15)+10);
  else if(easing==='back')t=1+2.70158*Math.pow(t-1,3)+1.70158*Math.pow(t-1,2);
  else if(easing==='bounce'){const n=7.5625,d=2.75;t=t<1/d?n*t*t:t<2/d?n*(t-=1.5/d)*t+.75:t<2.5/d?n*(t-=2.25/d)*t+.9375:n*(t-=2.625/d)*t+.984375}
  else if(easing==='elastic')t=t===0||t===1?t:Math.pow(2,-10*t)*Math.sin((t*10-.75)*(2*Math.PI/3))+1;
  return a.value+(b.value-a.value)*t;
 }
 return base;
}
export function valueAt(c:Clip,prop:AnimProp,frame:number){
 const base=prop==='volume'?c.volume:prop==='reveal'?(c.text??'').length:prop in c.transform?(c.transform as unknown as Record<string,number>)[prop]??1:({rotationX:c.three?.rotationX??0,rotationY:c.three?.rotationY??0,rotationZ:c.three?.rotationZ??0,depth:c.three?.depth??0,threeScaleX:c.three?.scaleX??1,threeScaleY:c.three?.scaleY??1,threeScaleZ:c.three?.scaleZ??1,textIntensity:c.textAnimation?.intensity??100,roughness:c.three?.roughness??.45,metalness:c.three?.metalness??.1,lighting:c.three?.lighting??1} as Record<string,number>)[prop]??0;return evaluate(c.keyframes[prop],base,frame-c.start,c.smoothEasing);
}
export function isActive(c:Clip,frame:number){return frame>=c.start&&frame<c.start+c.duration}
export function sourceTime(c:Clip,frame:number,p:Project){const local=Math.max(0,Math.min(c.duration-1,frame-c.start));const speed=c.speed??1;return (c.sourceStart+(c.reverse?(c.duration-1-local):local)*speed)*p.fps.den/p.fps.num}
export function splitClip(p:Project,clipId:string,frame:number):Project{
 const q=structuredClone(p);const i=q.clips.findIndex(c=>c.id===clipId);if(i<0)return p;
 const c=q.clips[i];if(frame<=c.start||frame>=c.start+c.duration)return p;
 const left=frame-c.start;const right:Clip=structuredClone(c);
 right.id=uuid();right.name=c.name+' (split)';right.start=frame;right.duration=c.duration-left;right.sourceStart=c.sourceStart+(c.reverse?0:left*(c.speed??1));if(c.reverse)c.sourceStart+=(c.duration-left)*(c.speed??1);c.duration=left;
 // Keyframes have clip-relative time; redistribute them at split position.
 for(const prop of Object.keys(c.keyframes) as AnimProp[]){
  const keys=c.keyframes[prop]??[];
  const boundary=evaluate(keys,prop==='volume'?c.volume:prop==='reveal'?(c.text??'').length:valueAt(c,prop,c.start),left,c.smoothEasing);
  right.keyframes[prop]=[{frame:0,value:boundary,ease:'linear'},...keys.filter(k=>k.frame>left).map(k=>({...k,frame:k.frame-left}))];
  c.keyframes[prop]=[...keys.filter(k=>k.frame<left),{frame:left,value:boundary,ease:'linear'}];
 }
 const maskKeys=splitMaskKeys(c,left);if(maskKeys[0])c.maskKeyframes=maskKeys[0];if(maskKeys[1])right.maskKeyframes=maskKeys[1];
 q.clips.splice(i+1,0,right);return q;
}
export function trimClip(c:Clip,edge:'left'|'right',deltaFrames:number):Clip{
 const n=structuredClone(c);const d=Math.round(deltaFrames);
 if(edge==='left'){
  const amount=Math.max(-n.sourceStart,Math.min(d,n.duration-1));
  n.start=Math.max(0,n.start+amount);const applied=n.start-c.start;
  n.duration-=applied;n.sourceStart+=n.reverse?0:applied*(n.speed??1);
  if(n.maskKeyframes)n.maskKeyframes=n.maskKeyframes.filter(k=>k.frame>=applied).map(k=>({...k,frame:k.frame-applied}));
  for(const prop of Object.keys(n.keyframes) as AnimProp[]){
   n.keyframes[prop]=(n.keyframes[prop]??[]).filter(k=>k.frame>=applied).map(k=>({...k,frame:k.frame-applied}));
  }
 } else{const previous=n.duration;n.duration=Math.max(1,n.duration+d);if(n.reverse)n.sourceStart+=(previous-n.duration)*(n.speed??1)}
 return n;
}
export function moveClip(c:Clip,start:number){return {...c,start:Math.max(0,Math.round(start))}}
export function addEffect(c:Clip,type:EffectType):Clip{
 return {...c,effects:[...c.effects,{id:uuid(),type,amount:type==='blur'?4:type==='hue'?30:type==='chroma'?24:type==='pixelate'?8:type==='vignette'?50:type==='grain'?25:type==='threshold'?50:type==='posterize'?6:type==='gamma'?100:type==='rgbSplit'?4:type==='scanlines'?45:type==='glow'?12:type==='exposure'?100:type==='brightness'||type==='contrast'||type==='saturate'?120:100,enabled:true,...(type==='chroma'?{keyColor:'#00ff00',softness:12,spill:35}:{})}]};
}
export function validateProject(input:unknown):Project{
 if(!input||typeof input!=='object')throw Error('Invalid project document');
 const v=input as Project;
 if(v.schema!==1||!Array.isArray(v.tracks)||!Array.isArray(v.clips)||!Array.isArray(v.assets)||!v.fps||!v.fps.num||!v.fps.den||v.width<16||v.height<16)throw Error('Unsupported or invalid .framework file');
 if(v.clips.some(c=>!Number.isFinite(c.start)||c.start<0||c.duration<1||!v.tracks.some(t=>t.id===c.trackId)))throw Error('Invalid clip timeline');
 return v;
}

/** Remove a clip and pull later clips on its track toward the gap. */
export function rippleDelete(p:Project,id:string):Project{
 const clip=p.clips.find(c=>c.id===id);if(!clip)return p;
 const end=clip.start+clip.duration;
 return {...p,clips:p.clips.filter(c=>c.id!==id).map(c=>c.trackId===clip.trackId&&c.start>=end?{...c,start:c.start-clip.duration}:c)};
}
