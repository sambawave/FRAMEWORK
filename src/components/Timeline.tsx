import {ProSlider} from './ProSlider';
import {createPortal} from 'react-dom';
import {threeSupported} from '../engine/threeScene';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Eye,EyeOff,Lock,Unlock,Volume2,VolumeX,Plus,Scissors,ZoomIn,ZoomOut,Copy,Trash2,Magnet,Maximize,GripVertical,ChevronDown,Repeat} from 'lucide-react';
import {Clip,Track,formatTimecode,frameFromSeconds,projectEnd} from '../types';
import {useEditor} from '../store';
import {trimClip,addEffect,splitClip as importedSplitClip} from '../engine/timeline';
import {importFiles} from './MediaPanel';
import {ContextMenu,ContextAction} from './ContextMenu';
import {loadWaveform} from '../engine/waveform';
import {snapEdit} from '../engine/snapping';
import {insertAtVisualIndex} from '../engine/layers';
import {makeClip,uuid} from '../types';
type DragState={id:string;original:Clip;mode:'move'|'left'|'right';delta:number;track?:string};
const HEAD=194,ROW=54;
const clampZoom=(z:number)=>Math.max(.15,Math.min(32,z));
export function Timeline(){
 const p=useEditor(s=>s.project),selected=useEditor(s=>s.selected),selectedIds=useEditor(s=>s.selectedIds),frame=useEditor(s=>s.playhead),zoom=useEditor(s=>s.zoom),urls=useEditor(s=>s.mediaUrls);
 const loopPlayback=useEditor(s=>s.loopPlayback);const snapping=useEditor(s=>s.snapping);const tool=useEditor(s=>s.tool);const [context,setContext]=useState<{x:number;y:number;id:string}|null>(null);
 const pinchRef=useRef<{distance:number;zoom:number}|null>(null);
 const [layerSelection,setLayerSelection]=useState<string[]>([]);const [layerDrag,setLayerDrag]=useState<{ids:string[];startY:number;dy:number;from:number}|null>(null);
 const [rulerContext,setRulerContext]=useState<{x:number;y:number;frame:number}|null>(null);
 const [layerMenu,setLayerMenu]=useState(false),[layerMenuAt,setLayerMenuAt]=useState({x:20,y:40}),[trackContext,setTrackContext]=useState<{x:number;y:number;id:string}|null>(null),[emptyContext,setEmptyContext]=useState<{x:number;y:number}|null>(null),[renaming,setRenaming]=useState<string|null>(null),[renamed,setRenamed]=useState('');
 useEffect(()=>{if(!layerMenu)return;const close=(e:PointerEvent)=>{if(!(e.target as HTMLElement)?.closest('.layer-create-menu,.layer-add-btn'))setLayerMenu(false)};const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setLayerMenu(false)};document.addEventListener('pointerdown',close);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',escape)}},[layerMenu]);
 const layerPicker=useRef<HTMLInputElement>(null),pendingMedia=useRef<'video'|'audio'|'image'>('video');
 const [waveforms,setWaveforms]=useState<Record<string,Float32Array>>({});
 useEffect(()=>{let alive=true;for(const a of p.assets){if(a.type!=='audio'||waveforms[a.id]||!urls[a.id])continue;void loadWaveform(a.id).then(v=>{if(alive)setWaveforms(w=>({...w,[a.id]:v}))}).catch(()=>{})}return()=>{alive=false}},[p.assets,urls,waveforms]);
 const [snapGuide,setSnapGuide]=useState<number|null>(null);const [drag,setDrag]=useState<DragState|null>(null);const [marquee,setMarquee]=useState(false);const scroll=useRef<HTMLDivElement>(null);
 const total=Math.max(900,projectEnd(p)+200);const pixels=total*zoom;
 const ruler=useMemo(()=>{const interval=zoom>=3?1:zoom>=1?2:5;const result:number[]=[];for(let sec=0;sec<=total*p.fps.den/p.fps.num;sec+=interval)result.push(sec);return result},[total,zoom,p.fps]);
 /** Preview reordering changes the renderer's stacking order immediately. One undo step on release. */
 function dragLayer(e:React.PointerEvent,track:Track){
  if(e.button!==0)return;e.preventDefault();e.stopPropagation();
  const before=structuredClone(useEditor.getState().project),initial=before.tracks.findIndex(t=>t.id===track.id);
  const ids=layerSelection.includes(track.id)?layerSelection.filter(id=>before.tracks.some(t=>t.id===id)):[track.id];
  setLayerSelection(ids);const startY=e.clientY;let changed=false;
  setLayerDrag({ids,startY,dy:0,from:initial});
  const move=(ev:PointerEvent)=>{const dy=ev.clientY-startY;
   const target=Math.max(0,Math.min(before.tracks.length,Math.round(initial+dy/ROW)));
   const next=insertAtVisualIndex(before.tracks,ids,target);
   const now=useEditor.getState().project.tracks;
   if(now.map(t=>t.id).join()!==next.map(t=>t.id).join()){changed=true;useEditor.getState().previewTracks(next)}
   setLayerDrag({ids,startY,dy,from:initial});
  };
  const finish=(commit:boolean)=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',cancel);setLayerDrag(null);
   if(!commit)useEditor.getState().previewTracks(before.tracks);else if(changed)useEditor.getState().finishTrackPreview(before)
  };
  const up=()=>finish(true),cancel=()=>finish(false);
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',cancel);
 }
 function selectTrack(e:React.MouseEvent,id:string){if(e.ctrlKey||e.metaKey){setLayerSelection(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);return}
  if(e.shiftKey&&layerSelection.length){const from=p.tracks.findIndex(t=>t.id===layerSelection[layerSelection.length-1]),to=p.tracks.findIndex(t=>t.id===id);setLayerSelection(p.tracks.slice(Math.min(from,to),Math.max(from,to)+1).map(t=>t.id));return}
  setLayerSelection([id]);const c=p.clips.find(c=>c.trackId===id);if(c)useEditor.getState().setSelected(c.id);
 }
 function createLayer(kind:'video'|'audio'|'image'|'text'|'shape'|'solid'|'adjustment'|'null'|'group'|'3d'){
  setLayerMenu(false);
  if(kind==='3d'&&!threeSupported()){alert('WebGL is unavailable on this device or browser. 3D objects require GPU-accelerated WebGL.');return}
  if(kind==='video'||kind==='audio'||kind==='image'){pendingMedia.current=kind;layerPicker.current?.click();return}
  const name={text:'Text',shape:'Shape',solid:'Solid',adjustment:'Adjustment',null:'Null',group:'Group','3d':'3D Object'}[kind];
  const trackId=uuid();const t:Track={id:trackId,name:`${name} ${p.tracks.length+1}`,kind:'video',locked:false,muted:false,hidden:false,color:'#d3a16b',folder:kind==='group'};
  const c=kind==='group'?null:makeClip(kind,trackId,frame,name);
  if(c&&kind==='shape')c.color='#e6a14a';if(c&&kind==='solid')c.color='#484651';if(c&&kind==='3d')c.color='#e6a14a';
  useEditor.getState().edit(proj=>({...proj,tracks:[t,...proj.tracks],clips:c?[...proj.clips,c]:proj.clips}));
  if(c)useEditor.getState().setSelected(c.id);
  setLayerSelection([trackId]);
 }
 async function createImportedLayer(files:FileList|null){if(!files?.length)return;
  const kind=pendingMedia.current;const result=await importFiles(Array.from(files));const ok=result.find(r=>r.ok);if(!ok)return;
  const state=useEditor.getState(),a=[...state.project.assets].reverse().find(a=>a.name===ok.name&&a.type===kind);if(!a)return;
  const id=uuid(),track:Track={id,name:a.name,kind:kind==='audio'?'audio':'video',muted:false,locked:false,hidden:false};
  state.edit(pr=>({...pr,tracks:[track,...pr.tracks]}));state.insertAsset(a.id,id,frame);setLayerSelection([id]);
 }
 function renameTrack(id:string,name:string){if(name.trim())useEditor.getState().edit(pr=>({...pr,tracks:pr.tracks.map(t=>t.id===id?{...t,name:name.trim()}:t)}));setRenaming(null)}
 function trackMenu(id:string):ContextAction[]{const t=useEditor.getState().project.tracks.find(t=>t.id===id);if(!t)return[];
  const flag=(key:'hidden'|'locked'|'muted'|'solo')=>useEditor.getState().edit(p=>({...p,tracks:p.tracks.map(v=>v.id===id?{...v,[key]:!v[key]}:v)}));
  return [
   {label:'Rename layer',run:()=>{setRenaming(id);setRenamed(t.name)}},
   {label:'Duplicate layer and clips',run:()=>useEditor.getState().edit(pr=>{const tid=uuid(),index=pr.tracks.findIndex(v=>v.id===id);return {...pr,tracks:[...pr.tracks.slice(0,index+1),{...t,id:tid,name:t.name+' Copy'},...pr.tracks.slice(index+1)],clips:[...pr.clips,...pr.clips.filter(c=>c.trackId===id).map(c=>({...structuredClone(c),id:uuid(),trackId:tid}))]}})},
   {label:t.hidden?'Show layer':'Hide layer',run:()=>flag('hidden')},{label:t.locked?'Unlock layer':'Lock layer',run:()=>flag('locked')},
   {label:t.solo?'Unsolo layer':'Solo layer',run:()=>flag('solo')},{label:t.muted?'Unmute layer':'Mute layer',run:()=>flag('muted')},
   {label:'Color label…',run:()=>{const color=prompt('Layer label color (#RRGGBB)',t.color??'#e6a14a');if(color&&/^#[0-9a-f]{6}$/i.test(color))useEditor.getState().edit(pr=>({...pr,tracks:pr.tracks.map(v=>v.id===id?{...v,color}:v)}))}},
   {label:'Group selected layers',disabled:layerSelection.length<2,run:()=>{const ids=layerSelection;const gid=uuid();useEditor.getState().edit(pr=>({...pr,tracks:[{id:gid,name:'Group',kind:'video',muted:false,locked:false,hidden:false,folder:true},...pr.tracks.map(t=>ids.includes(t.id)?{...t,groupId:gid}:t)]}));setLayerSelection([gid])}},
   {label:'Remove layer and its clips',danger:true,run:()=>{if(confirm(`Remove layer ${t.name} and its clips? Media files remain stored.`))useEditor.getState().edit(pr=>({...pr,tracks:pr.tracks.filter(x=>x.id!==id),clips:pr.clips.filter(c=>c.trackId!==id)}))}}
  ];
 }
 function zoomAt(nextValue:number,clientX?:number){
  const node=scroll.current;if(!node)return;
  const next=clampZoom(nextValue);
  const viewportX=clientX===undefined?Math.max(HEAD,node.clientWidth*.5):clientX-node.getBoundingClientRect().left;
  const anchorFrame=clientX===undefined?frame:Math.max(0,(node.scrollLeft+viewportX-HEAD)/zoom);
  useEditor.getState().setZoom(next);
  requestAnimationFrame(()=>{if(scroll.current)scroll.current.scrollLeft=Math.max(0,HEAD+anchorFrame*next-viewportX)});
 }
 function fitTimeline(){const node=scroll.current;if(!node)return;const next=clampZoom((node.clientWidth-HEAD-26)/Math.max(1,projectEnd(p)+12));useEditor.getState().setZoom(next);node.scrollLeft=0}
 useEffect(()=>{const el=scroll.current;if(!el)return;
  const wheel=(ev:WheelEvent)=>{if(ev.ctrlKey){ev.preventDefault();zoomAt(zoom*Math.exp(-ev.deltaY*.003),ev.clientX)}};
  el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel);
 },[zoom,frame]);
 useEffect(()=>{const el=scroll.current;if(!el)return;
  const ruler=el.querySelector('.ruler-row');if(!ruler)return;
  const onWheel=(e:Event)=>{const wheel=e as WheelEvent;if(wheel.ctrlKey)return;wheel.preventDefault();
   el.scrollLeft+=Math.abs(wheel.deltaX)>Math.abs(wheel.deltaY)?wheel.deltaX:wheel.deltaY;
  };
  ruler.addEventListener('wheel',onWheel,{passive:false});return()=>ruler.removeEventListener('wheel',onWheel);
 },[]);
 useEffect(()=>{const el=scroll.current;if(!el)return;
  const start=(e:TouchEvent)=>{if(e.touches.length===2){const a=e.touches[0],b=e.touches[1];pinchRef.current={distance:Math.max(1,Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)),zoom:useEditor.getState().zoom}}};
  const move=(e:TouchEvent)=>{if(e.touches.length!==2||!pinchRef.current)return;e.preventDefault();const a=e.touches[0],b=e.touches[1];zoomAt(pinchRef.current.zoom*Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)/pinchRef.current.distance,(a.clientX+b.clientX)/2)};
  const end=(e:TouchEvent)=>{if(e.touches.length<2)pinchRef.current=null};
  el.addEventListener('touchstart',start,{passive:true});el.addEventListener('touchmove',move,{passive:false});el.addEventListener('touchend',end);el.addEventListener('touchcancel',end);
  return()=>{el.removeEventListener('touchstart',start);el.removeEventListener('touchmove',move);el.removeEventListener('touchend',end);el.removeEventListener('touchcancel',end)};
 },[zoom]);
 function longPress(e:React.PointerEvent,action:(x:number,y:number)=>void){if(e.pointerType==='mouse')return;
  const x=e.clientX,y=e.clientY;let cancelled=false;
  const timer=window.setTimeout(()=>{if(!cancelled){action(x,y);cancelled=true;cleanup()}},570);
  const moved=(v:PointerEvent)=>{if(Math.hypot(v.clientX-x,v.clientY-y)>11)cleanup()};const cleanup=()=>{cancelled=true;clearTimeout(timer);window.removeEventListener('pointermove',moved);window.removeEventListener('pointerup',cleanup);window.removeEventListener('pointercancel',cleanup)};
  window.addEventListener('pointermove',moved);window.addEventListener('pointerup',cleanup);window.addEventListener('pointercancel',cleanup);
 }
 function scrub(e:React.PointerEvent<HTMLElement>){if(e.button!==0)return;const origin=(e.currentTarget as HTMLElement).getBoundingClientRect().left;const start=useEditor.getState().project;const doScrub=(x:number)=>useEditor.getState().setPlayhead(Math.round((x-origin)/zoom));useEditor.getState().setPlaying(false);doScrub(e.clientX);
  const move=(ev:PointerEvent)=>doScrub(ev.clientX);const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up)};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);void start;
 }
 function startDrag(e:React.PointerEvent,clip:Clip,mode:DragState['mode']){
  if(e.button!==0)return;
  if(p.tracks.find(t=>t.id===clip.trackId)?.locked)return;
  e.stopPropagation();e.preventDefault();const sel=useEditor.getState();if(e.ctrlKey||e.metaKey){sel.toggleSelected(clip.id,true);return}if(e.shiftKey){const row=p.clips.filter(c=>c.trackId===clip.trackId).sort((a,b)=>a.start-b.start);const anchor=row.findIndex(c=>c.id===sel.selected);const end=row.findIndex(c=>c.id===clip.id);if(anchor>=0&&end>=0){sel.setSelectedIds(row.slice(Math.min(anchor,end),Math.max(anchor,end)+1).map(c=>c.id));return}}if(!sel.selectedIds.includes(clip.id))sel.setSelected(clip.id);sel.setPlaying(false);
  if(tool==='razor'&&mode==='move'){const bounds=(e.currentTarget as HTMLElement).getBoundingClientRect();const at=clip.start+Math.round((e.clientX-bounds.left)/zoom);useEditor.getState().setPlayhead(at);useEditor.getState().edit(p=>importedSplitClip(p,clip.id,at));return}
  const x=e.clientX;let final=0;let target=clip.trackId;
  const move=(ev:PointerEvent)=>{const raw=Math.round((ev.clientX-x)/zoom);const snap=snapEdit(useEditor.getState().project,clip,mode,raw,useEditor.getState().playhead,useEditor.getState().snapping&&!ev.altKey,useEditor.getState().zoom);final=snap.delta;setSnapGuide(snap.guide);
   const row=(document.elementFromPoint(ev.clientX,ev.clientY) as HTMLElement|null)?.closest<HTMLElement>('[data-track]');
   const tr=p.tracks.find(t=>t.id===row?.dataset.track);
   if(mode==='move'&&tr&&!tr.locked&&tr.kind===(clip.kind==='audio'?'audio':'video'))target=tr.id;
   setDrag({id:clip.id,original:clip,mode,delta:final,track:target})};
  const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);setDrag(null);setSnapGuide(null);if(final!==0||(mode==='move'&&target!==clip.trackId)){const store=useEditor.getState(),ids=store.selectedIds;if(mode==='move'&&ids.length>1&&ids.includes(clip.id)){store.edit(pr=>({...pr,clips:pr.clips.map(cc=>ids.includes(cc.id)?{...cc,start:Math.max(0,cc.start+final)}:cc)}))}else store.moveOrTrim(clip.id,mode,clip,final,target)}};
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);
 }
 async function dropMedia(e:React.DragEvent,track:Track){e.preventDefault();const mediaId=e.dataTransfer.getData('application/x-framework-asset');const raw=Math.round((e.clientX-e.currentTarget.getBoundingClientRect().left)/zoom);const temp={...useEditor.getState().project.clips[0],id:'__insertion__',start:raw,duration:1,sourceStart:0} as Clip;const near=snapping?snapEdit(p,temp,'move',0,frame,true,zoom).delta+raw:raw;
  if(mediaId)useEditor.getState().insertAsset(mediaId,track.id,Math.max(0,near));
  else if(e.dataTransfer.files.length){const imported=await importFiles(e.dataTransfer.files);const a=useEditor.getState().project.assets.find(a=>a.name===imported.find(x=>x.ok)?.name);if(a)useEditor.getState().insertAsset(a.id,track.id,Math.max(0,near))}
 }
 const contextActions=(id:string):ContextAction[]=>{const c=useEditor.getState().project.clips.find(c=>c.id===id);if(!c)return[];const act=(patch:Partial<Clip>)=>useEditor.getState().updateClip(id,patch);return [
  {label:'Ripple delete',run:()=>{useEditor.getState().setSelected(id);useEditor.getState().rippleDelete()}},
  {label:'Rename clip',run:()=>{const n=prompt('Clip name',c.name);if(n?.trim())act({name:n.trim()})}},
  {label:'Copy Attributes',run:()=>{useEditor.getState().setSelected(id);window.dispatchEvent(new CustomEvent('framework:attributes',{detail:'copy'}))}},{label:'Paste Attributes to Selection',disabled:!useEditor.getState().attributes,run:()=>window.dispatchEvent(new CustomEvent('framework:attributes',{detail:'paste'}))},{label:'Copy',run:()=>{useEditor.getState().setSelected(id);useEditor.getState().copy()}},{label:'Duplicate',run:()=>{useEditor.getState().setSelected(id);useEditor.getState().duplicate()}},{label:'Split at playhead',run:()=>useEditor.getState().edit(p=>importedSplitClip(p,id,useEditor.getState().playhead))},
  {label:'Trim start to playhead',run:()=>{const f=useEditor.getState().playhead;if(f>c.start&&f<c.start+c.duration)act(trimClip(c,'left',f-c.start))}},
  {label:'Trim end to playhead',run:()=>{const f=useEditor.getState().playhead;if(f>c.start&&f<c.start+c.duration)act(trimClip(c,'right',f-c.start-c.duration))}},
  {label:'Reverse video',run:()=>act({reverse:!c.reverse}),disabled:c.kind!=='video'},
  {label:'Fade in · 15 frames',run:()=>act({fadeIn:15})},{label:'Fade out · 15 frames',run:()=>act({fadeOut:15})},
  {label:'Add Invert effect',run:()=>act({effects:addEffect(c,'invert').effects}),disabled:c.kind==='audio'},
  {label:'Remove effects',run:()=>act({effects:[]})},
  {label:'Delete',run:()=>useEditor.getState().removeClip(id),danger:true}]} ;
 const trackFlag=(id:string,key:'muted'|'hidden'|'locked'|'solo')=>useEditor.getState().edit(p=>({...p,tracks:p.tracks.map(t=>t.id===id?{...t,[key]:!t[key]}:t)}));
 return <section className="timeline pane">
  <div className="timeline-header"><div className="timeline-heading"><strong>TIMELINE</strong><span className="small-dim">{p.clips.length} clips</span></div>
  <div className="timeline-actions"><div className="layer-add-anchor"><button className="layer-add-btn" title="Create layer (+)" aria-expanded={layerMenu} onClick={e=>{const rect=e.currentTarget.getBoundingClientRect();setLayerMenuAt({x:Math.max(8,Math.min(innerWidth-220,rect.left)),y:Math.max(8,Math.min(innerHeight-370,rect.bottom+5))});setLayerMenu(x=>!x)}}><Plus size={17}/><ChevronDown size={11}/></button>{layerMenu&&createPortal(<div className="layer-create-menu layer-create-portal" role="menu" style={{left:layerMenuAt.x,top:layerMenuAt.y}}>{(['video','audio','image','text','shape','3d','solid','adjustment','null','group'] as const).map(kind=><button key={kind} role="menuitem" onClick={()=>createLayer(kind)}>{kind==='null'?'Null Object':kind==='adjustment'?'Adjustment Layer':kind==='group'?'Group Folder':kind==='3d'?'3D Object':kind[0].toUpperCase()+kind.slice(1)+' Layer'}</button>)}<div className="layer-menu-hint">Precompositions: planned; no fake controls.</div></div>,document.body)}</div><input hidden ref={layerPicker} type="file" accept={pendingMedia.current==='video'?'video/*':pendingMedia.current==='audio'?'audio/*':'image/*'} onChange={e=>{void createImportedLayer(e.target.files);e.target.value=''}}/><button title="Split selected clip at playhead (Ctrl+Shift+D)" disabled={!selected} onClick={()=>useEditor.getState().split()}><Scissors size={15}/> Split</button><button title="Duplicate selected clip (Ctrl+D)" disabled={!selected} onClick={()=>useEditor.getState().duplicate()}><Copy size={14}/></button><button title="Delete selected clip" disabled={!selected} onClick={()=>selected&&useEditor.getState().removeClip(selected)}><Trash2 size={15}/></button><span className="toolbar-divider"/><button title="New video track" onClick={()=>useEditor.getState().addTrack('video')}><Plus size={13}/> Video</button><button title="New audio track" onClick={()=>useEditor.getState().addTrack('audio')}><Plus size={13}/> Audio</button></div>
  <div className="zoom-controls"><button className={snapping?'active':''} aria-pressed={snapping} title="Magnetic Snapping (hold Alt during drag to bypass)" onClick={()=>useEditor.getState().setSnapping(!snapping)}><Magnet size={15}/></button><button title="Loop Playback" className={loopPlayback?'active':''} aria-pressed={loopPlayback} onClick={()=>useEditor.getState().setLoopPlayback(!loopPlayback)}><Repeat size={15}/></button><button title="Add marker at playhead" onClick={()=>useEditor.getState().edit(pr=>({...pr,markers:[...(pr.markers??[]),{id:crypto.randomUUID(),frame, label:`Marker ${((pr.markers??[]).length+1)}`}]}))}>M+</button><button title="Zoom out around playhead" onClick={()=>zoomAt(zoom/1.35)}><ZoomOut size={16}/></button><ProSlider label="Zoom" defaultValue={100} min={15} max={3200} step={1} unit="%" value={Math.round(zoom*100)} onChange={v=>zoomAt(v/100)}/><button title="Zoom in around playhead" onClick={()=>zoomAt(zoom*1.35)}><ZoomIn size={16}/></button><button title="Zoom to Fit" onClick={fitTimeline}><Maximize size={15}/></button></div></div>
  <div className="timeline-scroll" ref={scroll}>
   <div className="ruler-row" style={{width:HEAD+pixels}}><div className="ruler-title">{formatTimecode(frame,p)}<span> / {formatTimecode(projectEnd(p),p)}</span></div><div className="ruler-lane" style={{width:pixels}} onPointerDown={scrub} onContextMenu={e=>{e.preventDefault();const at=Math.max(0,Math.round((e.clientX-e.currentTarget.getBoundingClientRect().left)/zoom));setRulerContext({x:e.clientX,y:e.clientY,frame:at})}}>
    {(p.markers??[]).map(m=><div key={m.id} className="timeline-marker" title={m.label??"Marker"} style={{left:m.frame*zoom}}/>)}
    {ruler.map(sec=><div className="ruler-tick" key={sec} style={{left:frameFromSeconds(sec,p)*zoom}}><span>{`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`}</span></div>)}
   </div></div>
   <div className="track-area track-area-reorder" style={{width:HEAD+pixels,height:p.tracks.length*ROW+48}}>
   {(p.markers??[]).map(m=><div key={m.id} className="timeline-marker-guide" style={{left:HEAD+m.frame*zoom,height:p.tracks.length*ROW+45}}/>) }
   {snapGuide!==null&&<div className="timeline-snap-guide" aria-label="Snap alignment" style={{left:HEAD+snapGuide*zoom,height:p.tracks.length*ROW+45}}/>}
   {p.tracks.map((t,index)=><div key={t.id} className={'track-row layer-order-row'+(layerDrag?.ids.includes(t.id)?' layer-dragging':'')} style={{height:ROW,width:HEAD+pixels,top:0,transform:`translate3d(0,${layerDrag?.ids.includes(t.id)?(layerDrag.from+layerDrag.ids.indexOf(t.id))*ROW+layerDrag.dy:index*ROW}px,0)`,zIndex:layerDrag?.ids.includes(t.id)?9:2}} data-track={t.id}>
    <div className={'track-label '+(t.kind==='audio'?'audio-track':'')+(layerSelection.includes(t.id)?' selected-layer':'')} style={{borderLeft:`4px solid ${t.color??(t.kind==='audio'?'#579e79':'#788395')}`}} onClick={e=>selectTrack(e,t.id)} onContextMenu={e=>{e.preventDefault();setTrackContext({id:t.id,x:e.clientX,y:e.clientY})}} onPointerDown={e=>longPress(e,(x,y)=>setTrackContext({id:t.id,x,y}))}><button className="layer-grip" title="Drag to reorder layers · Ctrl/Shift click to select multiple" aria-label={`Reorder ${t.name}`} onPointerDown={e=>dragLayer(e,t)}><GripVertical size={16}/></button>{renaming===t.id?<input className="track-rename" autoFocus value={renamed} onChange={e=>setRenamed(e.target.value)} onBlur={()=>renameTrack(t.id,renamed)} onKeyDown={e=>{if(e.key==='Enter')renameTrack(t.id,renamed);if(e.key==='Escape')setRenaming(null)}} onClick={e=>e.stopPropagation()}/>:<span className="track-id" title="Double click to rename" onDoubleClick={e=>{e.stopPropagation();setRenaming(t.id);setRenamed(t.name)}}>{t.groupId?'↳ ':''}{t.folder?'▸ ':''}{t.name}</span>}<span className="track-buttons"><button title={t.solo?'Disable solo':'Solo layer'} className={t.solo?'active':''} onClick={e=>{e.stopPropagation();trackFlag(t.id,'solo')}}>S</button><button title={t.locked?'Unlock track':'Lock track'} onClick={()=>trackFlag(t.id,'locked')}>{t.locked?<Lock size={13}/>:<Unlock size={13}/>}</button>{t.kind==='video'?<button title={t.hidden?'Show track':'Hide track'} onClick={()=>trackFlag(t.id,'hidden')}>{t.hidden?<EyeOff size={13}/>:<Eye size={13}/>}</button>:<button title={t.muted?'Unmute':'Mute'} onClick={()=>trackFlag(t.id,'muted')}>{t.muted?<VolumeX size={13}/>:<Volume2 size={13}/>}</button>}</span></div>
    <div className={'track-lane '+(t.kind==='audio'?'audio-lane':'')} style={{width:pixels}} onPointerDown={e=>{if(e.target===e.currentTarget)scrub(e)}} onDragOver={e=>e.preventDefault()} onDrop={e=>void dropMedia(e,t)} data-track={t.id}>
     {ruler.map(sec=><div key={sec} className="lane-grid" style={{left:frameFromSeconds(sec,p)*zoom}}/>)}
     {p.clips.filter(c=>c.trackId===t.id).map(c=>{
      const d=drag?.id===c.id?drag:null;
      const view=d?(d.mode==='move'?{...c,start:Math.max(0,c.start+d.delta),trackId:d.track??c.trackId}:trimClip(c,d.mode,d.delta)):c;
      if(view.trackId!==t.id)return null;
      const x=view.start*zoom,w=Math.max(8,view.duration*zoom);
      return <div key={c.id} className={'timeline-clip '+(c.kind==='audio'?'clip-audio':c.kind==='text'?'clip-text':c.kind==='shape'||c.kind==='solid'?'clip-generated':'clip-video')+(selectedIds.includes(c.id)?' clip-selected':'')+(c.mediaId&&!urls[c.mediaId]?' offline':'')}
       style={{left:x,width:w}} onContextMenu={e=>{e.preventDefault();useEditor.getState().setSelected(c.id);setContext({id:c.id,x:e.clientX,y:e.clientY})}} onPointerDownCapture={e=>longPress(e,(x,y)=>{useEditor.getState().setSelected(c.id);setContext({id:c.id,x,y})})} onPointerDown={e=>startDrag(e,c,'move')} onClick={e=>{e.stopPropagation();if(e.ctrlKey||e.metaKey||e.shiftKey)return;const store=useEditor.getState();if(!store.selectedIds.includes(c.id))store.setSelected(c.id)}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.stopPropagation();e.preventDefault();const effect=e.dataTransfer.getData('application/x-framework-effect');if(effect&&c.kind!=='audio')useEditor.getState().updateClip(c.id,addEffect(c,effect as Clip['effects'][number]['type']))}} title={`${c.name} • ${c.duration} frames`}>
       {c.fadeIn>0&&<span className="clip-fade in" style={{width:Math.min(50,c.fadeIn*zoom)}}/>}{c.fadeOut>0&&<span className="clip-fade out" style={{width:Math.min(50,c.fadeOut*zoom)}}/>}<div className="trim-edge left" onPointerDown={e=>startDrag(e,c,'left')}/>{c.kind==='audio'&&c.mediaId&&waveforms[c.mediaId]&&<svg className="audio-waveform" viewBox="0 0 100 36" preserveAspectRatio="none" aria-label="Real audio waveform"><path fill="#a6e6b68a" d={(()=>{const values=waveforms[c.mediaId!],rate=p.fps.num/p.fps.den,srcStart=(c.sourceStart||0)/rate,sec=(c.duration/rate)*(c.speed??1);let top='',bottom='';for(let i=0;i<=100;i++){const idx=Math.max(0,Math.min(values.length-1,Math.floor((srcStart+(c.reverse?(1-i/100):i/100)*sec)/Math.max(.01,p.assets.find(a=>a.id===c.mediaId)?.duration||1)*(values.length-1))));const y=values[idx]*16;top+=`${i===0?'M':'L'}${i} ${18-y} `;bottom=`L${i} ${18+y} `+bottom}return top+bottom+'Z'})()}/></svg>}<span className="clip-name">{c.name}</span><span className="clip-duration">{(view.duration*p.fps.den/p.fps.num).toFixed(1)}s</span><div className="trim-edge right" onPointerDown={e=>startDrag(e,c,'right')}/>
      </div>})}
    </div>
   </div>)}
   <div className="timeline-blank" style={{width:HEAD+pixels,position:'absolute',top:p.tracks.length*ROW}} onContextMenu={e=>{e.preventDefault();setEmptyContext({x:e.clientX,y:e.clientY})}} onClick={()=>setMarquee(!marquee)}>{marquee?'Click a clip to select it':'Drag media from Project onto a track · Double-click an asset to insert at playhead'}</div>
   <div className="playhead-line" style={{left:HEAD+frame*zoom,height:p.tracks.length*ROW+38}}><div className="playhead-head"/></div>
   </div>
  </div>
  {rulerContext&&<ContextMenu x={rulerContext.x} y={rulerContext.y} items={[
    {label:'Set playhead here',run:()=>{useEditor.getState().setPlaying(false);useEditor.getState().setPlayhead(rulerContext.frame)}},
    {label:'Add marker here',run:()=>useEditor.getState().edit(pr=>({...pr,markers:[...(pr.markers??[]),{id:uuid(),frame:rulerContext.frame,label:`Marker ${(pr.markers??[]).length+1}`}]}))},
    {label:'Remove markers at this frame',disabled:!(p.markers??[]).some(m=>m.frame===rulerContext.frame),run:()=>useEditor.getState().edit(pr=>({...pr,markers:(pr.markers??[]).filter(m=>m.frame!==rulerContext.frame)}))},
    {label:snapping?'Disable magnetic snapping':'Enable magnetic snapping',run:()=>useEditor.getState().setSnapping(!snapping)},
    {label:loopPlayback?'Disable loop playback':'Enable loop playback',run:()=>useEditor.getState().setLoopPlayback(!loopPlayback)}
   ]} close={()=>setRulerContext(null)}/>}
  {trackContext&&<ContextMenu x={trackContext.x} y={trackContext.y} items={trackMenu(trackContext.id)} close={()=>setTrackContext(null)}/>}
  {emptyContext&&<ContextMenu x={emptyContext.x} y={emptyContext.y} items={[{label:'New video layer',run:()=>createLayer('video')},{label:'New audio layer',run:()=>createLayer('audio')},{label:'New text layer',run:()=>createLayer('text')},{label:'Add marker at playhead',run:()=>useEditor.getState().edit(pr=>({...pr,markers:[...(pr.markers??[]),{id:uuid(),frame,label:'Marker'}]}))}]} close={()=>setEmptyContext(null)}/>}
  {context&&<ContextMenu x={context.x} y={context.y} items={contextActions(context.id)} close={()=>setContext(null)}/>}
 </section>
}
