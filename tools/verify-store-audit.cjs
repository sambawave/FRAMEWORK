/** Actual store action closures run with a minimal Zustand state adapter.
 * Tests transitions and project data; does NOT test React subscription/UI integration. */
const fs=require('node:fs'),assert=require('node:assert/strict'),Module=require('node:module');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}
const values=new Map();global.localStorage={getItem:key=>values.get(key)??null,setItem:(k,v)=>{values.set(k,v)},removeItem:k=>{values.delete(k)}};
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const prev=Module._load;Module._load=function(spec,...rest){if(spec==='zustand')return {create:(init)=>{let state;const set=update=>{const next=typeof update==='function'?update(state):update;if(next&&next!==state)state={...state,...next};};const get=()=>state;state=init(set,get);const use=select=>select(state);use.getState=get;return use}};return prev.call(this,spec,...rest)};
const {useEditor}=require('../src/store.ts');const {makeClip}=require('../src/types.ts');let count=0;
const equal=(a,b)=>{assert.deepEqual(a,b);count++};const state=()=>useEditor.getState();
const newClip=makeClip('text','V1',0);state().addClip(newClip);equal(state().project.clips.length,1);equal(state().selected,newClip.id);
state().undo();equal(state().project.clips.length,0);
// After undo, a clip that no longer exists must not stay selected.
equal(state().selected,null);
state().redo();equal(state().project.clips.length,1);
state().setSelected(newClip.id);
const before=state().history.length;
state().beginTransaction();for(let i=1;i<=60;i++)state().updateClip(newClip.id,{name:'Edited '+i});state().endTransaction();
equal(state().history.length,before+1);equal(state().project.clips[0].name,'Edited 60');
state().undo();equal(state().project.clips[0].name,newClip.name);
state().redo();equal(state().project.clips[0].name,'Edited 60');
state().setLoopPlayback(true);equal(state().loopPlayback,true);equal(values.get('framework.loop'),'true');
state().setSnapping(false);equal(state().snapping,false);
const saved=JSON.parse(values.get('framework.autosave.v1'));equal(saved.clips[0].name,'Edited 60');
console.log(`PASS: ${count} actual store transitions with a lightweight Zustand adapter (UI integration not tested)`);
