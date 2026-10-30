import {describe,it,expect} from 'vitest';
import {makeClip,newProject} from '../src/types';
import {addEffect,evaluate,resolvedEase,splitClip,valueAt,validateProject} from '../src/engine/timeline';
import {createMotionKeys,initialMotionOptions} from '../src/engine/motionPresets';

// Actual interpolation results, not a test for presence of CSS or controls.
describe('2.6 Smooth Keyframes regression',()=>{
 it('switches the same automatic animation between linear and eased immediately',()=>{
  const clip=makeClip('shape','V1',0);clip.keyframes.x=[{frame:0,value:0,ease:'easeInOut',autoEase:true},{frame:100,value:100,ease:'linear',autoEase:true}];
  clip.smoothEasing=false;
  for(const t of [0,10,25,40,50,60,75,90,100])expect(valueAt(clip,'x',t)).toBeCloseTo(t,9);
  clip.smoothEasing=true;
  expect(valueAt(clip,'x',25)).toBeCloseTo(10.3515625,8);
  expect(valueAt(clip,'x',75)).toBeCloseTo(89.6484375,8);
  expect(valueAt(clip,'x',50)).toBeCloseTo(50,9);
  clip.smoothEasing=false;expect(valueAt(clip,'x',25)).toBeCloseTo(25,9);
 });
 it('preserves explicit easing and keyframe values when toggled',()=>{
  const clip=makeClip('text','V1',10);clip.keyframes.opacity=[{frame:0,value:0,ease:'easeOut',manualEase:true},{frame:100,value:1,ease:'linear'}];
  for(const smooth of [false,true]){clip.smoothEasing=smooth;expect(valueAt(clip,'opacity',35)).toBeCloseTo(.4375,9);expect(clip.keyframes.opacity?.[0].ease).toBe('easeOut')}
  clip.keyframes.opacity![0]={frame:0,value:0,ease:'easeInOut',manualEase:true};clip.smoothEasing=false;
  expect(valueAt(clip,'opacity',35)).toBeCloseTo(.103515625,9);
 });
 it('legacy automatic eased keys are reversible without modifying saved curves',()=>{
  const clip=makeClip('text','V1',0);clip.keyframes.x=[{frame:0,value:0,ease:'easeInOut'},{frame:100,value:100,ease:'linear'}];
  clip.smoothEasing=false;expect(valueAt(clip,'x',25)).toBe(25);
  clip.smoothEasing=true;expect(valueAt(clip,'x',25)).toBeCloseTo(10.3515625,8);
  expect(clip.keyframes.x?.[0].ease).toBe('easeInOut');
 });
 it('maintains explicitly linear legacy edits and Hold',()=>{
  const keys=[{frame:0,value:0,ease:'linear' as const},{frame:100,value:100,ease:'linear' as const}];
  expect(evaluate(keys,0,25,true)).toBe(25);
  expect(evaluate([{...keys[0],ease:'hold'},keys[1]],0,75,true)).toBe(0);
  expect(resolvedEase({...keys[0],autoEase:true},true)).toBe('easeInOut');
 });
 it('applies toggles to effect parameter keyframes through the shared evaluator',()=>{
  const c=makeClip('text','V1',0);const e=addEffect(c,'invert').effects[0];
  e.keyframes=[{frame:0,value:0,ease:'easeInOut',autoEase:true},{frame:100,value:100,ease:'linear',autoEase:true}];
  expect(evaluate(e.keyframes,e.amount,25,false)).toBe(25);
  expect(evaluate(e.keyframes,e.amount,25,true)).toBeCloseTo(10.3515625,8);
 });
 it('keeps motion-preset authored interpolation separate from automatic smoothing',()=>{
  const p=newProject();const c=makeClip('text','V1',0);
  const animated=createMotionKeys(c,p,0,'slideIn',{...initialMotionOptions,ease:'easeOut'});
  expect(animated.keyframes.x?.[0].manualEase).toBe(true);
  expect(resolvedEase(animated.keyframes.x![0],false)).toBe('easeOut');
 });
 it('round-trips a toggle and explicit per-keyframe interpolation',()=>{
  const p=newProject(),c=makeClip('shape','V1',0);c.smoothEasing=false;c.keyframes.scale=[{frame:0,value:1,ease:'easeInOut',manualEase:true},{frame:50,value:2,ease:'linear'}];p.clips.push(c);
  const q=validateProject(JSON.parse(JSON.stringify(p)));
  expect(q.clips[0].smoothEasing).toBe(false);
  expect(q.clips[0].keyframes.scale?.[0].manualEase).toBe(true);
  expect(valueAt(q.clips[0],'scale',12)).toBeCloseTo(valueAt(c,'scale',12),10);
 });
 it('split and evaluate use the same smoothing as normal playback',()=>{
  const p=newProject(),c=makeClip('text','V1',0);c.duration=100;c.smoothEasing=false;
  c.keyframes.x=[{frame:0,value:0,ease:'easeInOut'},{frame:100,value:100,ease:'linear'}];p.clips.push(c);
  expect(splitClip(p,c.id,25).clips[0].keyframes.x?.at(-1)?.value).toBe(25);
 });
});
