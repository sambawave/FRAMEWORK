/** Lazy facade: existing 2D editor/tests never require the optional GPU package. */
import type {Clip} from '../types';
type GPU=typeof import('./gpuThree');let gpu:GPU|null=null,pending:Promise<void>|null=null;
export function prepareThree():Promise<void>{if(!pending)pending=import('./gpuThree').then(m=>{gpu=m;if(typeof window!=='undefined')window.dispatchEvent(new Event('framework:3d-ready'))}).catch(e=>{pending=null;throw e});return pending}
export function threeSupported():boolean{if(typeof document==='undefined')return false;try{const c=document.createElement('canvas');return !!(c.getContext('webgl2')||c.getContext('webgl'))}catch{return false}}
export function renderThreeClip(c:Clip,frame:number,size?:number):HTMLCanvasElement|null{
 if(!gpu){void prepareThree().catch(e=>console.warn('3D engine failed to load',e));return null}
 return gpu.renderThreeClip(c,frame,size);
}
