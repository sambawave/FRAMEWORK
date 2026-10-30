/** Non-destructive attribute clipboard. Never copies IDs, media links or clip timing. */
import type {Clip,Keyframe} from '../types';
export type AttributeGroup='position'|'rotation'|'scale'|'opacity'|'effects'|'animation'|'text'|'material'|'audio'|'masks';
export const ATTRIBUTE_GROUPS:AttributeGroup[]=['position','rotation','scale','opacity','effects','animation','text','material','audio','masks'];
export interface AttributeCopy {sourceKind:Clip['kind'];values:Partial<Clip>;groups:AttributeGroup[];originFrame:number}
const deep=<T,>(x:T):T=>structuredClone(x);
export function copyAttributes(c:Clip,groups:AttributeGroup[]=ATTRIBUTE_GROUPS,originFrame=0):AttributeCopy{
 const out:Partial<Clip>={};
 if(groups.includes('position'))out.transform={...out.transform,...{x:c.transform.x,y:c.transform.y}} as Clip['transform'];
 if(groups.includes('rotation'))out.transform={...out.transform,rotation:c.transform.rotation} as Clip['transform'];
 if(groups.includes('scale'))out.transform={...out.transform,scale:c.transform.scale,scaleX:c.transform.scaleX,scaleY:c.transform.scaleY} as Clip['transform'];
 if(groups.includes('opacity'))out.transform={...out.transform,opacity:c.transform.opacity} as Clip['transform'];
 if(groups.includes('effects'))out.effects=deep(c.effects);
 if(groups.includes('animation'))out.keyframes=deep(c.keyframes);
 if(groups.includes('text')&&c.kind==='text')Object.assign(out,{fontSize:c.fontSize,fontFamily:c.fontFamily,fontWeight:c.fontWeight,color:c.color,textAnimation:deep(c.textAnimation),characters:deep(c.characters)});
 if(groups.includes('material')&&c.kind==='3d')Object.assign(out,{color:c.color,three:deep(c.three)});
 if(groups.includes('audio')&&(c.kind==='audio'||c.kind==='video'))Object.assign(out,{volume:c.volume,pan:c.pan,audioMuted:c.audioMuted,fadeIn:c.fadeIn,fadeOut:c.fadeOut});
 if(groups.includes('masks')&&c.kind!=='audio')Object.assign(out,{mask:c.mask,maskPoints:deep(c.maskPoints),maskKeyframes:deep(c.maskKeyframes),maskInvert:c.maskInvert});
 return {sourceKind:c.kind,values:out,groups,originFrame};
}
export function pasteAttributes(to:Clip,copy:AttributeCopy,opts:{merge?:boolean;relativeFrame?:number;groups?:AttributeGroup[]}={}):Clip{
 const groups=opts.groups??copy.groups,values=copy.values,next=deep(to);
 const applicable=(g:AttributeGroup)=>groups.includes(g)&&copy.groups.includes(g);
 if(values.transform){const t=values.transform;if(applicable('position')){next.transform.x=t.x;next.transform.y=t.y}if(applicable('scale')){next.transform.scale=t.scale;next.transform.scaleX=t.scaleX;next.transform.scaleY=t.scaleY}if(applicable('rotation'))next.transform.rotation=t.rotation;if(applicable('opacity'))next.transform.opacity=t.opacity}
 if(applicable('effects')&&to.kind!=='audio'&&values.effects)next.effects=opts.merge?[...next.effects,...deep(values.effects).map(e=>({...e,id:crypto.randomUUID()}))]:deep(values.effects).map(e=>({...e,id:crypto.randomUUID()}));
 if(applicable('animation')&&values.keyframes){const delta=opts.relativeFrame===undefined?0:opts.relativeFrame-copy.originFrame;const shifted=Object.fromEntries(Object.entries(values.keyframes).map(([prop,keys])=>[prop,(keys as Keyframe[]).map(k=>({...k,frame:Math.max(0,k.frame+delta)}))]));if(opts.merge){const combined={...next.keyframes};for(const [prop,keys] of Object.entries(shifted)){const existing=(combined as Record<string,Keyframe[]>)[prop]??[];const over=keys as Keyframe[];(combined as Record<string,Keyframe[]>)[prop]=[...existing.filter(k=>!over.some(n=>n.frame===k.frame)),...over].sort((a,b)=>a.frame-b.frame)}next.keyframes=combined}else next.keyframes=shifted}
 if(applicable('text')&&to.kind==='text'&&copy.sourceKind==='text')for(const k of ['fontSize','fontFamily','fontWeight','color','textAnimation','characters'] as const){(next as unknown as Record<string,unknown>)[k]=deep(values[k])}
 if(applicable('material')&&to.kind==='3d'&&copy.sourceKind==='3d'){next.color=values.color;next.three=deep(values.three)}
 if(applicable('audio')&&(to.kind==='audio'||to.kind==='video')&&(copy.sourceKind==='audio'||copy.sourceKind==='video'))for(const k of ['volume','pan','audioMuted','fadeIn','fadeOut'] as const)(next as unknown as Record<string,unknown>)[k]=values[k];
 if(applicable('masks')&&to.kind!=='audio'&&copy.sourceKind!=='audio')for(const k of ['mask','maskPoints','maskKeyframes','maskInvert'] as const)(next as unknown as Record<string,unknown>)[k]=deep(values[k]);
 return next;
}
