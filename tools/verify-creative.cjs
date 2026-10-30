/* Dependency-free new feature tests. Verifies logic, not an npm build or GPU rendering. */
const fs=require('node:fs'),assert=require('node:assert/strict');let ts;
try{ts=require('typescript')}catch{ts=(()=>{try{return require('typescript')}catch{return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}})()}
require.extensions['.ts']=function(m,file){m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file)};
const {THEMES,rgbToHex,hexToRgb,hsvToRgb,rgbToHsv,hslToRgb,rgbToHsl,sanitizeColors,validColor,loadThemes,storeThemes,applyTheme}=require('../src/theme/themes.ts');
const {textCharacterState}=require('../src/engine/textAnimation.ts');
const {makeClip,newProject}=require('../src/types.ts'),{evaluate,valueAt,validateProject}=require('../src/engine/timeline.ts'),{cssFilter}=require('../src/engine/compositor.ts');
let checks=0;function check(fn,label){try{fn();checks++}catch(e){e.message=label+': '+e.message;throw e}}
const store={};global.localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v}};
const style={vars:new Map(),setProperty(k,v){this.vars.set(k,v)},removeProperty(k){this.vars.delete(k)}};
const root={style,attrs:{},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]}};global.document={documentElement:root};
check(()=>assert.equal(THEMES.length,4),'theme presets count');
check(()=>assert.equal(THEMES[0].colors.accent,'#e6a14a'),'default accent intact');
check(()=>assert.equal(rgbToHex(255,0,17),'#ff0011'),'rgb->hex');
check(()=>assert.deepEqual(hexToRgb('#ee1020'),[238,16,32]),'hex->rgb');
for(const color of ['#ff0000','#00ff00','#0000ff','#ffffff','#010203','#a7823a']){
 check(()=>assert.equal(rgbToHex(...hsvToRgb(...rgbToHsv(...hexToRgb(color)))),color),'HSV roundtrip '+color);
 check(()=>{const got=rgbToHex(...hslToRgb(...rgbToHsl(...hexToRgb(color))));const a=hexToRgb(color),b=hexToRgb(got);assert.ok(a.every((x,i)=>Math.abs(x-b[i])<=3),`${color}->${got}`)},'HSL roundtrip '+color);
}
check(()=>assert.equal(validColor('#abcABC'),true),'hex syntax');
check(()=>assert.equal(validColor('red;url(javascript:evil)'),false),'css injection rejection');
check(()=>assert.equal(sanitizeColors({accent:'injection',shadow:900}).accent,THEMES[0].colors.accent),'color sanitation');
check(()=>assert.equal(sanitizeColors({shadow:900}).shadow,200),'numeric sanitation');
check(()=>{storeThemes('mono',[]);assert.equal(loadThemes().selected,'mono')},'theme persistence');
check(()=>{applyTheme(THEMES[1]);assert.equal(root.attrs['data-framework-theme'],'dark')},'theme activation');
check(()=>{applyTheme(THEMES[0]);assert.equal(root.attrs['data-framework-theme'],undefined)},'default removes overrides');
const anim={mode:'cascade',duration:30,delay:3,intensity:100,loop:false};
check(()=>assert.equal(textCharacterState(anim,0,0,5).opacity,0),'character cascade start transparent');
check(()=>assert.equal(textCharacterState(anim,30,0,5).opacity,1),'character cascade final opaque');
check(()=>assert.equal(textCharacterState(anim,6,3,5).opacity,0),'staggered letters');
check(()=>assert.equal(textCharacterState({...anim,mode:'typewriter'},4,2,5).opacity,0),'typewriter hidden');
check(()=>assert.equal(textCharacterState({...anim,mode:'typewriter'},8,2,5).opacity,1),'typewriter appeared');
check(()=>assert.deepEqual(textCharacterState({...anim,mode:'wave'},8,2,5),textCharacterState({...anim,mode:'wave'},8,2,5)),'animation deterministic');
check(()=>assert.equal(textCharacterState(undefined,25,0,2).opacity,1),'legacy text untouched');
const p=newProject(),c=makeClip('text',p.tracks[0].id,5);c.text='FRAMEWORK';c.textAnimation={...anim};c.characters={2:{opacity:.2,x:8}};
check(()=>{p.clips.push(c);assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))).clips[0].characters,c.characters)},'character project roundtrip');
c.keyframes.textIntensity=[{frame:0,value:0,ease:'linear'},{frame:30,value:300,ease:'linear'}];
check(()=>assert.equal(valueAt(c,'textIntensity',20),150),'text intensity automation');
c.transform.scaleX=.8;c.transform.scaleY=1.4;
check(()=>assert.equal(valueAt(c,'scaleX',5),.8),'independent horizontal dimensions');
check(()=>assert.equal(valueAt(c,'scaleY',5),1.4),'independent vertical dimensions');
c.effects=[{id:'inversion',type:'invert',amount:50,enabled:true}];
check(()=>assert.equal(cssFilter(c),'invert(50%)'),'50% inversion preview filter');
const g=makeClip('3d',p.tracks[0].id,0);g.three={primitive:'torus',rotationX:0,rotationY:45,rotationZ:0,depth:0,scaleX:1,scaleY:1,scaleZ:1,roughness:.2,metalness:.9,emissive:'#000000',wireframe:false};
check(()=>{p.clips.push(g);assert.equal(validateProject(JSON.parse(JSON.stringify(p))).clips[1].three.primitive,'torus')},'3D metadata serialization');
check(()=>assert.equal(valueAt(g,'rotationY',0),45),'3D rotation');
g.keyframes.rotationY=[{frame:0,value:0,ease:'easeInOut'},{frame:30,value:90,ease:'linear'}];
check(()=>assert.equal(valueAt(g,'rotationY',15),45),'3D rotation animation');
check(()=>assert.equal(evaluate(g.keyframes.rotationY,0,0),0),'animation boundary');
for(const file of ['src/components/ThemeManager.tsx','src/components/ProSlider.tsx','src/components/Inspector.tsx','src/components/Timeline.tsx','src/engine/gpuThree.ts','src/engine/textAnimation.ts','src/App.tsx']){
 const source=ts.createSourceFile(file,fs.readFileSync(require('node:path').join(__dirname,'..',file),'utf8'),ts.ScriptTarget.ES2022,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);check(()=>assert.equal(source.parseDiagnostics.length,0),file+' parse');
}
console.log('PASS: '+checks+' creative theme, text, 3D metadata and syntax checks');
