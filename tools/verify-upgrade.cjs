// Dependency-free smoke tests executed through the globally available TypeScript compiler.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}})();
require.extensions['.ts']=(mod,file)=>{const src=fs.readFileSync(file,'utf8');const out=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});mod._compile(out.outputText,file)};
const assert=require('node:assert/strict');
const {newProject,makeClip}=require('../src/types.ts');
const {sourceTime,evaluate,splitClip}=require('../src/engine/timeline.ts');
const {applyChromaPixels,cssFilter}=require('../src/engine/compositor.ts');
const pixels=new Uint8ClampedArray([0,255,0,255,255,0,0,255]);applyChromaPixels(pixels,{id:'k',type:'chroma',enabled:true,amount:25,softness:10});assert.equal(pixels[3],0);assert.equal(pixels[7],255);
const c=makeClip('video','V1',0);c.duration=60;c.reverse=true;assert(Math.abs(sourceTime(c,0,newProject())-59/30)<.001);
const p=newProject();p.clips.push(c);const parts=splitClip(p,c.id,30);assert.equal(parts.clips.length,2);assert(Math.abs(sourceTime(parts.clips[1],30,p)-29/30)<.001);
const ease=[{frame:0,value:0,ease:'easeInOut'},{frame:100,value:100,ease:'linear'}];assert(evaluate(ease,0,10)<10);
c.effects=[{id:'a',type:'invert',amount:100,enabled:true},{id:'b',type:'chroma',amount:20,enabled:true}];assert.equal(cssFilter(c),'invert(100%)');
console.log('PASS: keyed alpha, reverse, reverse split, Easy Ease, effect filter (5 assertions)');
