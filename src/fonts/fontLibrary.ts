/** Custom font assets. Font bytes stay in IndexedDB, never in project autosave JSON. */
import type {Project} from '../types';
export interface CustomFont {id:string;family:string;style:string;filename:string;cssFamily:string;favorite:boolean;usedAt:number;bytes:number;licenseEmbed:boolean}
export interface PortableFont {meta:CustomFont;base64:string}
const DB='framework-studio-v1',STORE='fonts',CHANGE='framework:fonts-changed';
const loaded=new Set<string>();const inFlight=new Map<string,Promise<void>>();
const LIMIT=30*1024*1024;
function open():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,2);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('media'))r.result.createObjectStore('media');if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};r.onerror=()=>reject(r.error);r.onsuccess=()=>resolve(r.result)})}
async function transaction<T>(mode:IDBTransactionMode,job:(s:IDBObjectStore,ok:(x:T)=>void,fail:(e:unknown)=>void)=>void):Promise<T>{const db=await open();try{return await new Promise<T>((resolve,reject)=>{const tx=db.transaction(STORE,mode);let result:T;const ok=(x:T)=>{result=x};const fail=(e:unknown)=>reject(e);tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);try{job(tx.objectStore(STORE),ok,fail)}catch(e){reject(e)}})}finally{db.close()}}
export function cssName(id:string){return `FWCustom_${id.replace(/[^a-z0-9]/gi,'_')}`}
function cleanName(file:string){return file.replace(/\.(ttf|otf|woff2?)$/i,'').replace(/[_-]+/g,' ').trim().slice(0,100)||'Imported font'}
/** Read uncompressed OpenType name table when present. WOFF2 is deliberately filename-derived. */
export function fontNames(bytes:ArrayBuffer):{family?:string;style?:string}{
 try{const v=new DataView(bytes);if(bytes.byteLength<12)return {};const tag=v.getUint32(0);
 if(tag!==0x00010000&&tag!==0x4f54544f&&tag!==0x74727565)return {};
 const tables=v.getUint16(4);let offset=0;
 for(let i=0;i<Math.min(100,tables);i++){const at=12+i*16;if(at+16>v.byteLength)break;if(v.getUint32(at)===0x6e616d65){offset=v.getUint32(at+8);break}}
 if(!offset||offset+6>v.byteLength)return {};
 const count=v.getUint16(offset+2),start=offset+v.getUint16(offset+4);const names=new Map<number,{text:string;score:number}>();
 for(let i=0;i<Math.min(count,200);i++){const p=offset+6+i*12;if(p+12>v.byteLength)break;const platform=v.getUint16(p),nameId=v.getUint16(p+6),len=v.getUint16(p+8),o=start+v.getUint16(p+10);if(![1,2,16,17].includes(nameId)||!len||len>2048||o+len>v.byteLength)continue;
  const score=platform===3?3:platform===0?2:1;let text='';if(platform===0||platform===3){for(let j=0;j+1<len;j+=2)text+=String.fromCharCode(v.getUint16(o+j))}else for(let j=0;j<len;j++)text+=String.fromCharCode(v.getUint8(o+j));
  if(text&&!/[\x00-\x1f]/.test(text)&&(names.get(nameId)?.score??0)<score)names.set(nameId,{text,score});
 }
 return {family:(names.get(16)??names.get(1))?.text,style:(names.get(17)??names.get(2))?.text};
 }catch{return {}}
}
export function checkFont(buffer:ArrayBuffer,filename:string){const ext=filename.split('.').pop()?.toLowerCase();if(!['ttf','otf','woff','woff2'].includes(ext??''))throw Error('Only TTF, OTF, WOFF and WOFF2 files are supported');if(buffer.byteLength<16||buffer.byteLength>LIMIT)throw Error('Invalid font file size (max 30 MB)');const sig=new DataView(buffer).getUint32(0);if(![0x00010000,0x4f54544f,0x774f4646,0x774f4632,0x74727565].includes(sig))throw Error('Invalid OpenType/WOFF signature');return true}
export async function listFonts():Promise<CustomFont[]>{return transaction('readonly',(s,ok)=>{const r=s.getAll();r.onsuccess=()=>ok((r.result as {meta:CustomFont}[]).map(x=>x.meta).sort((a,b)=>b.usedAt-a.usedAt))})}
async function record(id:string){return transaction<{meta:CustomFont;data:ArrayBuffer}|undefined>('readonly',(s,ok)=>{const r=s.get(id);r.onsuccess=()=>ok(r.result)})}
export async function registerFont(meta:CustomFont,data:ArrayBuffer){checkFont(data,meta.filename);const family=cssName(meta.id);const face=new FontFace(family,data,{style:'normal',weight:'normal'});await face.load();document.fonts.add(face);loaded.add(meta.id);window.dispatchEvent(new CustomEvent(CHANGE));}
export async function importFonts(files:File[],allowEmbed=false){const imported:CustomFont[]=[],errors:string[]=[];for(const file of files){try{const data=await file.arrayBuffer();checkFont(data,file.name);const name=fontNames(data),id=crypto.randomUUID();const meta:CustomFont={id,family:(name.family||cleanName(file.name)).slice(0,100),style:(name.style||'Regular').slice(0,70),filename:file.name,cssFamily:cssName(id),favorite:false,usedAt:Date.now(),bytes:data.byteLength,licenseEmbed:allowEmbed};await registerFont(meta,data);await transaction('readwrite',(s,ok)=>{s.put({meta,data},id);ok(undefined)});imported.push(meta)}catch(e){errors.push(`${file.name}: ${e instanceof Error?e.message:String(e)}`)}}return {imported,errors}}
export async function ensureFont(id:string){if(loaded.has(id))return;let task=inFlight.get(id);if(!task){task=(async()=>{const r=await record(id);if(!r)throw Error(`Missing custom font ${id}. Use Import Font to restore it.`);await registerFont(r.meta,r.data)})();inFlight.set(id,task);void task.finally(()=>inFlight.delete(id)).catch(()=>{})}await task}
export function fontId(family?:string){return family?.startsWith('FWCustom_')?family.slice(9).replace(/_/g,'-'):null}
export async function ensureProjectFonts(project:Project){const familyNames=new Set(project.clips.filter(c=>c.kind==='text').map(c=>c.fontFamily).filter((f):f is string=>!!f&&f.startsWith('FWCustom_')));if(!familyNames.size){await document.fonts.ready;return}const all=await listFonts();for(const family of familyNames){const meta=all.find(f=>f.cssFamily===family);if(!meta)throw Error(`Missing font: ${family}. Relink it through the text inspector before exporting.`);await ensureFont(meta.id)}await document.fonts.ready}
export async function removeFont(id:string){const fonts=await listFonts(),meta=fonts.find(f=>f.id===id);await transaction('readwrite',(s,ok)=>{s.delete(id);ok(undefined)});if(meta){for(const f of document.fonts)if(f.family===meta.cssFamily)document.fonts.delete(f)}loaded.delete(id);window.dispatchEvent(new CustomEvent(CHANGE))}
export async function updateFont(id:string,patch:Partial<Pick<CustomFont,'favorite'|'usedAt'|'licenseEmbed'>>){const value=await record(id);if(!value)return;value.meta={...value.meta,...patch};await transaction('readwrite',(s,ok)=>{s.put(value,id);ok(undefined)});window.dispatchEvent(new CustomEvent(CHANGE))}
export async function initFonts(){const fonts=await listFonts();await Promise.allSettled(fonts.map(f=>ensureFont(f.id)));window.dispatchEvent(new CustomEvent(CHANGE))}
function bytesToBase64(bytes:Uint8Array){let out='';for(let i=0;i<bytes.length;i+=16384)out+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(out)}
function base64ToBytes(encoded:string){const raw=atob(encoded),bytes=new Uint8Array(raw.length);for(let i=0;i<bytes.length;i++)bytes[i]=raw.charCodeAt(i);return bytes.buffer}
export async function portableFonts(project:Project):Promise<PortableFont[]>{const families=new Set(project.clips.filter(c=>c.kind==='text').map(c=>c.fontFamily));const all=await listFonts(),out:PortableFont[]=[];for(const meta of all){if(!families.has(meta.cssFamily)||!meta.licenseEmbed)continue;const item=await record(meta.id);if(item)out.push({meta,base64:bytesToBase64(new Uint8Array(item.data))})}return out}
export async function restorePortableFonts(fonts:PortableFont[]){for(const item of fonts){if(!item?.meta?.id||typeof item.base64!=='string')continue;const existing=await record(item.meta.id);if(existing)continue;const data=base64ToBytes(item.base64);checkFont(data,item.meta.filename);await registerFont(item.meta,data);await transaction('readwrite',(s,ok)=>{s.put({meta:item.meta,data},item.meta.id);ok(undefined)})}}
export const fontChangedEvent=CHANGE;
