/** Editor-only keyboard registry. Browser and native input bindings are never overridden. */
export type Command={id:string;name:string;category:string;keys:string[]};
export const COMMANDS:Command[]=[
 ['play','Play / Pause','Playback',['Space']],['stop','Stop playback','Playback',['K']],['stepBack','Previous frame','Playback',['ArrowLeft']],['stepNext','Next frame','Playback',['ArrowRight']],['back10','Back ten frames','Playback',['Shift+ArrowLeft']],['next10','Forward ten frames','Playback',['Shift+ArrowRight']],['start','Start of timeline','Playback',['Home']],['end','End of timeline','Playback',['End']],
 ['prevClip','Previous clip','Navigation',['PageUp']],['nextClip','Next clip','Navigation',['PageDown']],['prevKey','Previous keyframe','Animation',['BracketLeft']],['nextKey','Next keyframe','Animation',['BracketRight']],['addKey','Add position keyframe','Animation',['Shift+K']],['removeKey','Remove position keyframe','Animation',['Alt+K']],['easyEase','Easy Ease','Animation',['F9']],['toggleEase','Toggle automatic smoothing','Animation',['Shift+E']],
 ['undo','Undo','Edit',['Mod+Z']],['redo','Redo','Edit',['Mod+Shift+Z','Mod+Y']],['copy','Copy clip','Edit',['Mod+C']],['paste','Paste clip','Edit',['Mod+V']],['cut','Cut clip','Edit',['Mod+X']],['duplicate','Duplicate clip','Edit',['Mod+D']],['delete','Delete selected','Edit',['Delete']],['split','Split at playhead','Edit',['Mod+Shift+D']],['copyAttributes','Copy attributes','Edit',['Mod+Alt+C']],['pasteAttributes','Paste attributes','Edit',['Mod+Alt+V']],
 ['snapping','Magnetic snapping','Timeline',['Shift+S']],['loop','Loop playback','Timeline',['Shift+L']],['marker','Add marker','Timeline',['M']],['zoomIn','Timeline zoom in','Timeline',['Equal']],['zoomOut','Timeline zoom out','Timeline',['Minus']],
 ['toolSelect','Select tool','Tools',['V']],['toolRazor','Razor tool','Tools',['C']],['toolScale','Scale tool','Tools',['Shift+R']],['toolRotate','Rotate tool','Tools',['Shift+T']],['toolMask','Mask tool','Tools',['Shift+M']],
 ['save','Save project','File',['Mod+S']],['import','Import media','File',['Mod+O']],['export','Export video','File',['Mod+Shift+E']],['palette','Command palette','Workspace',['Mod+Shift+P']],['shortcuts','Keyboard shortcuts editor','Workspace',[]],['effects','Effects browser','Workspace',[]],['library','Media library','Workspace',[]]
 ,...(['brightness','contrast','saturate','blur','hue','grayscale','sepia','invert','chroma','pixelate','vignette','grain','threshold','posterize','gamma','rgbSplit','scanlines','glow','exposure'] as const).map(type=>['effect:'+type,'Effect: '+type,'Effects',[]])
 ].map(([id,name,category,keys])=>({id:id as string,name:name as string,category:category as string,keys:keys as string[]}));
const STORAGE='framework.keybindings.v1';
export const RESERVED=new Set(['Mod+T','Mod+W','Mod+R','Mod+Shift+R','Mod+L','Mod+N','Mod+Tab','Alt+ArrowLeft','Alt+ArrowRight','F5']);
export type Bindings=Record<string,string[]>;
export function defaults():Bindings{return Object.fromEntries(COMMANDS.map(c=>[c.id,[...c.keys]]))}
export function normalizeShortcut(key:string){return key.split('+').map(x=>x.trim()).join('+')}
export function keyFromEvent(e:KeyboardEvent):string{
 const keys=[];if(e.ctrlKey||e.metaKey)keys.push('Mod');if(e.altKey)keys.push('Alt');if(e.shiftKey)keys.push('Shift');
 const k=e.code==='Space'?'Space':e.code==='Equal'?'Equal':e.code==='Minus'?'Minus':e.code.startsWith('Key')?e.code.slice(3):e.code.startsWith('Digit')?e.code.slice(5):e.code;
 if(['ControlLeft','ControlRight','MetaLeft','MetaRight','AltLeft','AltRight','ShiftLeft','ShiftRight'].includes(k))return '';
 return [...keys,k].join('+');
}
export function shortcutConflicts(bindings:Bindings){const used=new Map<string,string>();const conflicts:string[]=[];
 for(const cmd of COMMANDS){for(const key of bindings[cmd.id]??[]){if(RESERVED.has(key))conflicts.push(`${cmd.name}: ${key} is browser-reserved`);const other=used.get(key);if(other&&other!==cmd.id)conflicts.push(`${key}: ${other} and ${cmd.id}`);used.set(key,cmd.id)}}return conflicts;
}
export function loadBindings():Bindings{try{const obj=JSON.parse(localStorage.getItem(STORAGE)??'null');if(!obj||typeof obj!=='object')return defaults();const next=defaults();for(const cmd of COMMANDS)if(Array.isArray(obj[cmd.id]))next[cmd.id]=obj[cmd.id].filter((v:unknown)=>typeof v==='string').slice(0,3);return shortcutConflicts(next).length?defaults():next}catch{return defaults()}}
export function saveBindings(bindings:Bindings){if(shortcutConflicts(bindings).length)throw Error(shortcutConflicts(bindings).join('; '));localStorage.setItem(STORAGE,JSON.stringify(bindings));window.dispatchEvent(new Event('framework:shortcuts-updated'))}
export function commandFor(e:KeyboardEvent,b:Bindings):string|undefined{
 const key=keyFromEvent(e);
 const typing=(e.target instanceof HTMLElement)&&!!e.target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]');
 // Native text undo/copy/paste and arrow editing always win. Saving and palette opening are safe.
 if(typing&&!['Mod+S','Mod+Shift+P'].includes(key))return;
 if(e.isComposing||(e.repeat&&!key.endsWith('ArrowLeft')&&!key.endsWith('ArrowRight'))||e.key==='Process')return;
 if(RESERVED.has(key))return;
 return COMMANDS.find(c=>(b[c.id]??[]).includes(key))?.id;
}
