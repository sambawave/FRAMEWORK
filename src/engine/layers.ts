import type {Project,Track} from '../types';

/** Reorder selected tracks as a stable block, preserving every track and its content. */
export function reorderTracks(tracks:Track[],selectedIds:readonly string[],insertionIndex:number):Track[]{
 const ids=new Set(selectedIds);
 const block=tracks.filter(t=>ids.has(t.id));
 if(!block.length)return tracks;
 const others=tracks.filter(t=>!ids.has(t.id));
 // insertionIndex is measured in the list AFTER removing the selected rows.
 const idx=Math.max(0,Math.min(others.length,Math.round(insertionIndex)));
 return [...others.slice(0,idx),...block,...others.slice(idx)];
}
export function insertAtVisualIndex(original:Track[],ids:readonly string[],pointerIndex:number):Track[]{
 const selected=new Set(ids);
 const before=original.slice(0,Math.max(0,Math.min(original.length,pointerIndex))).filter(t=>!selected.has(t.id)).length;
 return reorderTracks(original,ids,before);
}
export function reorderProject(p:Project,ids:readonly string[],insertionIndex:number):Project {
 return {...p,tracks:reorderTracks(p.tracks,ids,insertionIndex)};
}
export function setTrackFlag(p:Project,id:string,key:'muted'|'hidden'|'locked'|'solo',value:boolean):Project{
 return {...p,tracks:p.tracks.map(t=>t.id===id?{...t,[key]:value}:t)};
}
