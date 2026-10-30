import {describe,it,expect} from 'vitest';
import {THEMES,hsvToRgb,rgbToHsv,rgbToHex,hexToRgb,rgbToHsl,hslToRgb,sanitizeColors} from '../src/theme/themes';
import {textCharacterState} from '../src/engine/textAnimation';
import {makeClip,newProject} from '../src/types';
import {valueAt,validateProject} from '../src/engine/timeline';

describe('FRAMEWORK 2.4 themes',()=>{
 it('retains the default color palette',()=>expect(THEMES[0].colors.accent).toBe('#e6a14a'));
 it('validates custom theme values',()=>{
  const cleaned=sanitizeColors({accent:'url(javascript:bad)',shadow:999,brightness:-10});
  expect(cleaned.accent).toBe(THEMES[0].colors.accent);expect(cleaned.shadow).toBe(200);expect(cleaned.brightness).toBe(0);
 });
 it.each(['#ff0044','#00cc99','#4466aa','#ffffff'])('round-trips RGB / HSV and HSL: %s',value=>{
  const rgb=hexToRgb(value);expect(rgbToHex(...hsvToRgb(...rgbToHsv(...rgb)))).toBe(value);
  const hslRGB=hslToRgb(...rgbToHsl(...rgb));expect(hslRGB.every((v,i)=>Math.abs(v-rgb[i])<=3)).toBe(true);
 });
});
describe('FRAMEWORK 2.4 text animations',()=>{
 const animation={mode:'cascade' as const,duration:30,delay:4,intensity:100,loop:false};
 it('starts transparent and finishes visible',()=>{expect(textCharacterState(animation,0,0,4).opacity).toBe(0);expect(textCharacterState(animation,40,0,4).opacity).toBe(1)});
 it('respects per-character staggering',()=>expect(textCharacterState(animation,4,2,4).opacity).toBe(0));
 it('evaluates deterministically',()=>expect(textCharacterState({...animation,mode:'wave'},9,3,6)).toEqual(textCharacterState({...animation,mode:'wave'},9,3,6)));
});
describe('FRAMEWORK 2.4 project backward compatibility and numeric animation',()=>{
 it('loads older project schema with new scales defaulting to one',()=>{
  const c=makeClip('shape','V1',0);delete c.transform.scaleX;delete c.transform.scaleY;
  expect(valueAt(c,'scaleX',0)).toBe(1);expect(valueAt(c,'scaleY',0)).toBe(1);
 });
 it('preserves text and 3D properties through JSON',()=>{
  const p=newProject();const c=makeClip('text','V1',0);c.textAnimation={mode:'typewriter',duration:25,delay:3,intensity:80,loop:false};c.characters={0:{color:'#ff0000',opacity:.8}};
  const mesh=makeClip('3d','V2',0);mesh.three={primitive:'torus',rotationX:0,rotationY:30,rotationZ:0,depth:0,scaleX:1,scaleY:1,scaleZ:1,roughness:.2,metalness:.8,emissive:'#000000',wireframe:false,lighting:1};
  mesh.keyframes.rotationY=[{frame:0,value:0,ease:'linear'},{frame:30,value:90,ease:'linear'}];p.clips=[c,mesh];
  const reopen=validateProject(JSON.parse(JSON.stringify(p)));
  expect(reopen.clips[0].characters?.[0].color).toBe('#ff0000');expect(reopen.clips[1].three?.primitive).toBe('torus');expect(valueAt(reopen.clips[1],'rotationY',15)).toBe(45);
 });
});
