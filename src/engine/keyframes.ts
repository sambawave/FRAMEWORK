import type {Clip,AnimProp} from '../types';
/** Uses integer frame indices, never floating-point seconds. */
export function nearestKeyframe(c:Clip,prop:AnimProp|undefined,projectFrame:number,direction:-1|1):number|null{
 const local=projectFrame-c.start;
 const values=(prop?c.keyframes[prop]??[]:Object.values(c.keyframes).flat()).map(k=>k.frame);
 const ordered=[...new Set(values)].filter(f=>Number.isInteger(f)).sort((a,b)=>a-b);
 const found=direction<0?[...ordered].reverse().find(f=>f<local):ordered.find(f=>f>local);
 return found===undefined?null:c.start+found;
}
export function jumpKeyframe(c:Clip,prop:AnimProp|undefined,frame:number,direction:-1|1,setPlayhead:(frame:number)=>void):number|null{
 const next=nearestKeyframe(c,prop,frame,direction);if(next!==null)setPlayhead(next);return next;
}
