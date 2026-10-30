import {describe,it,expect} from 'vitest';
import {makeClip,newProject} from '../src/types';
import {applyChromaPixels,cssFilter} from '../src/engine/compositor';
import {evaluate,sourceTime,splitClip,trimClip} from '../src/engine/timeline';

describe('FRAMEWORK 2.0 real editing operators',()=>{
 it('keys green pixels transparent but retains red pixels',()=>{
  const pixels=new Uint8ClampedArray([0,255,0,255,255,0,0,255]);
  applyChromaPixels(pixels,{id:'key',type:'chroma',amount:25,softness:10,spill:30,enabled:true});
  expect(pixels[3]).toBe(0);expect(pixels[7]).toBe(255);
 });
 it('preserves compositing filters with chroma in stack',()=>{
  const c=makeClip('video','V1',0);c.effects=[{id:'a',type:'contrast',amount:120,enabled:true},{id:'b',type:'chroma',amount:25,enabled:true}];
  expect(cssFilter(c)).toBe('contrast(120%)');
 });
 it('reverse source mapping is monotonic backward',()=>{
  const c=makeClip('video','V1',0);c.duration=60;c.reverse=true;
  const p=newProject();expect(sourceTime(c,0,p)).toBeCloseTo(59/30,5);
  expect(sourceTime(c,59,p)).toBe(0);
  c.speed=2;expect(sourceTime(c,0,p)).toBeCloseTo(118/30,5);
 });
 it('speed mapping matches 2x playback',()=>{
  const c=makeClip('video','V1',5),p=newProject();c.speed=2;
  expect(sourceTime(c,35,p)).toBe(2);
 });
 it('split reverse clip updates source ranges',()=>{
  const p=newProject(),c=makeClip('video','V1',0);c.duration=90;c.reverse=true;p.clips.push(c);
  const q=splitClip(p,c.id,30);expect(sourceTime(q.clips[0],0,p)).toBeCloseTo(89/30);
  expect(sourceTime(q.clips[1],30,p)).toBeCloseTo(59/30);
  const trim=trimClip(c,'left',10);expect(sourceTime(trim,10,p)).toBeCloseTo(79/30);
 });
 it('easy easing accelerates and decelerates more smoothly than linear',()=>{
  const a=[{frame:0,value:0,ease:'easeInOut' as const},{frame:100,value:100,ease:'linear' as const}];
  expect(evaluate(a,0,10)).toBeLessThan(10);expect(evaluate(a,0,90)).toBeGreaterThan(90);
  for(const ease of ['bounce','back','elastic'] as const)expect(Number.isFinite(evaluate([{...a[0],ease},a[1]],0,42))).toBe(true);
 });
});
