import {useEffect,useRef,useState} from 'react';
import {AudioLines,Film,FolderOpen,Image as ImageIcon,Plus,Search,Upload,Clapperboard} from 'lucide-react';
import {MediaAsset,uuid} from '../types';
import {useEditor} from '../store';
import {getMedia,putMedia} from '../storage/db';
import {addEffect} from '../engine/timeline';
import {effectCatalog} from '../engine/compositor';
import {ContextMenu,ContextAction} from './ContextMenu';
import {MotionPresets} from './MotionPresets';

export async function importFiles(files:FileList|File[]){
 const results:{ok:boolean;name:string;reason?:string}[]=[];
 for(const file of Array.from(files)){
  const type:MediaAsset['type']|null=file.type.startsWith('video/')?'video':file.type.startsWith('audio/')?'audio':file.type.startsWith('image/')?'image':null;
  if(!type){results.push({ok:false,name:file.name,reason:'Unsupported media type'});continue}
  const id=uuid(),url=URL.createObjectURL(file);let duration=5,width: number|undefined,height:number|undefined;
  try{
   if(type==='video'||type==='audio'){
    const el=document.createElement(type==='video'?'video':'audio');el.preload='metadata';el.src=url;
    await new Promise<void>((resolve,reject)=>{const tm=setTimeout(()=>reject(Error('Media metadata timed out')),12000);el.onloadedmetadata=()=>{clearTimeout(tm);resolve()};el.onerror=()=>{clearTimeout(tm);reject(Error('The browser cannot decode this file'))}});
    duration=Number.isFinite(el.duration)&&el.duration>0?el.duration:5;
    if(type==='video'){width=(el as HTMLVideoElement).videoWidth;height=(el as HTMLVideoElement).videoHeight}
    el.removeAttribute('src');el.load();
   }else{
    const img=new Image();img.src=url;
    await img.decode();width=img.naturalWidth;height=img.naturalHeight;
   }
   await putMedia(id,file);
   useEditor.getState().addAsset({id,name:file.name,type,duration,width,height,mime:file.type,bytes:file.size});
   useEditor.getState().setUrl(id,url);results.push({ok:true,name:file.name});
  }catch(e){URL.revokeObjectURL(url);results.push({ok:false,name:file.name,reason:e instanceof Error?e.message:String(e)})}
 }
 return results;
}
export function MediaPanel(){
 const p=useEditor(s=>s.project);const urls=useEditor(s=>s.mediaUrls),selected=useEditor(s=>s.selected),tab=useEditor(s=>s.tab);
 const input=useRef<HTMLInputElement>(null),relink=useRef<HTMLInputElement>(null);const [query,setQuery]=useState('');const [error,setError]=useState('');const [thumbnails,setThumbs]=useState<Record<string,string>>({});
 const [missing,setMissing]=useState<string[]>([]);const [context,setContext]=useState<{x:number;y:number;id:string}|null>(null);
 useEffect(()=>{let active=true;const loaded:string[]=[];
  void (async()=>{
   const absent:string[]=[];
   for(const asset of p.assets){if(urls[asset.id])continue;
    const blob=await getMedia(asset.id).catch(()=>undefined);
    if(blob){const url=URL.createObjectURL(blob);loaded.push(url);if(active)useEditor.getState().setUrl(asset.id,url)}
    else absent.push(asset.name);
   }if(active)setMissing(absent);
  })();return()=>{active=false;/* URLs are kept alive in the editor until navigation */};
 },[p.assets,urls]);
 useEffect(()=>{
  let cancelled=false;
  for(const a of p.assets){if(a.type!=='video'||!urls[a.id]||thumbnails[a.id])continue;
   const el=document.createElement('video');el.src=urls[a.id];el.muted=true;el.preload='metadata';
   const cleanup=()=>{el.removeAttribute('src');el.load()};
   el.onloadeddata=()=>{try{el.currentTime=Math.min(.25,Math.max(0,el.duration/3))}catch{cleanup()}};
   el.onseeked=()=>{if(cancelled)return cleanup();try{const canvas=document.createElement('canvas');canvas.width=128;canvas.height=74;canvas.getContext('2d')?.drawImage(el,0,0,128,74);const thumb=canvas.toDataURL('image/jpeg',.65);setThumbs(v=>({...v,[a.id]:thumb}))}catch{/* thumbnail not supported */}cleanup()};
   el.onerror=cleanup;
  }
  return()=>{cancelled=true};
 },[p.assets,urls,thumbnails]);
 useEffect(()=>{const relinkListener=()=>relink.current?.click();window.addEventListener('framework:relink-media',relinkListener);return()=>window.removeEventListener('framework:relink-media',relinkListener)},[]);
 function longPressAsset(e:React.PointerEvent,id:string){if(e.pointerType==='mouse')return;
  const x=e.clientX,y=e.clientY;let cancelled=false;
  const cleanup=()=>{cancelled=true;clearTimeout(timer);window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',cleanup);window.removeEventListener('pointercancel',cleanup)};
  const move=(event:PointerEvent)=>{if(Math.hypot(event.clientX-x,event.clientY-y)>11)cleanup()};
  const timer=window.setTimeout(()=>{if(!cancelled){setContext({x,y,id});cleanup()}},570);
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',cleanup);window.addEventListener('pointercancel',cleanup);
 }
 const assetActions=(id:string):ContextAction[]=>{const a=p.assets.find(a=>a.id===id);if(!a)return[];return [
  {label:'Add to timeline',run:()=>useEditor.getState().insertAsset(id)},
  {label:'Rename asset',run:()=>{const name=prompt('Asset name',a.name);if(name?.trim())useEditor.getState().edit(p=>({...p,assets:p.assets.map(v=>v.id===id?{...v,name:name.trim()}:v)}))}},
  {label:'Duplicate asset',run:()=>{void (async()=>{const blob=await getMedia(id);if(!blob)return alert('Media is offline');const newId=uuid();await putMedia(newId,blob);useEditor.getState().addAsset({...a,id:newId,name:'Copy of '+a.name});useEditor.getState().setUrl(newId,URL.createObjectURL(blob))})()}},
  {label:'Remove from project',danger:true,run:()=>{const uses=p.clips.filter(c=>c.mediaId===id).length;if(confirm(`Remove “${a.name}” from project? ${uses} linked clip(s) will also be removed. Stored media blobs are NOT deleted.`))useEditor.getState().edit(p=>({...p,assets:p.assets.filter(a=>a.id!==id),clips:p.clips.filter(c=>c.mediaId!==id)}))}}
 ]};
 const handle=async(files:FileList|File[])=>{const r=await importFiles(files);setError(r.filter(x=>!x.ok).map(x=>`${x.name}: ${x.reason}`).join('; '))};
 return <aside className="media-panel pane">
  <div className="panel-title"><span>{tab==='project'?'PROJECT MEDIA':tab==='effects'?'EFFECTS LIBRARY':'MOTION PRESETS'}</span><span className="small-dim">{tab==='project'?`${p.assets.length} assets`:tab==='effects'?'CANVAS EFFECTS':'EDITABLE KEYFRAMES'}</span></div>
  <div className="panel-tabs"><button className={tab==='project'?'active':''} onClick={()=>useEditor.getState().setTab('project')}>Project</button><button className={tab==='effects'?'active':''} onClick={()=>useEditor.getState().setTab('effects')}>Effects</button><button className={tab==='motions'?'active':''} onClick={()=>useEditor.getState().setTab('motions')}>Motion</button></div>
  {tab==='project'?<>
   <div className="panel-tools"><button className="icon-btn" title="Import media files" onClick={()=>input.current?.click()}><Plus size={17}/></button><button className="icon-btn" title="Relink missing media" onClick={()=>relink.current?.click()}><FolderOpen size={16}/></button><div className="search"><Search size={13}/><input aria-label="Search imported assets" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search project..."/></div></div>
   <div className="media-list" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(e.dataTransfer.files.length)void handle(e.dataTransfer.files)}}>
    {p.assets.filter(a=>a.name.toLowerCase().includes(query.toLowerCase())).map(a=><div key={a.id} className={'media-item'+(selected===a.id?' selected':'')} onContextMenu={e=>{e.preventDefault();setContext({id:a.id,x:e.clientX,y:e.clientY})}} onPointerDown={e=>longPressAsset(e,a.id)} draggable onDragStart={e=>e.dataTransfer.setData('application/x-framework-asset',a.id)} onDoubleClick={()=>useEditor.getState().insertAsset(a.id)}>
     <div className="media-thumb">{a.type==='image'&&urls[a.id]?<img src={urls[a.id]} alt=""/>:a.type==='video'&&thumbnails[a.id]?<img src={thumbnails[a.id]} alt=""/>:a.type==='video'?<Film size={20}/>:a.type==='audio'?<AudioLines size={22}/>:<ImageIcon size={22}/>}</div>
     <div className="asset-info"><strong title={a.name}>{a.name}</strong><small>{a.type.toUpperCase()} · {a.type==='image'?`${a.width}×${a.height}`:`${a.duration.toFixed(1)} s`} {!urls[a.id]&&'· OFFLINE'}</small></div>
     <button className="icon-btn media-add" title="Insert at playhead" onClick={()=>useEditor.getState().insertAsset(a.id)}><Plus size={15}/></button>
    </div>)}
    {!p.assets.length&&<div className="empty-import" onClick={()=>input.current?.click()}><Upload size={31}/><b>Import your media</b><span>Drop video, audio, GIF or images here</span><span className="hint">Or click to browse files</span></div>}
   </div>
   {missing.length>0&&<div className="notice warn">{missing.length} offline asset(s). Relink by original filename.</div>}
   {error&&<div className="notice warn" title={error}>{error}</div>}
   <input hidden ref={input} type="file" multiple accept="video/*,audio/*,image/*" onChange={e=>{if(e.target.files)void handle(e.target.files);e.target.value=''}}/>
   <input hidden ref={relink} type="file" multiple accept="video/*,audio/*,image/*" onChange={async e=>{for(const f of Array.from(e.target.files??[])){const asset=p.assets.find(a=>a.name===f.name);if(asset){await putMedia(asset.id,f);useEditor.getState().setUrl(asset.id,URL.createObjectURL(f))}}e.target.value=''}}/>
  </>:tab==='motions'?<MotionPresets/>:<div className="effects-list"><div className="search effects-search"><Search size={13}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find effects..."/></div>
  <div className="section-caption">IMAGE ADJUSTMENTS</div>{effectCatalog.filter(e=>e.label.toLowerCase().includes(query.toLowerCase())).map(e=><button className="effect-library-item" key={e.type} draggable onDragStart={ev=>ev.dataTransfer.setData('application/x-framework-effect',e.type)} disabled={!p.clips.some(c=>c.id===selected&&c.kind!=='audio')} onClick={()=>{const c=p.clips.find(c=>c.id===selected);if(c&&c.kind!=='audio')useEditor.getState().updateClip(c.id,addEffect(c,e.type))}}><Clapperboard size={15}/>{e.label}<Plus size={13}/></button>)}
  <div className="hint padded">Select a layer and click an effect, or drag an effect onto a clip. Effects alter both preview and export.</div></div>}
 {context&&<ContextMenu x={context.x} y={context.y} items={assetActions(context.id)} close={()=>setContext(null)}/>}
 </aside>
}
