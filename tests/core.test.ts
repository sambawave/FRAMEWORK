import {describe,it,expect} from 'vitest';
import {fps,frameFromSeconds,makeClip,newProject,seconds} from '../src/types';
import {addEffect,evaluate,isActive,sourceTime,splitClip,trimClip,validateProject,valueAt} from '../src/engine/timeline';
import {cssFilter} from '../src/engine/compositor';
describe('integer frame timeline',()=>{
 it('handles 23.976 fps without cumulative frame drift',()=>{
  const p=newProject();p.fps={num:24000,den:1001};
  expect(fps(p)).toBeCloseTo(23.976023976,8);
  expect(seconds(24000,p)).toBe(1001);
  expect(frameFromSeconds(1001,p)).toBe(24000);
 });
 it('splits video into two correctly sourced segments',()=>{
  const p=newProject(),c=makeClip('video','V1',15);c.duration=120;c.sourceStart=30;p.clips.push(c);
  const split=splitClip(p,c.id,55);
  expect(split.clips).toHaveLength(2);
  expect(split.clips[0]).toMatchObject({start:15,duration:40,sourceStart:30});
  expect(split.clips[1]).toMatchObject({start:55,duration:80,sourceStart:70});
  expect(sourceTime(split.clips[1],55,split)).toBeCloseTo(70/30,9);
  expect(isActive(split.clips[0],55)).toBe(false);expect(isActive(split.clips[1],55)).toBe(true);
 });
 it('trims left with source offset and clamps duration',()=>{
  const c=makeClip('video','V1',100);c.duration=60;c.sourceStart=10;
  const t=trimClip(c,'left',20);expect(t.start).toBe(120);expect(t.sourceStart).toBe(30);expect(t.duration).toBe(40);
  expect(trimClip(c,'right',-100).duration).toBe(1);expect(c.start).toBe(100);
 });
 it('evaluates linear, hold and eased keyframes',()=>{
  const linear=[{frame:0,value:0,ease:'linear' as const},{frame:100,value:100,ease:'linear' as const}];
  expect(evaluate(linear,0,25)).toBe(25);
  expect(evaluate([{...linear[0],ease:'hold'},linear[1]],0,50)).toBe(0);
  expect(evaluate([{...linear[0],ease:'easeIn'},linear[1]],0,50)).toBe(25);
  expect(evaluate([{...linear[0],ease:'easeOut'},linear[1]],0,50)).toBe(75);
  expect(evaluate([{...linear[0],ease:'easeInOut'},linear[1]],0,50)).toBe(50);
 });
 it('split redistributes keyframes with interpolated boundary',()=>{
  const p=newProject(),c=makeClip('text','V1',0);c.duration=100;c.keyframes.x=[{frame:0,value:0,ease:'linear'},{frame:100,value:100,ease:'linear'}];p.clips.push(c);
  const v=splitClip(p,c.id,40);expect(v.clips[0].keyframes.x?.at(-1)?.value).toBe(40);
  expect(valueAt(v.clips[1],'x',40)).toBe(40);
  expect(valueAt(v.clips[1],'x',100)).toBe(100);
 });
 it('effects create CSS filters in stacking order',()=>{
  let c=makeClip('video','V1',0);c=addEffect(c,'brightness');c=addEffect(c,'blur');
  expect(cssFilter(c)).toContain('brightness(120%) blur(4px)');
  c.effects[0].enabled=false;expect(cssFilter(c)).toBe('blur(4px)');
 });
 it('project JSON round-trips safely',()=>{
  const p=newProject();p.clips.push(makeClip('text','V1',0));const read=validateProject(JSON.parse(JSON.stringify(p)));
  expect(read).toEqual(p);expect(()=>validateProject({...p,schema:5})).toThrow();
  expect(()=>validateProject({...p,clips:[{...p.clips[0],start:-9}]})).toThrow();
 });
});
