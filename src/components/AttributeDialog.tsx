import {useState} from 'react';
import {ATTRIBUTE_GROUPS,AttributeGroup} from '../engine/attributes';
import {useEditor} from '../store';
import {X,Copy,ClipboardPaste} from 'lucide-react';
export function AttributeDialog({mode,close}:{mode:'copy'|'paste';close:()=>void}){
 const clipboard=useEditor(s=>s.attributes);const selected=useEditor(s=>s.selectedIds);
 const [groups,setGroups]=useState<AttributeGroup[]>(()=>mode==='copy'?[...ATTRIBUTE_GROUPS]:clipboard?.groups??[]);
 const [merge,setMerge]=useState(false),[relative,setRelative]=useState(false);
 const toggle=(g:AttributeGroup)=>setGroups(v=>v.includes(g)?v.filter(x=>x!==g):[...v,g]);
 return <div className="attribute-backdrop" onPointerDown={e=>{if(e.currentTarget===e.target)close()}}><section className="attribute-dialog" role="dialog" aria-modal="true" aria-label={`${mode} attributes`}>
 <header><strong>{mode==='copy'?<><Copy size={17}/> COPY ATTRIBUTES</>:<><ClipboardPaste size={17}/> PASTE ATTRIBUTES</>}</strong><button title="Close" onClick={close}><X size={17}/></button></header>
 <p>{mode==='copy'?'Select properties to copy. Clip media, IDs, and timeline placement are never copied.':`Apply compatible attributes to ${Math.max(1,selected.length)} selected clip(s). Incompatible categories are skipped.`}</p>
 <div className="attribute-groups">{ATTRIBUTE_GROUPS.map(g=><label key={g}><input type="checkbox" checked={groups.includes(g)} disabled={mode==='paste'&&!clipboard?.groups.includes(g)} onChange={()=>toggle(g)}/><span>{g==='text'?'Text styling':g==='material'?'3D materials':g==='audio'?'Audio settings':g==='masks'?'Masks':g.charAt(0).toUpperCase()+g.slice(1)}</span></label>)}</div>
 {mode==='paste'&&<div className="attribute-options"><label><input type="checkbox" checked={merge} onChange={e=>setMerge(e.target.checked)}/> Merge with existing effects and keyframes</label><label><input type="checkbox" checked={relative} onChange={e=>setRelative(e.target.checked)}/> Shift animation to current playhead</label></div>}
 <footer><button onClick={close}>Cancel</button><button className="primary-btn" disabled={!groups.length||(mode==='paste'&&!clipboard)} onClick={()=>{if(mode==='copy')useEditor.getState().copyAttributes(groups);else useEditor.getState().pasteAttributes({groups,merge,relative});close()}}>{mode==='copy'?'Copy selected':'Paste selected'}</button></footer>
 </section></div>
}
