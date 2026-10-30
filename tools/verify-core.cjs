/* Dependency-independent local smoke test. Uses the TypeScript compiler installed globally
   or installed as a development dependency. Checks actual timeline engine functions. */
const fs=require('node:fs');const assert=require('node:assert/strict');
let ts;try{ts=require('typescript')}catch{try{ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}})()}catch{console.error('Install TypeScript: npm install');process.exit(1)}}
require.extensions['.ts']=function(mod,filename){const content=fs.readFileSync(filename,'utf8');const js=ts.transpileModule(content,{fileName:filename,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;mod._compile(js,filename)};
const {newProject,makeClip,seconds,frameFromSeconds}=require('../src/types.ts');
const {evaluate,splitClip,trimClip,addEffect,validateProject,sourceTime}=require('../src/engine/timeline.ts');
const {cssFilter}=require('../src/engine/compositor.ts');
let assertions=0;function check(fn){fn();assertions++}
check(()=>{const p=newProject();p.fps={num:24000,den:1001};assert.equal(seconds(24000,p),1001);assert.equal(frameFromSeconds(1001,p),24000)});
check(()=>{const p=newProject(),c=makeClip('video','V1',10);p.clips=[c];const q=splitClip(p,c.id,40);assert.equal(q.clips.length,2);assert.equal(q.clips[1].sourceStart,30);assert.equal(sourceTime(q.clips[1],40,p),1)});
check(()=>{const c=makeClip('video','V1',20);c.sourceStart=25;const n=trimClip(c,'left',15);assert.equal(n.start,35);assert.equal(n.sourceStart,40)});
check(()=>{const keys=[{frame:0,value:0,ease:'linear'},{frame:10,value:100,ease:'linear'}];assert.equal(evaluate(keys,0,5),50)});
check(()=>{const keys=[{frame:0,value:0,ease:'hold'},{frame:10,value:100,ease:'linear'}];assert.equal(evaluate(keys,0,5),0)});
check(()=>{const c=addEffect(makeClip('video','V1',0),'blur');assert.equal(cssFilter(c),'blur(4px)')});
check(()=>{const p=newProject();assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))),p)});
console.log('PASS: '+assertions+' core timeline/effect/persistence checks');
