/** Executable dependency-free tests: exact-frame navigation, attributes, shortcuts, multi-selection. */
const assert=require('node:assert/strict');const fs=require('node:fs'),Module=require('node:module');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}
const cache=new Map();global.localStorage={getItem:k=>cache.get(k)??null,setItem:(k,v)=>cache.set(k,v),removeItem:k=>cache.delete(k)};
global.window={dispatchEvent:()=>{}};global.HTMLElement=class{};
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const old=Module._load;Module._load=function(name,...args){if(name==='zustand')return {create:init=>{let state;const set=v=>{const next=typeof v==='function'?v(state):v;if(next&&next!==state)state={...state,...next}},get=()=>state;state=init(set,get);const hook=select=>select(state);hook.getState=get;return hook}};return old.call(this,name,...args)};
const {makeClip}=require('../src/types.ts'),{copyAttributes,pasteAttributes}=require('../src/engine/attributes.ts');
const {nearestKeyframe}=require('../src/engine/keyframes.ts'),{COMMANDS,loadBindings,shortcutConflicts,keyFromEvent,commandFor,RESERVED}=require('../src/commands.ts'),{useEditor}=require('../src/store.ts');
let assertions=0;const eq=(a,b)=>{assert.deepEqual(a,b);assertions++};
const src=makeClip('text','V1',0),dest=makeClip('text','V1',45);src.transform={x:111,y:-23,scale:1.2,scaleX:1.1,scaleY:2,rotation:44,opacity:.4};src.fontFamily='Arial';dest.transform.x=99;
src.keyframes.x=[{frame:0,value:0,ease:'linear'},{frame:10,value:30,ease:'easeInOut',manualEase:true},{frame:30,value:150,ease:'hold'}];
const attrs=copyAttributes(src,['rotation','opacity','animation'],5);const pasted=pasteAttributes(dest,attrs,{relativeFrame:10});eq(pasted.transform.x,99);eq(pasted.transform.rotation,44);eq(pasted.transform.opacity,.4);eq(pasted.keyframes.x.map(k=>k.frame),[5,15,35]);eq(pasted.id,dest.id);eq(pasted.start,dest.start);
const first=nearestKeyframe(src,'x',0,1),none=nearestKeyframe(src,'x',0,-1);eq(first,10);eq(none,null);eq(nearestKeyframe(src,'x',30,-1),10);eq(nearestKeyframe(src,'x',30,1),null);
const bindings=loadBindings();eq(shortcutConflicts(bindings),[]);eq(RESERVED.has('Mod+W'),true);
const key=(code,props={})=>keyFromEvent({code,shiftKey:false,ctrlKey:false,metaKey:false,altKey:false,...props});eq(key('KeyK'),'K');eq(key('KeyP',{ctrlKey:true,shiftKey:true}),'Mod+Shift+P');eq(key('KeyW',{ctrlKey:true}),'Mod+W');
const clone={...bindings,cut:['Mod+S']};eq(shortcutConflicts(clone).length>0,true);
const state=useEditor.getState(),current=()=>useEditor.getState(),one=makeClip('shape','V1',0),two=makeClip('text','V2',30);two.transform.x=123;state.addClip(one);state.addClip(two);state.setSelectedIds([one.id,two.id]);eq(current().selectedIds.length,2);
state.copyAttributes(['position','opacity']);eq(current().attributes.sourceKind,'text');const before=current().history.length;state.pasteAttributes();eq(current().history.length,before+1);
state.duplicate();eq(current().project.clips.length,4);eq(current().selectedIds.length,2);
state.undo();eq(current().project.clips.length,2);state.redo();eq(current().project.clips.length,4);
state.setSelectedIds(current().project.clips.slice(-2).map(c=>c.id));state.removeClip(current().selectedIds[0]);eq(current().project.clips.length,2);eq(current().selectedIds.length,0);
console.log(`PASS: ${assertions} executable attribute, multi-edit, frame navigation, shortcut-conflict, history checks`);
