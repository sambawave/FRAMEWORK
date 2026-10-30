import {describe,it,expect} from 'vitest';
import {makeClip,newProject} from '../src/types';
import {snapEdit} from '../src/engine/snapping';
import {createShapeGeometry,shapeLabels,shapeNames} from '../src/engine/shapes';
import {trimClip} from '../src/engine/timeline';

describe('FRAMEWORK 2.2: frame-precise magnetic timeline',()=>{
 it('snaps either end of a moved clip to another clip edge',()=>{
  const p=newProject(),first=makeClip('video','V1',25),next=makeClip('video','V1',250);first.duration=100;next.duration=70;p.clips=[first,next];
  expect(snapEdit(p,first,'move',122,12,true,2)).toMatchObject({delta:125,guide:250});
  expect(snapEdit(p,first,'move',123,12,false,2)).toMatchObject({delta:123,guide:null});
  expect(snapEdit(p,first,'right',123,12,true,2)).toMatchObject({delta:125,guide:250});
 });
 it('snaps trim starts, markers and playhead; respects source handle',()=>{
  const p=newProject(),c=makeClip('video','V1',25);c.sourceStart=20;c.duration=100;p.clips=[c];p.markers=[{id:'m',frame:200}];
  const snapped=snapEdit(p,c,'left',-11,12,true,2);expect(snapped.guide).toBe(12);
  expect(trimClip(c,'left',snapped.delta).start).toBe(12);
  expect(snapEdit(p,c,'move',75,12,true,2).guide).toBe(200);
  expect(snapEdit(p,c,'move',75,12,false,2).guide).toBe(null);
 });
});
describe('FRAMEWORK 2.2: shape and audio project round trip',()=>{
 it('offers ten shape geometries',()=>{
  expect(shapeNames.length).toBe(10);
  expect(Object.keys(shapeLabels)).toEqual([...shapeNames]);
  expect(createShapeGeometry([[12,24],[112,74]])).toMatchObject({x:62,y:49,width:100,height:50});
 });
 it('retains shape geometry, stroke and individual mute/gain in .framework JSON',()=>{
  const p=newProject(),shape=makeClip('shape','V1',0),audio=makeClip('audio','A1',0),video=makeClip('video','V1',100);
  Object.assign(shape,{shape:'star',shapeSides:7,shapeWidth:110,shapeHeight:240,strokeColor:'#ff0000',strokeWidth:3});
  Object.assign(audio,{volume:.47,audioMuted:true});Object.assign(video,{volume:1.24,audioMuted:false});
  p.clips=[shape,audio,video];const saved=JSON.parse(JSON.stringify(p));
  expect(saved.clips[0]).toMatchObject({shape:'star',shapeSides:7,strokeWidth:3});
  expect(saved.clips[1]).toMatchObject({volume:.47,audioMuted:true});
  expect(saved.clips[2]).toMatchObject({volume:1.24,audioMuted:false});
 });
});
