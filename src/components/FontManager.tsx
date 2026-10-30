import {useEffect,useRef,useState} from 'react';
import {Star,Trash2,Upload} from 'lucide-react';
import {CustomFont,ensureFont,fontChangedEvent,importFonts,listFonts,removeFont,updateFont} from '../fonts/fontLibrary';
import {useEditor} from '../store';
const SYSTEM=['Arial','Georgia','Verdana','Impact','Courier New','Trebuchet MS'];
export function FontManager({value,onChange}:{value:string|undefined;onChange:(v:string)=>void}){
 const [fonts,setFonts]=useState<CustomFont[]>([]),[search,setSearch]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [dragging,setDragging]=useState(false),[embed,setEmbed]=useState(false),input=useRef<HTMLInputElement>(null);
 useEffect(()=>{let alive=true;const reload=()=>{void listFonts().then(v=>{if(alive)setFonts(v)}).catch(e=>{if(alive)setError(String(e))})};reload();window.addEventListener(fontChangedEvent,reload);return()=>{alive=false;window.removeEventListener(fontChangedEvent,reload)}},[]);
 const choose=async(family:string)=>{onChange(family);const meta=fonts.find(f=>f.cssFamily===family);if(meta){try{await ensureFont(meta.id);await updateFont(meta.id,{usedAt:Date.now()})}catch(e){setError(String(e))}}};
 const ingest=async(files:File[])=>{const eligible=files.filter(f=>/\.(ttf|otf|woff2?)$/i.test(f.name));if(!eligible.length){setError('Choose TTF, OTF, WOFF or WOFF2 font files.');return}setError('');setBusy(true);try{const {imported,errors}=await importFonts(eligible,embed);if(errors.length)setError(errors.join(' • '));if(imported.length)await choose(imported[0].cssFamily)}finally{setBusy(false);setDragging(false)}};
 const matches=(f:CustomFont)=>`${f.family} ${f.style} ${f.filename}`.toLowerCase().includes(search.toLowerCase());
 const missing=value?.startsWith('FWCustom_')&&!fonts.some(f=>f.cssFamily===value);
 return <div className={'custom-font-manager'+(dragging?' drag-over':'')} onDragEnter={e=>{e.preventDefault();setDragging(true)}} onDragOver={e=>e.preventDefault()} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setDragging(false)}} onDrop={e=>{e.preventDefault();void ingest(Array.from(e.dataTransfer.files))}}>
  <label className="field"><span>Font family</span><select aria-label="Font family" value={value??'Arial'} onChange={e=>void choose(e.target.value)}>
   <optgroup label="System fonts">{SYSTEM.map(font=><option key={font} value={font}>{font}</option>)}</optgroup>
   <optgroup label="Custom Fonts">{fonts.map(font=><option key={font.id} value={font.cssFamily}>{font.family} · {font.style}</option>)}</optgroup>
   {missing&&<option value={value}>{value} (MISSING)</option>}
  </select></label>
  {missing&&<p className="font-alert" role="alert">Missing custom font. Reimport its font file before playback or export. FRAMEWORK will not silently substitute it.</p>}
  <div className="font-import-row"><button type="button" disabled={busy} onClick={()=>input.current?.click()}><Upload size={13}/> {busy?'Loading…':'Import Font'}</button><label title="Only enable for fonts whose license allows redistribution"><input type="checkbox" checked={embed} onChange={e=>setEmbed(e.target.checked)}/> Permit portable embedding</label></div>
  <input hidden ref={input} type="file" accept=".ttf,.otf,.woff,.woff2" multiple onChange={e=>{void ingest(Array.from(e.target.files??[]));e.currentTarget.value=''}}/>
  <input className="font-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search custom fonts…" aria-label="Search custom fonts" />
  {fonts.length>0&&<div className="font-list"><h5>Custom Fonts</h5>{fonts.filter(matches).sort((a,b)=>Number(b.favorite)-Number(a.favorite)||b.usedAt-a.usedAt).map(f=><div key={f.id} className={'font-row'+(f.cssFamily===value?' font-selected':'')}>
   <button className="font-sample" type="button" onClick={()=>void choose(f.cssFamily)} style={{fontFamily:`'${f.cssFamily}', sans-serif`}} title={`${f.family} / ${f.style}`}><span>{f.family}</span><small>Abc 123 • Hello world</small></button>
   <button type="button" title={f.favorite?'Unfavorite font':'Favorite font'} onClick={()=>void updateFont(f.id,{favorite:!f.favorite})}><Star size={14} fill={f.favorite?'currentColor':'none'}/></button>
   <button type="button" title="Remove imported font" onClick={()=>{const used=useEditor.getState().project.clips.some(c=>c.fontFamily===f.cssFamily);if(confirm(used?'This font is used by the current project. Removing it will leave a missing-font warning. Continue?':`Remove ${f.family}?`))void removeFont(f.id)}}><Trash2 size={13}/></button>
  </div>)}</div>}
  <small className="hint">Drop multiple font files here. Fonts are saved locally; portable embedding requires permission to redistribute them.</small>
  {error&&<p className="font-alert" role="alert">{error}</p>}
 </div>
}
