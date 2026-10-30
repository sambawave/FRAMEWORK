import {describe,it,expect} from 'vitest';
import {makeClip,newProject} from '../src/types';
import {motionCatalog,createMotionKeys,initialMotionOptions} from '../src/engine/motionPresets';
import {applyPixelEffect} from '../src/engine/pixelEffects';
import {peaksFromPCM} from '../src/engine/waveform';
import {maskPointsAt,setMaskAt,startMaskAnimation} from '../src/engine/masks';
import {rippleDelete,splitClip,evaluate} from '../src/engine/timeline';
describe('FRAMEWORK professional upgrade real engines',()=>{
 it('every listed motion preset produces editable numeric keys',()=>{
  const p=newProject(),c=makeClip('text','V1',0);c.duration=120;
  for(const item of motionCatalog){const output=createMotionKeys(c,p,0,item.id,{...initialMotionOptions,duration:24});
   expect(Object.values(output.keyframes).some(keys=>keys && keys.length>=2),item.id).toBe(true);
   for(const keys of Object.values(output.keyframes))for(const k of keys??[])expect(k.frame).toBeGreaterThanOrEqual(0);
  }
 });
 it('typewriter reveals real text at per-character keyframes',()=>{
  const c=makeClip('text','V1',0),p=newProject();c.text='FRAMEWORK';c.duration=100;
  const result=createMotionKeys(c,p,0,'typewriter',{...initialMotionOptions,duration:36});
  expect(evaluate(result.keyframes.reveal,c.text.length,0)).toBe(0);
  expect(evaluate(result.keyframes.reveal,c.text.length,36)).toBe(c.text.length);
 });
 it('animated mask vertex positions interpolate at arbitrary composition frames',()=>{
  const c=makeClip('shape','V1',0);c.duration=80;c.mask='polygon';c.maskPoints=[[-1,-1],[0,-1],[0,1]];
  Object.assign(c,startMaskAnimation(c,0));Object.assign(c,setMaskAt(c,20,[[0,-1],[1,-1],[1,1]]));
  expect(maskPointsAt(c,10)[0][0]).toBeCloseTo(-.5);
  const p=newProject();p.clips.push(c);const divided=splitClip(p,c.id,10);
  expect(divided.clips[1].maskKeyframes?.[0].frame).toBe(0);
 });
 it('ripple delete moves later clips only in the deleted track',()=>{
  const p=newProject(),a=makeClip('video','V1',0),b=makeClip('video','V1',150),c=makeClip('video','V2',150);a.duration=100;p.clips=[a,b,c];
  const q=rippleDelete(p,a.id);expect(q.clips.map(x=>x.start)).toEqual([50,150]);
 });
 it('effect processing changes actual RGBA samples',()=>{
  const values=new Uint8ClampedArray([110,100,90,255,180,170,160,255]);
  applyPixelEffect(values,2,1,{id:'threshold',type:'threshold',amount:50,enabled:true});
  expect(values[0]).toBe(0);expect(values[4]).toBe(255);
 });
 it('waveform peaks reflect decoded PCM amplitude, not made-up values',()=>{
  const peaks=peaksFromPCM([new Float32Array([0,.2,.8,-.4])],2);
  expect(peaks[0]).toBeCloseTo(.2);expect(peaks[1]).toBeCloseTo(.8);
 });
});
