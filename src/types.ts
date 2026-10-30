export type TrackKind = 'video'|'audio';
export type ClipKind = 'video'|'audio'|'image'|'text'|'solid'|'shape'|'adjustment'|'null'|'3d';
import type {ShapeName} from './engine/shapes';
import type {AudioEffect} from './engine/audioFx';
export type Ease = 'linear'|'hold'|'easeIn'|'easeOut'|'easeInOut'|'bounce'|'back'|'elastic';
export type AnimProp = 'x'|'y'|'scale'|'rotation'|'opacity'|'volume'|'reveal'|'scaleX'|'scaleY'|'rotationX'|'rotationY'|'rotationZ'|'depth'|'threeScaleX'|'threeScaleY'|'threeScaleZ'|'textIntensity'|'roughness'|'metalness'|'lighting';
export type Blend = 'normal'|'multiply'|'screen'|'overlay'|'lighten'|'darken'|'difference'|'add';
export type EffectType = 'brightness'|'contrast'|'saturate'|'blur'|'hue'|'grayscale'|'sepia'|'invert'|'chroma'|'pixelate'|'vignette'|'grain'|'threshold'|'posterize'|'gamma'|'rgbSplit'|'scanlines'|'glow'|'exposure';
export interface Keyframe {frame:number; value:number; ease:Ease; /** True when user or a motion preset chose this interpolation explicitly. */ manualEase?:boolean; /** Follows the layer Smooth Keyframes toggle. */ autoEase?:boolean}
export interface Effect {id:string; type:EffectType; amount:number; enabled:boolean;keyframes?:Keyframe[]; keyColor?:string; softness?:number; spill?:number}
export interface Transform {x:number; y:number; scale:number; rotation:number; opacity:number; scaleX?:number;scaleY?:number}
export interface Track {id:string; name:string; kind:TrackKind; muted:boolean; locked:boolean; hidden:boolean;solo?:boolean;color?:string;folder?:boolean;groupId?:string}
export interface MediaAsset {id:string;name:string; type:'video'|'audio'|'image';duration:number;width?:number;height?:number;mime:string;bytes:number}
export interface ThreeSettings {primitive:'cube'|'sphere'|'cylinder'|'cone'|'plane'|'torus'|'pyramid'|'capsule';rotationX:number;rotationY:number;rotationZ:number;depth:number;scaleX:number;scaleY:number;scaleZ:number;roughness:number;metalness:number;emissive:string;wireframe:boolean;lighting?:number}
export interface TextAnimation {mode:'none'|'fade'|'typewriter'|'cascade'|'wave'|'floating'|'pulse'|'shake'|'bounce'|'rotate'|'glitch'|'neon'|'zoom'|'flip'|'spiral';duration:number;delay:number;intensity:number;loop:boolean}
export interface CharTransform {x?:number;y?:number;rotation?:number;scale?:number;opacity?:number;color?:string;blur?:number}
export interface Clip {
 id:string;name:string;kind:ClipKind;mediaId?:string;trackId:string;
 start:number;duration:number;sourceStart:number;
 transform:Transform;volume:number;pan:number;audioEffects?:AudioEffect[];blend:Blend;effects:Effect[];
 keyframes:Partial<Record<AnimProp,Keyframe[]>>;
 text?:string;fontSize?:number;fontFamily?:string;fontWeight?:string;
 color?:string;shape?:ShapeName;shapeWidth?:number;shapeHeight?:number;shapeSides?:number;shapePoints?:[number,number][];shapeClosed?:boolean;strokeColor?:string;strokeWidth?:number;audioMuted?:boolean; fadeIn:number;fadeOut:number;
 lockAspect?:boolean;smoothEasing?:boolean;textAnimation?:TextAnimation;characters?:Record<number,CharTransform>;three?:ThreeSettings;parentId?:string; mask?:'none'|'rectangle'|'ellipse'|'polygon';maskPoints?:[number,number][];maskInvert?:boolean;maskKeyframes?:{frame:number;points:[number,number][]}[]; speed?:number; reverse?:boolean;
}
export interface Project {
 schema:1;id:string;name:string;width:number;height:number;
 fps:{num:number;den:number};background:string;createdAt:string;updatedAt?:string; audioSampleRate?:number; colorSpace?:string; durationFrames?:number;
 tracks:Track[];clips:Clip[];assets:MediaAsset[];markers?:{id:string;frame:number;label?:string}[];
}
export const uuid=()=>crypto.randomUUID();
export const fps=(p:Project)=>p.fps.num/p.fps.den;
export const seconds=(frame:number,p:Project)=>frame*p.fps.den/p.fps.num;
export const frameFromSeconds=(time:number,p:Project)=>Math.round(time*fps(p));
export const projectEnd=(p:Project)=>Math.max(1,p.durationFrames??1,...p.clips.map(c=>c.start+c.duration));
export function formatTimecode(frame:number,p:Project){
 const rate=fps(p), whole=Math.round(rate), f=Math.max(0,Math.floor(frame));
 const s=Math.floor(f/rate), remainder=Math.round(f-s*rate);
 const total=s+(remainder>=whole?1:0), ff=remainder>=whole?0:remainder;
 return [Math.floor(total/3600),Math.floor(total/60)%60,total%60,ff].map(v=>String(v).padStart(2,'0')).join(':');
}
export function newProject():Project{
 const now=new Date().toISOString();
 return {schema:1,id:uuid(),name:'Untitled Project',width:1280,height:720,fps:{num:30,den:1},background:'#000000',createdAt:now,
 tracks:[{id:'V3',name:'VIDEO 3',kind:'video',muted:false,locked:false,hidden:false},
 {id:'V2',name:'VIDEO 2',kind:'video',muted:false,locked:false,hidden:false},
 {id:'V1',name:'VIDEO 1',kind:'video',muted:false,locked:false,hidden:false},
 {id:'A1',name:'AUDIO 1',kind:'audio',muted:false,locked:false,hidden:false},
 {id:'A2',name:'AUDIO 2',kind:'audio',muted:false,locked:false,hidden:false}],clips:[],assets:[]};
}
export function makeClip(kind:ClipKind,trackId:string,start:number,name?:string):Clip{
 return {id:uuid(),name:name??kind.toUpperCase(),kind,trackId,start:Math.max(0,Math.round(start)),duration:150,sourceStart:0,
 transform:{x:0,y:0,scale:1,rotation:0,opacity:1,scaleX:1,scaleY:1},volume:1,pan:0,blend:'normal',effects:[],keyframes:{},
 text:'Your text here',fontSize:86,fontFamily:'Arial',fontWeight:'700',color:'#f5f5f5',shape:'rectangle',fadeIn:0,fadeOut:0,mask:'none',speed:1,reverse:false,lockAspect:true,smoothEasing:true};
}
