/** Motion presets are ordinary editable keyframes. No opaque or baked animations. */
import {AnimProp,Clip,Ease,Keyframe,Project} from '../types';
import {valueAt} from './timeline';
export type MotionName='slideIn'|'slideOut'|'zoomIn'|'zoomOut'|'elasticPop'|'bounce'|'overshoot'|'fadeIn'|'fadeOut'|'rotate'|'scalePop'|'shake'|'float'|'pulse'|'cameraPush'|'whip'|'typewriter'|'glitchEntrance';
export interface MotionOptions {duration:number;intensity:number;direction:'left'|'right'|'up'|'down';ease:Ease;offset:number}
export const initialMotionOptions:MotionOptions={duration:24,intensity:100,direction:'left',ease:'easeInOut',offset:0};
export const motionCatalog:{id:MotionName;name:string;group:string;description:string}[]=[
 {id:'slideIn',name:'Smooth Slide In',group:'Entrance',description:'Slide from outside toward the current position'},
 {id:'zoomIn',name:'Smooth Zoom In',group:'Entrance',description:'Smoothly scale up from small'},
 {id:'elasticPop',name:'Elastic Pop',group:'Entrance',description:'Elastic scale entrance'},
 {id:'bounce',name:'Bounce Entrance',group:'Entrance',description:'A bouncing position entrance'},
 {id:'overshoot',name:'Overshoot',group:'Entrance',description:'Travel beyond the resting position and settle'},
 {id:'scalePop',name:'Scale Pop',group:'Entrance',description:'Scale overshoot and settle'},
 {id:'fadeIn',name:'Fade In',group:'Entrance',description:'Opacity rise from zero'},
 {id:'glitchEntrance',name:'Glitch Entrance',group:'Entrance',description:'Short rapidly shifting position keyframes'},
 {id:'typewriter',name:'Typewriter',group:'Text',description:'Reveal real editable text by character'},
 {id:'slideOut',name:'Smooth Slide Out',group:'Exit',description:'Slide away from the current position'},
 {id:'zoomOut',name:'Smooth Zoom Out',group:'Exit',description:'Zoom down to nothing'},
 {id:'fadeOut',name:'Fade Out',group:'Exit',description:'Opacity fade to zero'},
 {id:'rotate',name:'Smooth Rotation',group:'Motion',description:'Animate a complete rotation'},
 {id:'shake',name:'Shake',group:'Motion',description:'Deterministic jitter with editable keyframes'},
 {id:'float',name:'Smooth Floating',group:'Motion',description:'Gentle floating cycle'},
 {id:'pulse',name:'Pulse',group:'Motion',description:'Scale up and return to rest'},
 {id:'cameraPush',name:'Camera Push',group:'Motion',description:'Smooth zoom toward the viewer'},
 {id:'whip',name:'Whip',group:'Motion',description:'Fast directional animated whip'}
];
export function createMotionKeys(clip:Clip,p:Project,frame:number,name:MotionName,options:MotionOptions):Clip {
 if(name==='typewriter'&&clip.kind!=='text')return clip;
 if(clip.kind==='audio')return clip;
 const local=Math.max(0,Math.min(clip.duration-1,Math.round(frame-clip.start+options.offset)));
 const span=Math.max(1,Math.min(Math.round(options.duration),clip.duration-1-local));
 const power=Math.max(0,options.intensity)/100;
 const sign=options.direction==='left'||options.direction==='up'?-1:1;
 const axis:AnimProp=options.direction==='left'||options.direction==='right'?'x':'y';
 const motionDistance=(axis==='x'?p.width:p.height)*.40*power*sign;
 const base=(prop:AnimProp)=>valueAt(clip,prop,clip.start+local);
 const current:Partial<Record<AnimProp,Keyframe[]>>=structuredClone(clip.keyframes);
 const add=(prop:AnimProp,entries:[number,number,Ease?][])=>{
  const keys=(current[prop]??[]).filter(k=>k.frame<local||k.frame>local+span);
  for(const [t,value,ease] of entries){keys.push({frame:Math.min(clip.duration-1,local+Math.round(t*span)),value,ease:ease??options.ease,manualEase:true})}
  current[prop]=[...new Map(keys.map(k=>[k.frame,k])).values()].sort((a,b)=>a.frame-b.frame);
 };
 const pair=(prop:AnimProp,from:number,to:number, ease:Ease=options.ease)=>add(prop,[[0,from,ease],[1,to,'linear']]);
 switch(name){
 case 'slideIn':pair(axis,base(axis)+motionDistance,base(axis));break;
 case 'slideOut':pair(axis,base(axis),base(axis)+motionDistance);break;
 case 'zoomIn':pair('scale',Math.max(.01,base('scale')*(1-power*.92)),base('scale'));break;
 case 'zoomOut':pair('scale',base('scale'),Math.max(.01,base('scale')*(1-power*.92)));break;
 case 'elasticPop':pair('scale',.01,base('scale'),'elastic');break;
 case 'bounce':pair(axis,base(axis)+motionDistance,base(axis),'bounce');break;
 case 'overshoot':add(axis,[[0,base(axis)+motionDistance],[.8,base(axis)-motionDistance*.12,'easeOut'],[1,base(axis),'easeOut']]);break;
 case 'scalePop':add('scale',[[0,.01],[.7,base('scale')*(1+.22*power),'easeOut'],[1,base('scale'),'easeInOut']]);break;
 case 'fadeIn':pair('opacity',0,base('opacity'));break;
 case 'fadeOut':pair('opacity',base('opacity'),0);break;
 case 'rotate':pair('rotation',base('rotation'),base('rotation')+360*power*sign);break;
 case 'pulse':add('scale',[[0,base('scale')],[.5,base('scale')*(1+.26*power),'easeInOut'],[1,base('scale'),'easeInOut']]);break;
 case 'float':add('y',[[0,base('y')],[.5,base('y')-p.height*.055*power,'easeInOut'],[1,base('y'),'easeInOut']]);break;
 case 'cameraPush':pair('scale',base('scale'),base('scale')*(1+power*.5));break;
 case 'whip':add(axis,[[0,base(axis)+motionDistance],[.18,base(axis)+motionDistance*.06,'easeOut'],[.35,base(axis),'easeOut'],[1,base(axis),'hold']]);break;
 case 'shake':case 'glitchEntrance':{
  const n=name==='shake'?12:8,amp=(name==='shake'?30:65)*power;
  const xx:[number,number,Ease?][]=[],yy:[number,number,Ease?][]=[];
  for(let i=0;i<=n;i++){const f=i/n, atten=name==='shake'?1:(1-f);xx.push([f,base('x')+(i===0||i===n?0:Math.sin(i*17.17)*amp*atten),'hold']);yy.push([f,base('y')+(i===0||i===n?0:Math.cos(i*22.23)*amp*atten),'hold'])}
  add('x',xx);add('y',yy);break;
 }
 case 'typewriter':{
  const chars=clip.text?.length??0;
  add('reveal',[[0,0,'hold'],[1,chars,'hold']]);
  // Create one step per character so stepping is deterministic in both preview and export.
  const steps=Math.min(chars,span),frames:Keyframe[]=[];
  for(let i=0;i<=steps;i++)frames.push({frame:local+Math.round(i*span/Math.max(1,steps)),value:Math.round(i*chars/Math.max(1,steps)),ease:'hold',manualEase:true});
  current.reveal=[...(current.reveal??[]).filter(k=>k.frame<local||k.frame>local+span),...frames].sort((a,b)=>a.frame-b.frame);
  break;
 }
 }
 return {...clip,keyframes:current};
}
