import {useEffect,useState} from 'react';
import {ContextMenu,ContextAction} from './ContextMenu';
import {useEditor} from '../store';
import {makeClip} from '../types';
import {addEffect} from '../engine/timeline';
/** Fallback for workspace surfaces without a specific local right-click menu.
 * Specialized menus retain priority because their React handlers preventDefault(). */
export function GlobalContextMenu(){
 const [at,setAt]=useState<{x:number;y:number;kind:'text'|'layer'|'workspace';target?:HTMLInputElement|HTMLTextAreaElement}|null>(null);
 useEffect(()=>{
  const onContext=(e:MouseEvent)=>{
   const el=e.target instanceof HTMLElement?e.target:null;
   if(!el?.closest('#root, .layer-create-menu, .context-menu, .shortcut-overlay, .attribute-backdrop, .dialog-backdrop, .theme-picker-backdrop, .theme-manager'))return;
   // Prevent browser menu even if a specialized component already handled it.
   const handled=e.defaultPrevented;e.preventDefault();
   if(handled){setAt(null);return}
   const target=el.closest('input,textarea') as HTMLInputElement|HTMLTextAreaElement|null;
   const text=target&&target.type!=='checkbox'&&target.type!=='range'&&target.type!=='color';
   setAt({x:e.clientX,y:e.clientY,kind:text?'text':el.closest('.timeline-clip,.track-label,.viewer-stage')?'layer':'workspace',target:text?target??undefined:undefined});
  };
  document.addEventListener('contextmenu',onContext);
  let longPress:number|undefined,start:{x:number;y:number;target:Element}|null=null;
  const down=(e:PointerEvent)=>{if(e.pointerType==='mouse'||!(e.target instanceof Element)||!e.target.closest('#root'))return;const el=e.target;
   // Don't intercept bespoke timeline/preview long-press menus or drag handles.
   if(el.closest('.timeline-clip,.track-label,.ruler-lane,.viewer-stage,.pro-slider-track'))return;
   start={x:e.clientX,y:e.clientY,target:el};longPress=window.setTimeout(()=>{if(start){setAt({x:start.x,y:start.y,kind:'workspace'});start=null}},600)};
  const move=(e:PointerEvent)=>{if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>9){clearTimeout(longPress);start=null}};
  const end=()=>{clearTimeout(longPress);start=null};
  document.addEventListener('pointerdown',down);document.addEventListener('pointermove',move);document.addEventListener('pointerup',end);document.addEventListener('pointercancel',end);
  return()=>{document.removeEventListener('contextmenu',onContext);document.removeEventListener('pointerdown',down);document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',end);document.removeEventListener('pointercancel',end);clearTimeout(longPress)};
 },[]);
 if(!at)return null;
 const editor=useEditor.getState(),selected=editor.project.clips.find(c=>c.id===editor.selected);
 const action=(label:string,run:()=>void,disabled=false):ContextAction=>({label,run,disabled});
 const items:ContextAction[]=at.kind==='text'&&at.target?[
  action('Cut · Ctrl+X',()=>{const t=at.target!;t.focus();if(t.type==='number'){void navigator.clipboard?.writeText(t.value).then(()=>{t.value='';t.dispatchEvent(new Event('input',{bubbles:true}))}).catch(()=>{})}else document.execCommand('cut')}),
  action('Copy · Ctrl+C',()=>{const t=at.target!;t.focus();if(t.type==='number')void navigator.clipboard?.writeText(t.value);else document.execCommand('copy')}),
  action('Paste · Ctrl+V',()=>{at.target!.focus();void navigator.clipboard?.readText().then(text=>{const t=at.target!;if(t.type==='number'){if(!Number.isFinite(Number(text)))throw Error('Paste a number');t.value=text}else t.setRangeText(text,t.selectionStart??0,t.selectionEnd??0,'end');t.dispatchEvent(new Event('input',{bubbles:true}))}).catch(()=>{const text=prompt('Paste text');if(text!==null){at.target!.value=text;at.target!.dispatchEvent(new Event('input',{bubbles:true}))}})}),
  action('Select All · Ctrl+A',()=>{at.target!.focus();at.target!.type==='number'?at.target!.focus():at.target!.select()})
 ]:[
  action('Undo · Ctrl+Z',()=>useEditor.getState().undo(),!editor.history.length),action('Redo · Ctrl+Shift+Z',()=>useEditor.getState().redo(),!editor.future.length),
  action('Copy Clip · Ctrl+C',()=>useEditor.getState().copy(),!selected),action('Paste Clip · Ctrl+V',()=>useEditor.getState().paste(),!editor.copied),
  action('Copy Attributes',()=>window.dispatchEvent(new CustomEvent('framework:attributes',{detail:'copy'})),!selected),action('Paste Attributes',()=>window.dispatchEvent(new CustomEvent('framework:attributes',{detail:'paste'})),!selected||!editor.attributes),
  action('Duplicate · Ctrl+D',()=>useEditor.getState().duplicate(),!selected),
  action('Split at Playhead · Ctrl+Shift+D',()=>useEditor.getState().split(),!selected),
  action('New Text Layer',()=>{const s=useEditor.getState(),track=s.project.tracks.find(t=>t.kind==='video'&&!t.locked);if(track)s.addClip(makeClip('text',track.id,s.playhead,'Title'))}),
  action('New Shape Layer',()=>{const s=useEditor.getState(),track=s.project.tracks.find(t=>t.kind==='video'&&!t.locked);if(track)s.addClip(makeClip('shape',track.id,s.playhead,'Shape'))}),
  {label:'Create track ▸',children:[action('Video track',()=>useEditor.getState().addTrack('video')),action('Audio track',()=>useEditor.getState().addTrack('audio'))]},
  action('Add Invert Effect',()=>{const s=useEditor.getState(),c=s.project.clips.find(c=>c.id===s.selected);if(c&&c.kind!=='audio')s.updateClip(c.id,{effects:addEffect(c,'invert').effects})},!selected||selected.kind==='audio'),
  action('Delete Selected · Del',()=>{const s=useEditor.getState();if(s.selected)s.removeClip(s.selected)},!selected)
 ];
 return <ContextMenu x={at.x} y={at.y} items={items} close={()=>setAt(null)}/>;
}
