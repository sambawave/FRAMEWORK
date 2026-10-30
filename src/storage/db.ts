import {Project} from '../types';
const DATABASE='framework-studio-v1';const STORE='media';
export function db():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const r=indexedDB.open(DATABASE,2);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE);if(!r.result.objectStoreNames.contains('fonts'))r.result.createObjectStore('fonts')};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
export async function putMedia(id:string,blob:Blob){const d=await db();await new Promise<void>((ok,fail)=>{const tx=d.transaction(STORE,'readwrite');tx.objectStore(STORE).put(blob,id);tx.oncomplete=()=>ok();tx.onerror=()=>fail(tx.error)});d.close()}
export async function getMedia(id:string):Promise<Blob|undefined>{const d=await db();const blob=await new Promise<Blob|undefined>((ok,fail)=>{const tx=d.transaction(STORE,'readonly');const r=tx.objectStore(STORE).get(id);r.onsuccess=()=>ok(r.result);r.onerror=()=>fail(r.error)});d.close();return blob}
export const AUTOSAVE_KEY='framework.autosave.v1';
const RECOVERY='framework.autosave.recovery.v2';
let previousBackup=0;
export function saveAutosave(p:Project){
 try{
  const old=localStorage.getItem(AUTOSAVE_KEY);
  // Keep one previous complete snapshot for interrupted writes or accidental changes.
  if(old&&Date.now()-previousBackup>30_000){localStorage.setItem(RECOVERY,old);previousBackup=Date.now()}
  localStorage.setItem(AUTOSAVE_KEY,JSON.stringify(p));
 }catch(e){console.warn('Autosave unavailable; export a .framework backup manually',e)}
}
export function getRecovery():Project|undefined{const old=localStorage.getItem(RECOVERY);if(!old)return;
 try{return JSON.parse(old) as Project}catch{return}
}

export function getAutosave():Project|undefined{const data=localStorage.getItem(AUTOSAVE_KEY);if(!data)return;try{return JSON.parse(data) as Project}catch{return}}
export function download(data:Blob,name:string){const url=URL.createObjectURL(data);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
