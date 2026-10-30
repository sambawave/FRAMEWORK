/** Parse every authored TS/TSX module to detect syntax regressions without npm. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}})();
const root=path.resolve(__dirname,'../src');let count=0;
const walk=dir=>{for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())walk(file);else if(/\.tsx?$/.test(file)){
 const source=fs.readFileSync(file,'utf8');const sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('x')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 const problems=sf.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' '));assert.deepEqual(problems,[],`${file}: ${problems.join('; ')}`);
 const output=ts.transpileModule(source,{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true});
 assert.ok(output.outputText,`empty transpilation: ${file}`);count++;
}}};walk(root);console.log(`PASS: ${count} actual TS/TSX source modules parsed and transpiled successfully (not a full typecheck)`);
