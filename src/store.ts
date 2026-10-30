import {create} from 'zustand';
import {Clip,MediaAsset,Project,TrackKind,uuid,newProject,makeClip,projectEnd} from './types';
import type {ShapeName} from './engine/shapes';
import {splitClip,trimClip,validateProject,rippleDelete} from './engine/timeline';
import {reorderTracks} from './engine/layers';
import {ATTRIBUTE_GROUPS,AttributeGroup,AttributeCopy,copyAttributes,pasteAttributes} from './engine/attributes';
import {getAutosave,saveAutosave} from './storage/db';
import {persistProject} from './storage/projects';
interface Editor {
 project:Project;playhead:number;playing:boolean;selected:string|null;zoom:number;snapping:boolean;loopPlayback:boolean;shapeChoice:ShapeName;mediaUrls:Record<string,string>;
 history:Project[];future:Project[];transactionStart:Project|null;copied:Clip|null;selectedIds:string[];attributes:AttributeCopy|null;tool:'select'|'move'|'scale'|'rotate'|'razor'|'mask'|'eyedropper'|'shape';tab:'effects'|'project'|'motions';
 beginTransaction:()=>void;endTransaction:()=>void;edit:(fn:(p:Project)=>Project)=>void; previewTracks:(tracks:Project['tracks'])=>void; finishTrackPreview:(before:Project)=>void; reorderTracks:(ids:string[],index:number)=>void; previewClip:(id:string,patch:Partial<Clip>)=>void;previewClips:(patches:Record<string,Partial<Clip>>)=>void;finishPreview:(before:Project)=>void; undo:()=>void;redo:()=>void;
 toggleSelected:(id:string,additive?:boolean)=>void;setSelectedIds:(ids:string[])=>void;copyAttributes:(groups?:AttributeGroup[])=>void;pasteAttributes:(options?:{groups?:AttributeGroup[];merge?:boolean;relative?:boolean})=>void;updateSelected:(patch:Partial<Clip>)=>void;
 setTool:(tool:Editor['tool'])=>void;setProject:(p:Project)=>void;setPlayhead:(frame:number)=>void;setPlaying:(v:boolean)=>void;setSelected:(id:string|null)=>void;setZoom:(z:number)=>void;setSnapping:(v:boolean)=>void;setLoopPlayback:(v:boolean)=>void;setShapeChoice:(v:ShapeName)=>void;setUrl:(id:string,url:string)=>void;setTab:(v:'effects'|'project'|'motions')=>void;
 addAsset:(a:MediaAsset)=>void;addClip:(c:Clip)=>void;insertAsset:(id:string,trackId?:string,start?:number)=>void;
 updateClip:(id:string,patch:Partial<Clip>)=>void;removeClip:(id:string)=>void;moveOrTrim:(id:string,operation:'move'|'left'|'right',original:Clip,frames:number,track?:string)=>void;
 split:()=>void;rippleDelete:()=>void;duplicate:()=>void;copy:()=>void;paste:()=>void;addTrack:(kind:TrackKind)=>void;setProjectProp:(patch:Partial<Project>)=>void;
}
const preference=(key:string,fallback:string)=>{try{return localStorage.getItem(key)??fallback}catch{return fallback}};
const savePreference=(key:string,value:string)=>{try{localStorage.setItem(key,value)}catch{/* Settings unavailable in restricted browser context */}};
const initial=(()=>{try{const saved=getAutosave();return saved?validateProject(saved):newProject()}catch{return newProject()}})();
export const useEditor=create<Editor>((set,get)=>({
 project:initial,playhead:0,playing:false,selected:null,zoom:2,snapping:preference('framework.snapping','true')!=='false',loopPlayback:preference('framework.loop','false')==='true',shapeChoice:'rectangle',mediaUrls:{},history:[],future:[],transactionStart:null,copied:null,selectedIds:[],attributes:null,tool:'select',tab:'project',
 previewTracks:tracks=>set(s=>({project:{...s.project,tracks}})),
 finishTrackPreview:before=>set(s=>{if(JSON.stringify(before.tracks)===JSON.stringify(s.project.tracks))return s;saveAutosave(s.project);persistProject(s.project);return {history:[...s.history.slice(-59),before],future:[]}}),
 reorderTracks:(ids,index)=>get().edit(p=>({...p,tracks:reorderTracks(p.tracks,ids,index)})),
 previewClip:(id,patch)=>set(s=>({project:{...s.project,clips:s.project.clips.map(c=>c.id===id?{...c,...patch}:c)}})),
 previewClips:patches=>set(s=>({project:{...s.project,clips:s.project.clips.map(c=>patches[c.id]?{...c,...patches[c.id]}:c)}})),
 finishPreview:before=>set(s=>{if(JSON.stringify(before.clips)===JSON.stringify(s.project.clips))return s;saveAutosave(s.project);persistProject(s.project);return {history:[...s.history.slice(-59),before],future:[]}}),
 beginTransaction:()=>set(s=>s.transactionStart?s:{transactionStart:s.project}),
 endTransaction:()=>set(s=>{if(!s.transactionStart)return s;const before=s.transactionStart;if(JSON.stringify(before)!==JSON.stringify(s.project)){saveAutosave(s.project);persistProject(s.project);return {history:[...s.history.slice(-59),before],future:[],transactionStart:null}}return {transactionStart:null}}),
 edit:fn=>set(s=>{const p=fn(structuredClone(s.project));if(p===s.project)return s;
  // High-frequency gesture previews intentionally avoid serializing the entire project per pointer movement.
  // The transaction is compared/persisted once when the gesture commits.
  if(s.transactionStart)return {project:p};
  if(JSON.stringify(p)===JSON.stringify(s.project))return s;
  saveAutosave(p);persistProject(p);return {project:p,history:[...s.history.slice(-59),s.project],future:[]}}),
 undo:()=>set(s=>{if(!s.history.length)return s;const project=s.history[s.history.length-1];saveAutosave(project);persistProject(project);return {project,selected:s.selected&&project.clips.some(c=>c.id===s.selected)?s.selected:null,selectedIds:s.selectedIds.filter(id=>project.clips.some(c=>c.id===id)),history:s.history.slice(0,-1),future:[s.project,...s.future]}}),
 redo:()=>set(s=>{if(!s.future.length)return s;const project=s.future[0];saveAutosave(project);persistProject(project);return {project,selected:s.selected&&project.clips.some(c=>c.id===s.selected)?s.selected:null,selectedIds:s.selectedIds.filter(id=>project.clips.some(c=>c.id===id)),history:[...s.history,s.project],future:s.future.slice(1)}}),
 setTool:tool=>set({tool}),
 setProject:p=>{saveAutosave(p);persistProject(p);set({project:p,history:[],future:[],transactionStart:null,selected:null,selectedIds:[],playhead:0,playing:false})},
 setPlayhead:frame=>set(s=>({playhead:Math.max(0,Math.min(Math.round(frame),Math.max(projectEnd(s.project),900)))})),
 setPlaying:playing=>set({playing}),setSelected:selected=>set({selected,selectedIds:selected?[selected]:[]}),
 setSelectedIds:ids=>set(s=>({selectedIds:ids.filter(id=>s.project.clips.some(c=>c.id===id)),selected:ids.length?ids[ids.length-1]:null})),
 toggleSelected:(id,additive=false)=>set(s=>{const ids=additive?(s.selectedIds.includes(id)?s.selectedIds.filter(x=>x!==id):[...s.selectedIds,id]):[id];return {selectedIds:ids,selected:ids.at(-1)??null}}),
 copyAttributes:groups=>set(s=>{const c=s.project.clips.find(c=>c.id===s.selected);return c?{attributes:copyAttributes(c,groups??ATTRIBUTE_GROUPS,s.playhead-c.start)}:s}),
 pasteAttributes:options=>{const s=get();if(!s.attributes)return;const ids=s.selectedIds.length?s.selectedIds:s.selected?[s.selected]:[];get().edit(p=>({...p,clips:p.clips.map(c=>ids.includes(c.id)?pasteAttributes(c,s.attributes!,{groups:options?.groups,merge:options?.merge,relativeFrame:options?.relative?s.playhead-c.start:undefined}):c)}))},
 updateSelected:patch=>{const s=get(),ids=s.selectedIds.length?s.selectedIds:s.selected?[s.selected]:[];get().edit(p=>({...p,clips:p.clips.map(c=>ids.includes(c.id)?{...c,...structuredClone(patch)}:c)}))},
 setZoom:zoom=>set({zoom:Math.max(.15,Math.min(32,zoom))}),
 setSnapping:snapping=>{savePreference('framework.snapping',String(snapping));set({snapping})},
 setLoopPlayback:loopPlayback=>{savePreference('framework.loop',String(loopPlayback));set({loopPlayback})},
 setShapeChoice:shapeChoice=>set({shapeChoice,tool:'shape'}),
 setUrl:(id,url)=>set(s=>({mediaUrls:{...s.mediaUrls,[id]:url}})),setTab:tab=>set({tab}),
 addAsset:a=>get().edit(p=>({...p,assets:[...p.assets,a]})),
 addClip:c=>{get().edit(p=>({...p,clips:[...p.clips,c]}));get().setSelected(c.id)},
 insertAsset:(id,trackId,start)=>{const s=get(),a=s.project.assets.find(a=>a.id===id);if(!a)return;
  const track=s.project.tracks.find(t=>t.id===trackId&&!t.folder&&t.kind===(a.type==='audio'?'audio':'video'))??s.project.tracks.find(t=>!t.folder&&t.kind===(a.type==='audio'?'audio':'video'));
  if(!track||track.locked)return;
  const c=makeClip(a.type,track.id,start??s.playhead,a.name);c.mediaId=id;c.duration=Math.max(1,Math.round(a.duration*s.project.fps.num/s.project.fps.den))||(a.type==='image'?150:1);
  if(a.type==='image')c.duration=150;get().addClip(c);
 },
 updateClip:(id,patch)=>get().edit(p=>({...p,clips:p.clips.map(c=>c.id===id?{...c,...patch}:c)})),
 removeClip:id=>{const s=get(),ids=s.selectedIds.includes(id)&&s.selectedIds.length>1?s.selectedIds:[id];get().edit(p=>({...p,clips:p.clips.filter(c=>!ids.includes(c.id))}));get().setSelectedIds([])},
 moveOrTrim:(id,operation,original,frames,track)=>get().edit(p=>({...p,clips:p.clips.map(c=>c.id!==id?c:operation==='move'?{...original,start:Math.max(0,original.start+Math.round(frames)),trackId:track??original.trackId}:trimClip(original,operation==='left'?'left':'right',frames))})),
 split:()=>{const {selected,playhead}=get();if(selected)get().edit(p=>splitClip(p,selected,playhead))},
 rippleDelete:()=>{const {selected}=get();if(selected){get().edit(p=>rippleDelete(p,selected));get().setSelected(null)}},
 duplicate:()=>{const s=get(),ids=s.selectedIds.length?s.selectedIds:s.selected?[s.selected]:[];const copies=s.project.clips.filter(c=>ids.includes(c.id)).map(c=>({...structuredClone(c),id:uuid(),start:c.start+c.duration}));if(!copies.length)return;get().edit(p=>({...p,clips:[...p.clips,...copies]}));get().setSelectedIds(copies.map(c=>c.id))},
 copy:()=>{const s=get(),c=s.project.clips.find(c=>c.id===s.selected);if(c)set({copied:structuredClone(c)})},
 paste:()=>{const {copied,playhead}=get();if(!copied)return;get().addClip({...structuredClone(copied),id:uuid(),start:playhead})},
 addTrack:kind=>get().edit(p=>({...p,tracks:[...p.tracks,{id:uuid(),name:`${kind.toUpperCase()} ${p.tracks.filter(t=>t.kind===kind).length+1}`,kind,muted:false,locked:false,hidden:false}]})),
 setProjectProp:patch=>get().edit(p=>({...p,...patch})),
}));
