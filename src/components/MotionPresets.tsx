import {ProSlider} from './ProSlider';
import {useMemo,useState} from 'react';
import {BookmarkPlus,Play,SlidersHorizontal,Trash2,Search} from 'lucide-react';
import {createMotionKeys,initialMotionOptions,motionCatalog,MotionName,MotionOptions} from '../engine/motionPresets';
import {useEditor} from '../store';
interface UserPreset{name:string;id:MotionName;options:MotionOptions}
const STORE='framework.motion-presets.v1';
function readSaved():UserPreset[]{try{return JSON.parse(localStorage.getItem(STORE)||'[]')}catch{return []}}
export function MotionPresets(){
 const p=useEditor(s=>s.project),selected=useEditor(s=>s.selected),frame=useEditor(s=>s.playhead);
 const c=p.clips.find(x=>x.id===selected);const [options,setOptions]=useState<MotionOptions>(initialMotionOptions);
 const [search,setSearch]=useState(''),[saved,setSaved]=useState<UserPreset[]>(readSaved),[active,setActive]=useState<MotionName>('slideIn');
 const filtered=useMemo(()=>motionCatalog.filter(x=>x.name.toLowerCase().includes(search.toLowerCase())||x.group.toLowerCase().includes(search.toLowerCase())),[search]);
 const apply=(id:MotionName,config=options)=>{if(!c||c.kind==='audio'||id==='typewriter'&&c.kind!=='text')return;const next=createMotionKeys(c,p,frame,id,config);useEditor.getState().updateClip(c.id,{keyframes:next.keyframes});setActive(id)};
 const set=<K extends keyof MotionOptions>(k:K,v:MotionOptions[K])=>setOptions(s=>({...s,[k]:v}));
 const persist=(list:UserPreset[])=>{setSaved(list);localStorage.setItem(STORE,JSON.stringify(list))};
 const current=motionCatalog.find(x=>x.id===active);
 return <div className="motion-panel">
 <div className="search effects-search"><Search size={14}/><input aria-label="Find motion preset" placeholder="Search motion presets" value={search} onChange={e=>setSearch(e.target.value)}/></div>
 <div className="motion-config"><div className="motion-title"><SlidersHorizontal size={14}/> PRESET CONTROLS</div>
 <label>Duration <input type="number" min="1" max="900" value={options.duration} onChange={e=>set('duration',Math.max(1,Math.min(900,Math.round(Number(e.target.value)||1))))}/><small>frames</small></label>
 <ProSlider label="Intensity" defaultValue={100} min={0} max={250} unit="%" value={options.intensity} onChange={v=>set('intensity',v)}/>
 <label>Direction <select value={options.direction} onChange={e=>set('direction',e.target.value as MotionOptions['direction'])}>{['left','right','up','down'].map(d=><option key={d} value={d}>{d}</option>)}</select></label>
 <label>Ease <select value={options.ease} onChange={e=>set('ease',e.target.value as MotionOptions['ease'])}>{['easeInOut','easeIn','easeOut','linear','hold','bounce','elastic','back'].map(d=><option key={d} value={d}>{d}</option>)}</select></label>
 <label>Start offset <input type="number" value={options.offset} min={0} max={9000} onChange={e=>set('offset',Math.max(0,Math.round(Number(e.target.value)||0)))}/><small>frames</small></label>
 <button className="pro-button motion-save" disabled={!c} onClick={()=>{const name=prompt('Name your custom preset',current?.name+' Custom');if(name?.trim())persist([...saved,{name:name.trim(),id:active,options:{...options}}])}}><BookmarkPlus size={14}/> Save current settings as preset</button>
 </div>
 <div className="motion-library">{saved.length>0&&<><div className="section-caption">MY PRESETS</div>{saved.map((preset,i)=><div className="motion-preset" key={i}><button disabled={!c||c.kind==='audio'||preset.id==='typewriter'&&c.kind!=='text'} onClick={()=>apply(preset.id,preset.options)}><Play size={13}/><span><b>{preset.name}</b><small>{preset.options.duration} frames · custom</small></span></button><button aria-label={`Delete ${preset.name}`} title="Delete custom preset" onClick={()=>persist(saved.filter((_,j)=>i!==j))}><Trash2 size={13}/></button></div>)}</>}
 {['Entrance','Exit','Motion','Text'].map(group=>{const entries=filtered.filter(x=>x.group===group);return entries.length?<div key={group}><div className="section-caption">{group.toUpperCase()}</div>{entries.map(m=><button key={m.id} className={'motion-entry '+(active===m.id?'selected':'')} title={m.description} disabled={!c||c.kind==='audio'||m.id==='typewriter'&&c.kind!=='text'} onClick={()=>apply(m.id)}><Play size={13}/><span><strong>{m.name}</strong><small>{m.description}</small></span></button>)}</div>:null})}
 </div><div className="motion-note">Presets write editable keyframes onto the selected layer. Inspect them in the Graph Editor. Applies from the playhead.</div>
 </div>;
}
