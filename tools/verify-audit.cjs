/* Real value assertions against the transpiled TypeScript engine, no npm required. */
const assert=require('node:assert/strict');const {pathToFileURL}=require('node:url');const path=require('node:path');const fs=require('node:fs');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}})();
const root=path.join(__dirname,'../src');const dest='/tmp/framework-audit-engine';fs.rmSync(dest,{recursive:true,force:true});fs.mkdirSync(dest,{recursive:true});
for(const file of ['types','engine/timeline','engine/masks','engine/motionPresets']){
 const src=fs.readFileSync(path.join(root,file+'.ts'),'utf8');const js=ts.transpileModule(src,{fileName:file+'.ts',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},reportDiagnostics:true});
 assert.ok(!(js.diagnostics||[]).some(d=>d.category===ts.DiagnosticCategory.Error),`invalid TypeScript ${file}`);
 const out=path.join(dest,file+'.mjs');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,js.outputText.replace(/from ['"](\.\.?\/[^'"]+)['"]/g,(_,s)=>`from '${s}.mjs'`));
}
(async()=>{
 const {makeClip,newProject}=await import(pathToFileURL(path.join(dest,'types.mjs')).href);
 const {evaluate,valueAt,splitClip,resolvedEase}=await import(pathToFileURL(path.join(dest,'engine/timeline.mjs')).href);
 const {createMotionKeys,initialMotionOptions}=await import(pathToFileURL(path.join(dest,'engine/motionPresets.mjs')).href);
 const c=makeClip('shape','V1',0);c.keyframes.x=[{frame:0,value:0,ease:'easeInOut',autoEase:true},{frame:100,value:100,ease:'linear',autoEase:true}];
 let count=0;const near=(actual,expected)=>{assert.ok(Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);count++};
 c.smoothEasing=false;for(let f=0;f<=100;f++)near(valueAt(c,'x',f),f);
 c.smoothEasing=true;near(valueAt(c,'x',25),10.3515625);near(valueAt(c,'x',75),89.6484375);
 c.smoothEasing=false;near(valueAt(c,'x',25),25);
 near(evaluate([{frame:0,value:0,ease:'easeInOut',manualEase:true},{frame:100,value:100,ease:'linear'}],0,25,false),10.3515625);
 const legacy=[{frame:0,value:0,ease:'linear'},{frame:100,value:100,ease:'linear'}];near(evaluate(legacy,0,25,true),25);
 near(evaluate([{...legacy[0],ease:'hold'},legacy[1]],0,25,true),0);
 const p=newProject();const animated=createMotionKeys(c,p,0,'bounce',initialMotionOptions);assert.equal(animated.keyframes.x[0].manualEase,true);count++;
 const pc=makeClip('shape','V1',0);pc.duration=100;pc.smoothEasing=false;pc.keyframes.x=[{frame:0,value:0,ease:'easeInOut'},{frame:100,value:100,ease:'linear'}];p.clips.push(pc);near(splitClip(p,pc.id,25).clips[0].keyframes.x.at(-1).value,25);
 assert.equal(resolvedEase({frame:0,value:0,ease:'easeInOut',autoEase:true},false),'linear');count++;
 console.log(`PASS: ${count} actual engine interpolation, legacy project, preset, split and toggle checks`);
})().catch(e=>{console.error(e);process.exit(1)});
