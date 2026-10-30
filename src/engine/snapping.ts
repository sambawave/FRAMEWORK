import type {Clip,Project} from '../types';
import {trimClip} from './timeline';

export type EditMode='move'|'left'|'right';
export interface SnapResult {delta:number; guide:number|null; candidates:number[]}
/** All boundaries are integer project frames. The return delta is absolute from the original clip. */
export function snapEdit(p:Project,original:Clip,mode:EditMode,rawDelta:number,playhead:number,enabled:boolean,zoom:number):SnapResult {
 const delta=Math.round(rawDelta);
 const others=p.clips.filter(c=>c.id!==original.id);
 const boundaries=[0,playhead,...(p.markers??[]).map(m=>m.frame),...others.flatMap(c=>[c.start,c.start+c.duration])]
  .filter(n=>Number.isInteger(n)&&n>=0);
 if(!enabled)return {delta,guide:null,candidates:boundaries};
 const threshold=Math.max(1,Math.round(9/Math.max(.05,zoom)));
 const predicted=mode==='move'?Math.max(0,original.start+delta):mode==='left'?trimClip(original,'left',delta).start:original.start+trimClip(original,'right',delta).duration;
 const anchors=mode==='move'?[predicted,predicted+original.duration]:[predicted];
 let bestDelta=delta,bestGuide:number|null=null,bestDistance=Infinity;
 for(const anchor of anchors)for(const target of boundaries){
  const distance=Math.abs(target-anchor);
  if(distance>threshold||distance>=bestDistance)continue;
  const suggestion=delta+(target-anchor);
  const result=mode==='move'?Math.max(0,original.start+suggestion):mode==='left'?trimClip(original,'left',suggestion).start:original.start+trimClip(original,'right',suggestion).duration;
  const actual=mode==='move'?[result,result+original.duration]:[result];
  if(!actual.includes(target))continue;
  bestDelta=suggestion;bestGuide=target;bestDistance=distance;
 }
 return {delta:bestDelta,guide:bestGuide,candidates:boundaries};
}
