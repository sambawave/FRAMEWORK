/** Creates temporary ESM modules for browser engine tests without npm dependencies. */
const fs=require('node:fs'),path=require('node:path'),ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}})();
const out=process.argv[2]||'/tmp/framework-engine-test';fs.mkdirSync(out,{recursive:true});
for(const name of ['types','engine/timeline','engine/masks','engine/pixelEffects','engine/motionPresets','engine/compositor','engine/textAnimation','engine/threeScene','engine/audioFx','engine/playback','engine/shapes','engine/snapping','engine/layers','fonts/fontLibrary','engine/sequenceExport']){
 const src=fs.readFileSync(path.join(__dirname,'../src',name+'.ts'),'utf8');
 const js=ts.transpileModule(src,{fileName:name+'.ts',compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace(/from ['"](\.\.?\/[^'"]+)['"]/g,(_,s)=>`from '${s}.mjs'`);
 const target=path.join(out,name+'.mjs');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,js);
}
fs.writeFileSync(path.join(out,'index.html'),'<html><body><h1>FRAMEWORK renderer verification</h1></body></html>');console.log(out);
