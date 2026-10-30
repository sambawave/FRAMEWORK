/** Dependency-free checks for the FRAMEWORK 2.2 editing improvements. */
const assert=require('node:assert/strict'),fs=require('node:fs');
const ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}})();
require.extensions['.ts']=(mod,file)=>{const src=fs.readFileSync(file,'utf8');const compiled=ts.transpileModule(src,{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});mod._compile(compiled.outputText,file)};
const {newProject,makeClip}=require('../src/types.ts');
const {snapEdit}=require('../src/engine/snapping.ts');
const {shapeNames,shapePath,createShapeGeometry}=require('../src/engine/shapes.ts');
let checks=0;const equal=(a,b,name)=>{assert.deepEqual(a,b,name);checks++};const yes=(expr,name)=>{assert(expr,name);checks++};
let p=newProject(),a=makeClip('video','V1',25),b=makeClip('video','V1',250);a.duration=100;b.duration=70;p.clips=[a,b];p.markers=[{id:'mark1',frame:350}];
equal(snapEdit(p,a,'move',122,12,true,2).delta,125,'clip end snaps to second clip start');
equal(snapEdit(p,a,'move',123,12,false,2).delta,123,'snapping disabled');
equal(snapEdit(p,a,'right',123,12,true,2).delta,125,'right trim snaps to second clip start');
a.sourceStart=20;equal(snapEdit(p,a,'left',-11,12,true,2).delta,-13,'left trim snaps to playhead');
equal(snapEdit(p,b,'move',98,12,true,2).delta,100,'clip end snaps to marker');
equal(snapEdit(p,b,'move',98,12,false,2).guide,null,'no visual line when snapping disabled');
equal(snapEdit(p,a,'move',30,12,true,32).delta,30,'no accidental distant snapping at high zoom');
const g=createShapeGeometry([[40,40],[160,160]]);equal([g.x,g.y,g.width,g.height],[100,100,120,120],'shape drawing rect');
const path={ops:[],beginPath(){this.ops.push('begin')},rect(){this.ops.push('rect')},roundRect(){this.ops.push('round')},ellipse(){this.ops.push('ellipse')},moveTo(){this.ops.push('move')},lineTo(){this.ops.push('line')},bezierCurveTo(){this.ops.push('bezier')},closePath(){this.ops.push('close')}};
for(const shape of shapeNames){const clip=makeClip('shape','V1',0);clip.shape=shape;if(shape==='bezier')clip.shapePoints=[[-1,-1],[0,1],[1,-1]];path.ops=[];shapePath(path,clip,150,100);yes(path.ops.length>1,`${shape} draws real path`)}
const volume=makeClip('audio','A1',0);volume.volume=.75;volume.audioMuted=true;equal(JSON.parse(JSON.stringify(volume)).audioMuted,true,'mute persists in .framework JSON');equal(JSON.parse(JSON.stringify(volume)).volume,.75,'volume persists');
for(const file of ['src/App.tsx','src/components/Viewer.tsx','src/components/Timeline.tsx','src/components/Inspector.tsx','src/engine/compositor.ts']){
 const content=fs.readFileSync(file,'utf8');const parsed=ts.createSourceFile(file,content,ts.ScriptTarget.ES2022,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 equal(parsed.parseDiagnostics.length,0,`${file}: TS syntax valid`);
}
console.log(`PASS: ${checks} final editing upgrade checks`);
