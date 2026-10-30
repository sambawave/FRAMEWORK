/** Dependency-free deterministic release logic checks, also suitable for offline packaging. */
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}})(),fs=require('fs'),assert=require('node:assert/strict');
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const {newProject,makeClip,uuid}=require('../src/types.ts'),{reorderTracks,insertAtVisualIndex,setTrackFlag}=require('../src/engine/layers.ts'),{validateProject}=require('../src/engine/timeline.ts');
let n=0;function check(actual,expected,msg){assert.deepEqual(actual,expected,msg);n++}
const p=newProject(),base=p.tracks.map(t=>t.id);p.clips.push(makeClip('video','V2',2));
check(insertAtVisualIndex(p.tracks,['V2'],0).map(t=>t.id),['V2','V3','V1','A1','A2'],'reorder top');
check(insertAtVisualIndex(p.tracks,['V2','A1'],5).map(t=>t.id),['V3','V1','A2','V2','A1'],'stable multi-select');
check(p.tracks.map(t=>t.id),base,'original order unchanged');
check(reorderTracks(p.tracks,['not-there'],0),p.tracks,'unknown id no-op');
const solo=setTrackFlag(p,'V1','solo',true);check(solo.tracks.find(t=>t.id==='V1').solo,true,'solo enabled');check(p.tracks.find(t=>t.id==='V1').solo,undefined,'immutable solo');
const moved={...p,tracks:insertAtVisualIndex(p.tracks,['V2'],0)};
check(validateProject(JSON.parse(JSON.stringify(moved))).clips,p.clips,'reorder project roundtrip keeps clips');
const adjust=makeClip('adjustment','V1',0);adjust.effects=[{id:uuid(),type:'invert',amount:100,enabled:true}];moved.clips.push(adjust,makeClip('null','V1',0));
check(validateProject(JSON.parse(JSON.stringify(moved))).clips.length,3,'persist new clip kinds');
for(const file of ['src/components/Timeline.tsx','src/components/Viewer.tsx','src/components/Inspector.tsx','src/components/DesktopMenus.tsx','src/App.tsx','src/components/Home.tsx','src/components/BrandMark.tsx']){
 const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.ES2022,true,ts.ScriptKind.TSX);
 check(source.parseDiagnostics.length,0,`${file}: valid syntax`);
}
console.log(`PASS: ${n} release layer, persistence, syntax checks`);
