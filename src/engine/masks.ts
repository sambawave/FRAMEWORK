import {Clip} from '../types';
export type MaskPoint=[number,number];
export interface MaskKey {frame:number;points:MaskPoint[]}
/** Evaluate layer-local polygon vertices at a specified composition frame. */
export function maskPointsAt(c:Clip,compositionFrame:number):MaskPoint[]{
 const keys=[...(c.maskKeyframes??[])].sort((a,b)=>a.frame-b.frame);
 if(!keys.length)return c.maskPoints??[];
 const f=compositionFrame-c.start;
 if(f<=keys[0].frame)return keys[0].points;
 if(f>=keys[keys.length-1].frame)return keys[keys.length-1].points;
 for(let i=0;i<keys.length-1;i++){
  const left=keys[i],right=keys[i+1];if(f<left.frame||f>right.frame)continue;
  if(left.points.length!==right.points.length)return left.points;
  const t=(f-left.frame)/(right.frame-left.frame);
  return left.points.map(([x,y],j)=>[x+(right.points[j][0]-x)*t,y+(right.points[j][1]-y)*t]);
 }
 return c.maskPoints??[];
}
/** Change polygon at the playhead; if animated, upsert a true path keyframe. */
export function setMaskAt(c:Clip,compositionFrame:number,points:MaskPoint[]):Partial<Clip>{
 if(!c.maskKeyframes?.length)return {mask:'polygon',maskPoints:points};
 const frame=Math.max(0,Math.round(compositionFrame-c.start));
 const keys=c.maskKeyframes.filter(k=>k.frame!==frame);
 keys.push({frame,points});keys.sort((a,b)=>a.frame-b.frame);
 return {mask:'polygon',maskKeyframes:keys};
}
export function startMaskAnimation(c:Clip,compositionFrame:number):Partial<Clip>{
 const frame=Math.max(0,Math.round(compositionFrame-c.start));
 return {maskKeyframes:[{frame,points:maskPointsAt(c,compositionFrame)}]};
}
/** Split mask-keyframes, keeping paths in clip-local frame coordinates. */
export function splitMaskKeys(c:Clip,localFrame:number):[MaskKey[]|undefined,MaskKey[]|undefined]{
 if(!c.maskKeyframes?.length)return [undefined,undefined];
 const boundary=maskPointsAt(c,c.start+localFrame);
 return [[...c.maskKeyframes.filter(k=>k.frame<localFrame),{frame:localFrame,points:boundary}],
 [{frame:0,points:boundary},...c.maskKeyframes.filter(k=>k.frame>localFrame).map(k=>({...k,frame:k.frame-localFrame}))]];
}
