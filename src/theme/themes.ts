/** UI-only colors. The Default theme deliberately leaves 2.3's CSS untouched. */
export type ThemeColors={timelineBackground:string;trackBackground:string;layerHeaders:string;timelineRuler:string;clipBackground:string;selectedClip:string;trackSeparators:string;playhead:string;markers:string;timelineToolbar:string;accent:string;button:string;highlight:string;background:string;panel:string;text:string;border:string;shadow:number;brightness:number;contrast:number;tint:string};
export type ThemeEntry={id:string;name:string;colors:ThemeColors};
export const THEMES:ThemeEntry[]=[
 {id:'default',name:'Default',colors:{accent:'#e6a14a',button:'#35363a',highlight:'#55565a',background:'#17181a',panel:'#252629',text:'#e3e3e5',border:'#101113',shadow:70,brightness:100,contrast:100,tint:'#ffffff',timelineBackground:'#15161a',trackBackground:'#1b1d23',layerHeaders:'#282a32',timelineRuler:'#20232b',clipBackground:'#363e66',selectedClip:'#d9d0ff',trackSeparators:'#30313a',playhead:'#c9a8fc',markers:'#f2b158',timelineToolbar:'#25262b'}},
 {id:'dark',name:'Dark',colors:{accent:'#d8a86e',button:'#222328',highlight:'#44454b',background:'#0e0f12',panel:'#17181c',text:'#e0e1e3',border:'#08090a',shadow:85,brightness:94,contrast:110,tint:'#ffffff',timelineBackground:'#0c0d11',trackBackground:'#14151a',layerHeaders:'#1b1c21',timelineRuler:'#15161a',clipBackground:'#282c43',selectedClip:'#d8a86e',trackSeparators:'#24262c',playhead:'#dea45c',markers:'#e8bd7d',timelineToolbar:'#18191c'}},
 {id:'light',name:'Light',colors:{accent:'#995c22',button:'#d2d4d7',highlight:'#ffffff',background:'#e7e8eb',panel:'#f6f7f8',text:'#202226',border:'#a1a4aa',shadow:28,brightness:103,contrast:100,tint:'#ffffff',timelineBackground:'#eef0f2',trackBackground:'#e2e4e7',layerHeaders:'#d5d8de',timelineRuler:'#e6e7ea',clipBackground:'#526587',selectedClip:'#995c22',trackSeparators:'#c4c6cc',playhead:'#ae6728',markers:'#a54c2c',timelineToolbar:'#dfe2e6'}},
 {id:'mono',name:'Monochrome',colors:{accent:'#e4e4e5',button:'#45464a',highlight:'#727378',background:'#17181a',panel:'#252629',text:'#e9e9e9',border:'#101113',shadow:68,brightness:100,contrast:102,tint:'#ffffff',timelineBackground:'#17181a',trackBackground:'#202124',layerHeaders:'#303135',timelineRuler:'#242629',clipBackground:'#48494c',selectedClip:'#f0f0f1',trackSeparators:'#38383c',playhead:'#e0e0e1',markers:'#ffffff',timelineToolbar:'#303135'}}
];
const VALID=/^#[0-9a-f]{6}$/i;
export function validColor(s:string):boolean{return VALID.test(s)}
export function sanitizeColors(x:Partial<ThemeColors>,base:ThemeColors=THEMES[0].colors):ThemeColors{
 const next={...base};for(const key of ['accent','button','highlight','background','panel','text','border','tint','timelineBackground','trackBackground','layerHeaders','timelineRuler','clipBackground','selectedClip','trackSeparators','playhead','markers','timelineToolbar'] as const)if(typeof x[key]==='string'&&validColor(x[key]!))next[key]=x[key]!;
 for(const key of ['shadow','brightness','contrast'] as const)if(typeof x[key]==='number'&&Number.isFinite(x[key]))next[key]=Math.max(0,Math.min(200,x[key]!));return next;
}
export function loadThemes():{selected:string;custom:ThemeEntry[]}{
 try{const o=JSON.parse(localStorage.getItem('framework.themes.v1')??'null');if(!o||!Array.isArray(o.custom))throw Error('Invalid');
 return {selected:typeof o.selected==='string'?o.selected:'default',custom:o.custom.filter((x:ThemeEntry)=>x&&typeof x.id==='string'&&typeof x.name==='string').slice(0,60).map((x:ThemeEntry)=>({...x,colors:sanitizeColors(x.colors??{})}))};}
 catch{return {selected:'default',custom:[]}}
}
export function storeThemes(selected:string,custom:ThemeEntry[]){localStorage.setItem('framework.themes.v1',JSON.stringify({selected,custom}))}
export function applyTheme(entry:ThemeEntry){
 const root=document.documentElement;
 const c=entry.colors;
 if(entry.id==='default')root.removeAttribute('data-framework-theme');
 else root.setAttribute('data-framework-theme',entry.id);
 // Legacy variables remain available to every previously implemented theme control.
 for(const [key,value] of Object.entries(c))root.style.setProperty(`--theme-${key}`,String(value));
 root.style.setProperty('--theme-shadow-alpha',String(c.shadow/100));
 // Semantic tokens are the single source of truth for *all* editing surfaces.
 const light=entry.id==='light'||(entry.id!=='default'&&isLightColor(c.panel));
 const tokens:Record<string,string>={
  'bg':c.background,'panel':c.panel,'surface':c.button,'raised':c.button,
  'recessed':light?'#e3e5e8':'#1b1c1e','button':c.button,'button-top':c.highlight,
  'button-bottom':light?'#b9bbc0':'#292a2c','text':c.text,
  'muted':light?'#50545c':'#a2a4aa','subtle':light?'#666a73':'#93969c',
  'border':c.border,'border-strong':light?'#80848b':'#090a0c',
  'shadow':light?'#444b542e':'#0000008a','accent':c.accent,
  'selected':c.selectedClip,'menu':light?'#f2f3f5':c.panel,
  'input':light?'#ffffff':'#1f2022','input-border':light?'#9ca0a8':'#131415',
  'timeline':c.timelineBackground,'track':c.trackBackground,'layer':c.layerHeaders,
  'ruler':c.timelineRuler,'clip':c.clipBackground,'playhead':c.playhead,
  'marker':c.markers,'timeline-toolbar':c.timelineToolbar
 };
 for(const [key,val] of Object.entries(tokens))root.style.setProperty(`--fw-${key}`,val);
}
export function isLightColor(hex:string):boolean{
 if(!validColor(hex))return false;
 const [r,g,b]=hexToRgb(hex);
 const srgb=[r,g,b].map(x=>{const v=x/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});
 return .2126*srgb[0]+.7152*srgb[1]+.0722*srgb[2]>.45;
}
export function hsvToRgb(h:number,s:number,v:number):[number,number,number]{const k=(n:number)=>(n+h/60)%6;const f=(n:number)=>v-v*s*Math.max(0,Math.min(k(n),4-k(n),1));return [f(5),f(3),f(1)].map(x=>Math.round(x*255)) as [number,number,number]}
export function rgbToHex(r:number,g:number,b:number){return '#'+[r,g,b].map(n=>Math.round(Math.max(0,Math.min(255,n))).toString(16).padStart(2,'0')).join('')}
export function hexToRgb(hex:string):[number,number,number]{return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)) as [number,number,number]}
export function rgbToHsv(r:number,g:number,b:number):[number,number,number]{r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=0;if(d)h=max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4;return [(h*60+360)%360,max===0?0:d/max,max]}
export function rgbToHsl(r:number,g:number,b:number):[number,number,number]{const [h,,]=rgbToHsv(r,g,b),max=Math.max(r,g,b)/255,min=Math.min(r,g,b)/255,l=(max+min)/2,d=max-min;return [Math.round(h),Math.round(d===0?0:d/(1-Math.abs(2*l-1))*100),Math.round(l*100)]}
export function hslToRgb(h:number,s:number,l:number):[number,number,number]{s/=100;l/=100;const a=s*Math.min(l,1-l);const f=(n:number)=>{const k=(n+h/30)%12;return Math.round(255*(l-a*Math.max(-1,Math.min(k-3,9-k,1))))};return [f(0),f(8),f(4)]}
