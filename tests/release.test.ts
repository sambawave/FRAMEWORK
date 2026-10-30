import {describe,it,expect} from 'vitest';
import {makeClip,newProject,uuid} from '../src/types';
import {reorderTracks,insertAtVisualIndex,reorderProject,setTrackFlag} from '../src/engine/layers';
import {validateProject} from '../src/engine/timeline';
describe('2.3 release layer engine',()=>{
 it('reorders without mutating or losing track contents',()=>{
  const p=newProject();p.clips.push(makeClip('text','V2',25));
  const next=reorderProject(p,['V2'],0);
  expect(next.tracks.map(t=>t.id)).toEqual(['V2','V3','V1','A1','A2']);
  expect(next.clips).toEqual(p.clips);expect(p.tracks[0].id).toBe('V3');
  expect(validateProject(JSON.parse(JSON.stringify(next)))).toEqual(next);
 });
 it('moves multi-selection stably, ignoring invalid ids',()=>{
  const p=newProject(),ids=p.tracks.map(t=>t.id);
  const moved=insertAtVisualIndex(p.tracks,['V2','A1','missing'],5);
  expect(moved.map(t=>t.id)).toEqual(['V3','V1','A2','V2','A1']);
  expect([...moved.map(t=>t.id)].sort()).toEqual([...ids].sort());
  expect(reorderTracks(p.tracks,['missing'],0)).toBe(p.tracks);
 });
 it('stores solo, visibility, and color metadata within schema v1',()=>{
  let p=newProject();p=setTrackFlag(p,'A1','solo',true);
  p.tracks[0].color='#e6a14a';p.tracks[0].folder=true;
  expect(validateProject(JSON.parse(JSON.stringify(p))).tracks).toEqual(p.tracks);
 });
 it('stores real adjustment/null entities on timeline',()=>{
  const p=newProject();const a=makeClip('adjustment','V2',0),n=makeClip('null','V3',0);
  a.effects=[{id:uuid(),type:'invert',amount:100,enabled:true}];p.clips.push(a,n);
  expect(validateProject(JSON.parse(JSON.stringify(p))).clips[0].kind).toBe('adjustment');
 });
});
