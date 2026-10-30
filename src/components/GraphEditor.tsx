import {useState} from 'react';
import {AnimProp,Clip,Project} from '../types';
import {evaluate} from '../engine/timeline';
import {useEditor} from '../store';
const W=300,H=160,P=20;
const labels:AnimProp[]=['x','y','scale','rotation','opacity','volume','reveal','scaleX','scaleY','rotationX','rotationY','rotationZ','depth','threeScaleX','threeScaleY','threeScaleZ','textIntensity','roughness','metalness','lighting'];
export function GraphEditor({clip,selectedKey}:{clip:Clip;selectedKey?:{prop:AnimProp;frame:number}|null}){
 const props=labels.filter(k=>(clip.keyframes[k]?.length??0)>0);
 const [requested,setRequested]=useState<AnimProp>('x');const prop=props.includes(requested)?requested:props[0];
 if(!prop)return null;
 const keys=[...(clip.keyframes[prop]??[])].sort((a,b)=>a.frame-b.frame);
 const values=keys.map(k=>k.value),min0=Math.min(...values),max0=Math.max(...values),padding=Math.max(1,(max0-min0)*.15),lo=min0-padding,hi=max0+padding;
 const sx=(f:number)=>P+f/Math.max(1,clip.duration)*(W-2*P),sy=(v:number)=>H-P-(v-lo)/(hi-lo)*(H-2*P);
 const path=Array.from({length:Math.max(2,Math.min(241,clip.duration+1))},(_,i)=>{const frame=i*clip.duration/(Math.max(2,Math.min(241,clip.duration+1))-1);return `${i===0?'M':'L'}${sx(frame).toFixed(2)} ${sy(evaluate(keys,0,frame,clip.smoothEasing)).toFixed(2)}`}).join(' ');
 function editPoint(e:React.PointerEvent,index:number){e.preventDefault();e.stopPropagation();
  const el=e.currentTarget.ownerSVGElement,rect=el?.getBoundingClientRect();if(!rect)return;
  const before:Project=structuredClone(useEditor.getState().project);let draggingFrame=keys[index].frame;
  const move=(ev:PointerEvent)=>{const nx=(ev.clientX-rect.left)*W/rect.width,ny=(ev.clientY-rect.top)*H/rect.height;
   const frame=Math.min(clip.duration,Math.max(0,Math.round((nx-P)/(W-2*P)*clip.duration)));
   const value=Number((lo+(H-P-ny)/(H-2*P)*(hi-lo)).toFixed(3));
   const current=useEditor.getState().project.clips.find(c=>c.id===clip.id);if(!current)return;
   const currentKeys=[...(current.keyframes[prop]??[])];
   const point=currentKeys.find(k=>k.frame===draggingFrame)||currentKeys[index];
   if(!point)return;const others=currentKeys.filter(k=>k!==point&&k.frame!==frame);
   draggingFrame=frame;useEditor.getState().previewClip(clip.id,{keyframes:{...current.keyframes,[prop]:[...others,{...point,frame,value}].sort((a,b)=>a.frame-b.frame)}});
  };
  const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);useEditor.getState().finishPreview(before)};
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);
 }
 return <div className="graph-editor"><div className="graph-head"><strong>VALUE GRAPH</strong><select aria-label="Graph property" value={prop} onChange={e=>setRequested(e.target.value as AnimProp)}>{props.map(k=><option key={k} value={k}>{k.toUpperCase()}</option>)}</select></div>
 <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-label="Interactive value graph" className="graph-canvas">
  {[0,1,2,3,4].map(i=><g key={i}><line x1={P} x2={W-P} y1={P+i*(H-2*P)/4} y2={P+i*(H-2*P)/4} stroke="#55565a" strokeWidth=".6"/><line y1={P} y2={H-P} x1={P+i*(W-2*P)/4} x2={P+i*(W-2*P)/4} stroke="#444548" strokeWidth=".6"/></g>)}
  <path d={path} fill="none" stroke="#efb46e" strokeWidth="1.8" vectorEffect="non-scaling-stroke"/>
  {keys.map((k,i)=><circle key={i} cx={sx(k.frame)} cy={sy(k.value)} r="4.5" fill={selectedKey?.prop===prop&&selectedKey?.frame===k.frame?"#ffffff":"#efb46e"} stroke="#111" strokeWidth="1" className="graph-point" onPointerDown={e=>editPoint(e,i)}/>)}</svg>
 <div className="graph-caption"><span>{lo.toFixed(1)} — {hi.toFixed(1)}</span><span>{clip.duration} frames · Drag keyframes</span></div></div>
}
