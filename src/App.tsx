import {WORKSPACES,isWorkspace,WorkspaceName} from './workspaces';
import {AttributeDialog} from './components/AttributeDialog';
import {GlobalContextMenu} from './components/GlobalContextMenu';
import {ShortcutWorkspace} from './components/ShortcutWorkspace';
import {commandFor,loadBindings} from './commands';
import {nearestKeyframe} from './engine/keyframes';
import {useEffect,useRef,useState} from 'react';
import {Home} from './components/Home';
import {ensureProjectFonts,initFonts,portableFonts,restorePortableFonts} from './fonts/fontLibrary';
import {BrandMark} from './components/BrandMark';
import {DesktopMenus} from './components/DesktopMenus';
import {ThemeManager} from './components/ThemeManager';
import {threeSupported} from './engine/threeScene';
import {applyTheme,loadThemes,THEMES} from './theme/themes';
import {listProjects,persistProject} from './storage/projects';
import {addEffect} from './engine/timeline';
import {shapeNames,shapeLabels} from './engine/shapes';
import {AudioLines,Download,ImageDown,FilePlus2,FolderOpen,HelpCircle,Layers3,Save,Settings2,Shapes,Square,Type,Upload,Video,X,MousePointer2,RotateCw,Maximize2,Scissors,Undo2,Redo2,Sparkles,FlipHorizontal2,Blend,PenTool,Pipette,WandSparkles,Magnet,PanelLeft,SlidersHorizontal,Clapperboard,Film} from 'lucide-react';
import {MediaPanel,importFiles} from './components/MediaPanel';
import {Timeline} from './components/Timeline';
import {Viewer} from './components/Viewer';
import {Inspector} from './components/Inspector';
import {makeClip,projectEnd} from './types';
import type {Clip} from './types';
import {useEditor} from './store';
import {download} from './storage/db';
import {exportVideo,supportedVideoMimes,ExportHandle} from './engine/playback';
import {exportImageSequence} from './engine/sequenceExport';
import {validateProject} from './engine/timeline';
function ExportDialog({close}:{close:()=>void}){
 const p=useEditor(s=>s.project),urls=useEditor(s=>s.mediaUrls);
 const capabilities=supportedVideoMimes();
 type Format='webm'|'mp4'|'png'|'jpeg'|'gif';
 const [format,setFormat]=useState<Format>(capabilities.webm?'webm':capabilities.mp4?'mp4':'png');
 const [width,setWidth]=useState(p.width),[height,setHeight]=useState(p.height),[frameRate,setFrameRate]=useState(p.fps.num/p.fps.den);
 const [bitrate,setBitrate]=useState(6),[audioBitrate,setAudioBitrate]=useState(192),[includeAudio,setIncludeAudio]=useState(true),[quality,setQuality]=useState(.92);
 const [savedPresets,setSavedPresets]=useState<{name:string;width:number;height:number;frameRate:number;bitrate:number;format:Format}[]>(()=>{try{const value=JSON.parse(localStorage.getItem('framework.export-presets.v1')??'[]');return Array.isArray(value)?value.slice(0,30):[]}catch{return []}});
 const [progress,setProgress]=useState(0),[status,setStatus]=useState<'ready'|'rendering'|'done'|'error'|'cancelled'>('ready'),[error,setError]=useState('');
 const render=useRef<ExportHandle|null>(null);
 const duration=projectEnd(p)*p.fps.den/p.fps.num;
 const isSequence=format==='png'||format==='jpeg'||format==='gif';const missing=p.clips.some(c=>c.mediaId&&!urls[c.mediaId]);
 const nativeMime=format==='mp4'?capabilities.mp4:format==='webm'?capabilities.webm:null;
 const unavailable=!isSequence&&!nativeMime;
 const estimatedMB=isSequence?null:Math.round((bitrate*1e6+(includeAudio?audioBitrate*1000:0))*duration/8/1048576);
 const preset=(w:number,h:number,fps:number,mbps:number,fmt:Format='webm')=>{setWidth(w);setHeight(h);setFrameRate(fps);setBitrate(mbps);setFormat(fmt)};
 const warnings:{type:'error'|'warn'|'info';message:string}[]=[];
 if(missing)warnings.push({type:'error',message:'Some media files are missing. Relink them in the Project panel.'});
 if(unavailable)warnings.push({type:'error',message:`${format.toUpperCase()} recording is not supported by your current browser. Choose an available format.`});
 if(width>3840||height>2160)warnings.push({type:'warn',message:'Above 4K: export may exceed your graphics hardware or browser memory limits.'});
 if((width>=3840||height>=2160)&&frameRate>=120)warnings.push({type:'warn',message:'4K at 120 FPS is extremely demanding and may exceed hardware capabilities.'});
 else if((width>=3840||height>=2160)&&frameRate>=60)warnings.push({type:'warn',message:'4K / 60 FPS may require substantial processing power, memory and export time.'});
 if(isSequence)warnings.push({type:'info',message:format==='gif'?'GIF has no audio, uses a 256-color palette and loops continuously. Frame timing is quantized to centiseconds.':'Image sequence export has no audio. Frames are rendered through the real compositor and packaged in a ZIP.'});
 if(isSequence&&(width*height>=1920*1080||frameRate>=60))warnings.push({type:'warn',message:format==='gif'?'High-resolution/high-FPS GIFs can be extremely large and expensive to encode. Try 480p at 15 FPS.':'High-resolution/high-FPS image sequences create very large ZIP files. Keep enough memory and disk space available.'});
 if(!isSequence&&frameRate!==p.fps.num/p.fps.den)warnings.push({type:'info',message:'Native MediaRecorder export is real-time, so exact output frame pacing depends on the browser; the timeline duration and composited frames remain unchanged.'});
 if((navigator as Navigator&{deviceMemory?:number}).deviceMemory&&((navigator as Navigator&{deviceMemory?:number}).deviceMemory??8)<=2&&(width>=1920||height>=1080))warnings.push({type:'warn',message:'Low device memory detected; choose 720p or smaller for reliability.'});
 const still=()=>{const canvas=document.querySelector<HTMLCanvasElement>('.viewer canvas');if(!canvas)return;canvas.toBlob(blob=>{if(blob)download(blob,`${p.name.replace(/[^a-zA-Z0-9-_ ]/g,'_')}-frame-${useEditor.getState().playhead}.png`)},'image/png')};
 useEffect(()=>()=>render.current?.cancel(),[]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&status!=='rendering'){e.preventDefault();close()}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[status,close]);
 const start=()=>{
  if(missing||unavailable||!p.clips.length)return;
  setStatus('rendering');setProgress(0);setError('');
  const handle=isSequence?exportImageSequence(p,urls,{mime:format==='gif'?'image/gif':format==='png'?'image/png':'image/jpeg',width,height,frameRate,quality},setProgress):exportVideo(p,urls,setProgress,{videoBitrate:bitrate*1_000_000,audioBitrate:audioBitrate*1000,width,height,frameRate,mime:nativeMime!,includeAudio});
  render.current=handle;
  void handle.finished.then(blob=>{if(blob){download(blob,`${p.name.replace(/[^a-zA-Z0-9-_ ]/g,'_')}.${format==='gif'?'gif':isSequence?'zip':format}`);setStatus('done')}else setStatus('cancelled')}).catch(e=>{setStatus('error');setError(e instanceof Error?e.message:String(e))});
 };
 const savePreset=()=>{const name=prompt('Export preset name','My Export Preset');if(!name?.trim())return;const updated=[...savedPresets,{name:name.trim().slice(0,60),width,height,frameRate,bitrate,format}];setSavedPresets(updated);localStorage.setItem('framework.export-presets.v1',JSON.stringify(updated))};
 return <div className="dialog-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&status!=='rendering')close()}}><div className="export-dialog professional-export" role="dialog" aria-modal="true" aria-label="Export composition">
 <div className="dialog-title"><div><Download size={18}/><strong>EXPORT COMPOSITION</strong></div><button disabled={status==='rendering'} title="Close" onClick={close}><X size={18}/></button></div>
 <div className="dialog-content"><div className="export-title">Real media rendering</div>
 <div className="export-presets"><button onClick={()=>preset(1920,1080,30,10)}>YouTube</button><button onClick={()=>preset(1080,1920,30,8)}>TikTok</button><button onClick={()=>preset(1080,1920,30,8)}>Reels</button><button onClick={()=>preset(p.width,p.height,p.fps.num/p.fps.den,25)}>Master</button><button onClick={()=>preset(854,480,24,2)}>Small file</button><button onClick={()=>preset(426,240,15,2,'gif')}>GIF Animation</button>{savedPresets.map((s,i)=><button key={i} onClick={()=>preset(s.width,s.height,s.frameRate,s.bitrate,s.format)}>{s.name}</button>)}<button title="Save current settings as a preset" onClick={savePreset}>+ Save preset</button></div>
 <div className="export-grid"><label>Container</label><select aria-label="Export format" value={format} onChange={e=>setFormat(e.target.value as Format)}>
 {capabilities.webm&&<option value="webm">WebM (native)</option>}{capabilities.mp4&&<option value="mp4">MP4 (native encoder)</option>}<option value="png">PNG sequence ZIP</option><option value="jpeg">JPEG sequence ZIP</option><option value="gif">GIF animation (256 colors, no audio)</option>
 </select><label>Resolution</label><select value={`${width}x${height}`} onChange={e=>{const [w,h]=e.target.value.split('x').map(Number);setWidth(w);setHeight(h)}}><option value={`${width}x${height}`}>Custom {width}×{height}</option>{[[256,144],[426,240],[640,360],[854,480],[1280,720],[1920,1080],[2560,1440],[3840,2160],[1080,1920],[1080,1080]].filter(([w,h])=>w!==width||h!==height).map(([w,h])=><option key={`${w}x${h}`} value={`${w}x${h}`}>{w}×{h}</option>)}</select>
 <label>Width (pixels)</label><input aria-label="Export width" type="number" min="64" max="7680" value={width} onChange={e=>setWidth(Math.max(64,Math.min(7680,Number(e.target.value)||64)))}/>
 <label>Height (pixels)</label><input aria-label="Export height" type="number" min="64" max="7680" value={height} onChange={e=>setHeight(Math.max(64,Math.min(7680,Number(e.target.value)||64)))}/>
 <label>Output FPS</label><select aria-label="Export frame rate" value={frameRate} onChange={e=>setFrameRate(Number(e.target.value))}><option value={p.fps.num/p.fps.den}>Project ({(p.fps.num/p.fps.den).toFixed(3)})</option>{[12,15,24,25,30,48,50,60,120].filter(n=>n!==p.fps.num/p.fps.den).map(n=><option key={n} value={n}>{n} FPS</option>)}</select>
 {!isSequence&&<><label>Video bitrate (Mbps)</label><input type="number" aria-label="Video bitrate Mbps" min=".5" max="80" step=".5" value={bitrate} onChange={e=>setBitrate(Math.max(.5,Math.min(80,Number(e.target.value)||.5)))}/><label>Audio bitrate (Kbps)</label><select value={audioBitrate} onChange={e=>setAudioBitrate(Number(e.target.value))}>{[96,128,192,256,320].map(n=><option key={n}>{n}</option>)}</select><label>Include audio</label><input type="checkbox" checked={includeAudio} onChange={e=>setIncludeAudio(e.target.checked)}/></>}
 {isSequence&&<><label>{format==='gif'?'GIF palette':'Image quality'}</label>{format==='gif'?<strong>256-color RGB332 (fixed)</strong>:<select value={quality} onChange={e=>setQuality(Number(e.target.value))}><option value={.65}>Low</option><option value={.8}>Medium</option><option value={.92}>High</option><option value={1}>Maximum</option></select>}</>}
 <label>Duration</label><strong>{duration.toFixed(2)} seconds</strong><label>Estimated video size</label><strong>{estimatedMB===null?'Depends on frame complexity':`~${estimatedMB} MB (estimate)`}</strong>
 </div>
 <div className="export-warnings">{warnings.map((w,i)=><p key={i} className={`export-notice ${w.type}`} role={w.type==='error'?'alert':'status'}>{w.type==='error'?'✕':w.type==='warn'?'⚠':'ℹ'} {w.message}</p>)}</div>
 <div className="export-info"><strong>Available output paths</strong><span>WebM and MP4 use genuine browser MediaRecorder codecs where available. GIF, PNG and JPEG render actual timeline frames (PNG/JPEG as ZIPs). GIF uses a 256-color palette with no audio. MOV, AVI, MKV, WAV and MP3 are not currently available. Native real-time video recording is not guaranteed frame-exact.</span></div>
 {status==='rendering'&&<div className="export-progress"><div className="progress-header"><span>{isSequence?'Rendering individual frames…':'Recording composition in real time…'}</span><strong>{Math.round(progress*100)}%</strong></div><div className="progress-track"><span style={{width:`${progress*100}%`}}/></div></div>}
 {status==='done'&&<div className="success-banner">Render completed and download started.</div>}
 {status==='error'&&<div className="error-banner" role="alert">{error}</div>}
 {status==='cancelled'&&<div className="error-banner">Export cancelled.</div>}
 </div><div className="dialog-footer"><button className="secondary-btn" onClick={()=>status==='rendering'?render.current?.cancel():close()}>{status==='rendering'?'Cancel rendering':'Close'}</button><button className="secondary-btn" disabled={status==='rendering'} onClick={still}><ImageDown size={15}/> PNG still</button><button className="primary-btn" disabled={status==='rendering'||missing||unavailable||!p.clips.length} onClick={start}><Download size={15}/>{status==='rendering'?'Rendering…':`Export ${format==='gif'?'GIF':isSequence?'sequence':format.toUpperCase()}`}</button></div>
 </div></div>;
}
function App(){
 const project=useEditor(s=>s.project);
 const fileInput=useRef<HTMLInputElement>(null),projectInput=useRef<HTMLInputElement>(null),root=useRef<HTMLDivElement>(null);
 const [home,setHome]=useState(true);
 const tool=useEditor(s=>s.tool),selected=useEditor(s=>s.selected),history=useEditor(s=>s.history),future=useEditor(s=>s.future);
 const selectedClip=project.clips.find(c=>c.id===selected);const snapping=useEditor(s=>s.snapping),shapeChoice=useEditor(s=>s.shapeChoice);const [shapeOpen,setShapeOpen]=useState(false);
 const [attributeDialog,setAttributeDialog]=useState<'copy'|'paste'|null>(null);
 useEffect(()=>{const f=(ev:Event)=>setAttributeDialog((ev as CustomEvent<'copy'|'paste'>).detail);window.addEventListener('framework:attributes',f);return()=>window.removeEventListener('framework:attributes',f)},[]);
 const [showThemes,setShowThemes]=useState(false);const [shortcutsWindow,setShortcutsWindow]=useState<'palette'|'editor'|null>(null);
 useEffect(()=>{void initFonts().catch(e=>console.warn('Custom fonts could not be restored',e))},[]);
 useEffect(()=>{const portable=()=>{void saveProject(true)};window.addEventListener('framework:save-portable',portable);return()=>window.removeEventListener('framework:save-portable',portable)},[]);
 useEffect(()=>{const saved=loadThemes();applyTheme([...THEMES,...saved.custom].find(t=>t.id===saved.selected)??THEMES[0])},[]);
 const [showExport,setShowExport]=useState(false),[showHelp,setShowHelp]=useState(false),[timelineHeight,setTimelineHeight]=useState(()=>Number(localStorage.getItem('framework.timeline.height')??300));
 const [sideSizes,setSideSizes]=useState<[number,number]>(()=>{try{return JSON.parse(localStorage.getItem('framework.panels')??'[270,300]')}catch{return [270,300]}});
 const [notice,setNotice]=useState('');
 const leftTab=useEditor(s=>s.tab);
 const [workspace,setWorkspace]=useState<WorkspaceName>(()=>{try{const x=localStorage.getItem('framework.workspace.active')??'Editing';return isWorkspace(x)?x:'Editing'}catch{return 'Editing'}});
 const activateWorkspace=(name:WorkspaceName)=>{
  // Keep user-edited geometry when switching back to a previously saved layout.
  const old=workspace;
  try{const layouts=JSON.parse(localStorage.getItem('framework.workspace.layouts')??'{}');layouts[old]={left:sideSizes[0],right:sideSizes[1],timeline:timelineHeight};localStorage.setItem('framework.workspace.layouts',JSON.stringify(layouts));
   const config=layouts[name]??WORKSPACES[name];setSideSizes([config.left,config.right]);setTimelineHeight(config.timeline);
   localStorage.setItem('framework.workspace.active',name);
  }catch{const config=WORKSPACES[name];setSideSizes([config.left,config.right]);setTimelineHeight(config.timeline)}
  setWorkspace(name);useEditor.getState().setTab(WORKSPACES[name].tab);
  if(name==='Export'){useEditor.getState().setPlaying(false);setShowExport(true)}
 };
 const saveWorkspace=()=>{try{const layouts=JSON.parse(localStorage.getItem('framework.workspace.layouts')??'{}');layouts[workspace]={left:sideSizes[0],right:sideSizes[1],timeline:timelineHeight};localStorage.setItem('framework.workspace.layouts',JSON.stringify(layouts))}catch{}};
 const resetActiveWorkspace=()=>{const config=WORKSPACES[workspace];setSideSizes([config.left,config.right]);setTimelineHeight(config.timeline);try{const layouts=JSON.parse(localStorage.getItem('framework.workspace.layouts')??'{}');delete layouts[workspace];localStorage.setItem('framework.workspace.layouts',JSON.stringify(layouts))}catch{}};
 useEffect(()=>{if(workspace==='Editing')return;
  try{const saved=JSON.parse(localStorage.getItem('framework.workspace.layouts')??'{}');const config=saved[workspace]??WORKSPACES[workspace];setSideSizes([config.left,config.right]);setTimelineHeight(config.timeline)}catch{}
  useEditor.getState().setTab(WORKSPACES[workspace].tab);
 },[]);
 const [mobileTab,setMobileTab]=useState<'preview'|'media'|'inspector'>('preview');
 useEffect(()=>{if(leftTab!=='project')setMobileTab('media')},[leftTab]);
 useEffect(()=>{const listener=(e:Event)=>setMobileTab((e as CustomEvent<'preview'|'media'|'inspector'>).detail);window.addEventListener('framework:mobile-panel',listener);return()=>window.removeEventListener('framework:mobile-panel',listener)},[]);
 useEffect(()=>{if(listProjects().length===0&&project.clips.length>0)persistProject(project)},[]);
 useEffect(()=>{const create=()=>{if(!threeSupported()){setNotice('3D needs WebGL support. Try Chrome/Edge with hardware acceleration enabled.');return}const p=useEditor.getState().project,t=p.tracks.find(t=>t.kind==='video'&&!t.locked);if(!t)return;const c=makeClip('3d',t.id,useEditor.getState().playhead,'3D Object');c.color='#e6a14a';useEditor.getState().addClip(c)};window.addEventListener('framework:create-3d',create);return()=>window.removeEventListener('framework:create-3d',create)},[]);
 const clearNotice=()=>{if(notice)setNotice('')};
 const runCommand=(id:string)=>{
  const st=useEditor.getState(),c=st.project.clips.find(c=>c.id===st.selected);
  const addKey=(remove=false)=>{if(!c)return;const at=Math.max(0,st.playhead-c.start);const keys=c.keyframes.x??[];st.updateClip(c.id,{keyframes:{...c.keyframes,x:remove?keys.filter(k=>k.frame!==at):[...keys.filter(k=>k.frame!==at),{frame:at,value:c.transform.x,ease:c.smoothEasing===false?'linear':'easeInOut',autoEase:true}].sort((a,b)=>a.frame-b.frame)}})};
  const seekClip=(direction:-1|1)=>{const frames=[...new Set(st.project.clips.map(c=>c.start))].sort((a,b)=>a-b);const pos=direction<0?[...frames].reverse().find(f=>f<st.playhead):frames.find(f=>f>st.playhead);if(pos!==undefined){st.setPlaying(false);st.setPlayhead(pos)}};
  const seekKey=(direction:-1|1)=>{if(!c)return;const f=nearestKeyframe(c,undefined,st.playhead,direction);if(f!==null){st.setPlaying(false);st.setPlayhead(f)}};
  if(id.startsWith('effect:')){if(c&&c.kind!=='audio')st.updateClip(c.id,addEffect(c,id.slice(7) as Clip['effects'][number]['type']));return}
  switch(id){
   case 'play':window.dispatchEvent(new Event('framework:unlock-audio'));if(!st.playing&&st.playhead>=projectEnd(st.project))st.setPlayhead(0);st.setPlaying(!st.playing);break;
   case 'stop':st.setPlaying(false);break;
   case 'stepBack':case 'stepNext':case 'back10':case 'next10':st.setPlaying(false);st.setPlayhead(st.playhead+(id==='stepBack'?-1:id==='stepNext'?1:id==='back10'?-10:10));break;
   case 'start':st.setPlaying(false);st.setPlayhead(0);break;case 'end':st.setPlaying(false);st.setPlayhead(projectEnd(st.project));break;
   case 'prevClip':seekClip(-1);break;case 'nextClip':seekClip(1);break;case 'prevKey':seekKey(-1);break;case 'nextKey':seekKey(1);break;
   case 'addKey':addKey();break;case 'removeKey':addKey(true);break;
   case 'easyEase':if(c)st.updateClip(c.id,{keyframes:Object.fromEntries(Object.entries(c.keyframes).map(([prop,keys])=>[prop,keys?.map(k=>({...k,ease:'easeInOut',manualEase:true,autoEase:false}))]))});break;
   case 'toggleEase':if(c)st.updateClip(c.id,{smoothEasing:c.smoothEasing===false});break;
   case 'undo':st.undo();break;case 'redo':st.redo();break;case 'copy':st.copy();break;case 'paste':st.paste();break;case 'cut':st.copy();if(st.selected)st.removeClip(st.selected);break;
   case 'duplicate':st.duplicate();break;case 'delete':if(st.selected)st.removeClip(st.selected);break;case 'split':st.split();break;
   case 'copyAttributes':setAttributeDialog('copy');break;case 'pasteAttributes':setAttributeDialog('paste');break;
   case 'snapping':st.setSnapping(!st.snapping);break;case 'loop':st.setLoopPlayback(!st.loopPlayback);break;
   case 'marker':st.edit(pr=>({...pr,markers:[...(pr.markers??[]),{id:crypto.randomUUID(),frame:st.playhead,label:'Marker'}]}));break;
   case 'zoomIn':st.setZoom(st.zoom*1.25);break;case 'zoomOut':st.setZoom(st.zoom/1.25);break;
   case 'toolSelect':st.setTool('select');break;case 'toolRazor':st.setTool('razor');break;case 'toolScale':st.setTool('scale');break;case 'toolRotate':st.setTool('rotate');break;case 'toolMask':st.setTool('mask');break;
   case 'save':void saveProject();break;case 'import':fileInput.current?.click();break;case 'export':setShowExport(true);break;
   case 'palette':setShortcutsWindow('palette');break;case 'shortcuts':setShortcutsWindow('editor');break;
   case 'effects':st.setTab('effects');break;case 'library':st.setTab('project');break;
  }
 };
 useEffect(()=>{
  let keys=loadBindings();const reload=()=>{keys=loadBindings()};window.addEventListener('framework:shortcuts-updated',reload);
  const listener=(ev:KeyboardEvent)=>{if(document.querySelector('.shortcut-overlay'))return;const id=commandFor(ev,keys);if(id){ev.preventDefault();runCommand(id)}};
  window.addEventListener('keydown',listener);return()=>{window.removeEventListener('keydown',listener);window.removeEventListener('framework:shortcuts-updated',reload)};
 },[]);
 const saveProject=async(embed=false)=>{const p=useEditor.getState().project;const portable=embed?await portableFonts(p):[];const output=portable.length?{...p,portableFonts:portable}:p;download(new Blob([JSON.stringify(output,null,2)],{type:'application/json'}),`${p.name.replace(/[^a-zA-Z0-9-_ ]/g,'_')}.framework`)};
 const loadProject=async(file:File)=>{try{const raw=JSON.parse(await file.text());if(Array.isArray(raw.portableFonts))await restorePortableFonts(raw.portableFonts);delete raw.portableFonts;const data=validateProject(raw);useEditor.getState().setProject(data);void ensureProjectFonts(data).catch(e=>setNotice(String(e)));setNotice('Project loaded. Locally stored media is restored where available. Missing fonts or media require relinking.');}catch(e){setNotice(e instanceof Error?e.message:'Invalid project file')}};
 const addGenerated=(kind:'text'|'shape'|'solid')=>{
  const p=useEditor.getState().project,track=p.tracks.find(t=>t.kind==='video'&&!t.locked);if(!track)return;
  const c=makeClip(kind,track.id,useEditor.getState().playhead,kind==='text'?'Title':kind==='shape'?'Shape':'Solid');
  if(kind==='shape')c.color='#8d85ff';if(kind==='solid')c.color='#28283c';useEditor.getState().addClip(c);
 };
 const beginDivider=(e:React.PointerEvent,kind:'timeline'|'left'|'right')=>{
  e.preventDefault();const first=e.clientX,firstY=e.clientY;const old=sideSizes,initial=timelineHeight;
  const move=(ev:PointerEvent)=>{
   if(kind==='timeline'){const v=Math.max(180,Math.min(window.innerHeight-240,initial+firstY-ev.clientY));setTimelineHeight(v);localStorage.setItem('framework.timeline.height',String(v))}
   else{const value=Math.max(210,Math.min(500,(kind==='left'?old[0]:old[1])+(kind==='left'?1:-1)*(ev.clientX-first)));const s:[number,number]=kind==='left'?[value,old[1]]:[old[0],value];setSideSizes(s);localStorage.setItem('framework.panels',JSON.stringify(s))}
  };
  const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up)};
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);
 };
 return home?<><Home enter={()=>setHome(false)}/><GlobalContextMenu/></>:<div className="app-shell" data-mobile-panel={mobileTab} ref={root} style={{'--left-w':`${sideSizes[0]}px`,'--right-w':`${sideSizes[1]}px`,'--timeline-h':`${timelineHeight}px`} as React.CSSProperties} onClick={clearNotice}>
  <DesktopMenus workspace={workspace} onWorkspace={activateWorkspace} saveWorkspace={saveWorkspace} showThemes={()=>setShowThemes(true)} showShortcuts={()=>setShortcutsWindow('editor')} showPalette={()=>setShortcutsWindow('palette')} save={()=>{void saveProject()}} open={()=>projectInput.current?.click()} openMedia={()=>fileInput.current?.click()} showExport={()=>setShowExport(true)} showHelp={()=>setShowHelp(true)} home={()=>{useEditor.getState().setPlaying(false);setHome(true)}} addGenerated={addGenerated} resetWorkspace={resetActiveWorkspace}/>
  <header className="app-header"><div className="brand"><BrandMark/><div className="brand-text"><strong>FRAMEWORK</strong><span>STUDIO <i> / </i> 2.7</span></div></div>
  <div className="header-separator"/><div className="toolbar-group"><button title="New project" onClick={()=>{setHome(true)}}><FilePlus2 size={16}/> New</button><button title="Open .framework project" onClick={()=>projectInput.current?.click()}><FolderOpen size={16}/> Open</button><button title="Save .framework project" onClick={()=>{void saveProject()}}><Save size={16}/> Save</button></div>
  <div className="header-separator"/><div className="toolbar-group"><button title="Import video, image, GIF or audio" onClick={()=>fileInput.current?.click()}><Upload size={16}/> Import</button><button title="Add editable title at playhead" onClick={()=>addGenerated('text')}><Type size={17}/> Text</button><div className="shape-popup-anchor"><button title="Add shape at playhead; right-click to choose a drawing tool" className={tool==='shape'?'active':''} onClick={()=>addGenerated('shape')} onContextMenu={e=>{e.preventDefault();setShapeOpen(true)}}><Shapes size={17}/> Shape ▾</button>{shapeOpen&&<div className="shape-popup" role="menu" aria-label="Shapes tool menu">{shapeNames.map(type=><button key={type} role="menuitem" title={`Draw ${shapeLabels[type]} in composition viewer`} onClick={()=>{useEditor.getState().setShapeChoice(type);setShapeOpen(false)}}>{shapeChoice===type?'●':'○'} {shapeLabels[type]}</button>)}</div>}</div><button title="Add solid layer at playhead" onClick={()=>addGenerated('solid')}><Square size={15}/> Solid</button></div>
  <div className="toolstrip" aria-label="Editor tools"><button title="Magnetic timeline snapping (Alt to bypass)" className={snapping?'active':''} aria-pressed={snapping} onClick={()=>useEditor.getState().setSnapping(!snapping)}><Magnet size={16}/></button>
   {([{id:'select',label:'Select / Move (V)',Icon:MousePointer2},{id:'scale',label:'Scale',Icon:Maximize2},{id:'rotate',label:'Rotate',Icon:RotateCw},{id:'razor',label:'Razor (C)',Icon:Scissors},{id:'mask',label:'Draw polygon mask (click to add points)',Icon:PenTool},{id:'eyedropper',label:'Chroma Key eyedropper',Icon:Pipette}] as const).map(({id,label,Icon})=><button key={id} className={tool===id?'active':''} title={label} onClick={()=>useEditor.getState().setTool(id)}><Icon size={16}/></button>)}
   <span className="toolbar-divider"/>
   <button title="Chroma Key selected layer" disabled={!selectedClip||(selectedClip.kind!=='video'&&selectedClip.kind!=='image')} onClick={()=>{const s=useEditor.getState(),c=s.project.clips.find(c=>c.id===s.selected);if(c&&(c.kind==='video'||c.kind==='image'))s.updateClip(c.id,addEffect(c,'chroma'))}}><Blend size={16}/></button>
   <button title="Invert colors selected layer" disabled={!selectedClip||selectedClip.kind==='audio'} onClick={()=>{const s=useEditor.getState(),c=s.project.clips.find(c=>c.id===s.selected);if(c)s.updateClip(c.id,addEffect(c,'invert'))}}><Sparkles size={16}/></button>
   <button title="Reverse selected video" disabled={selectedClip?.kind!=='video'} onClick={()=>{const s=useEditor.getState(),c=s.project.clips.find(c=>c.id===s.selected);if(c?.kind==='video')s.updateClip(c.id,{reverse:!c.reverse})}}><FlipHorizontal2 size={16}/></button>
   <button title="Editable motion presets" onClick={()=>useEditor.getState().setTab('motions')}><WandSparkles size={16}/></button>
   <button title="Undo (Ctrl+Z)" disabled={!history.length} onClick={()=>useEditor.getState().undo()}><Undo2 size={15}/></button><button title="Redo (Ctrl+Shift+Z)" disabled={!future.length} onClick={()=>useEditor.getState().redo()}><Redo2 size={15}/></button>
  </div>
  <div className="header-spacer"/><div className="autosave-state"><span className="dot green"/> Saved locally</div><button className="top-help" title="Keyboard shortcuts and features" onClick={()=>setShowHelp(true)}><HelpCircle size={17}/></button><button className="export-top" onClick={()=>{useEditor.getState().setPlaying(false);setShowExport(true)}}><Download size={16}/> Export</button>
  <input hidden type="file" ref={fileInput} multiple accept="video/*,audio/*,image/*" onChange={async e=>{if(e.target.files){const r=await importFiles(e.target.files);const errors=r.filter(x=>!x.ok);if(errors.length)setNotice(errors.map(x=>`${x.name}: ${x.reason}`).join(' · '))}e.target.value=''}}/>
  <input hidden type="file" ref={projectInput} accept=".framework,application/json" onChange={e=>{if(e.target.files?.[0])void loadProject(e.target.files[0]);e.target.value=''}}/>
  </header>
  <div className="workspace">
   <MediaPanel/><div className="vertical-divider" onPointerDown={e=>beginDivider(e,'left')} title="Drag to resize Project panel"/>
   <Viewer/><div className="vertical-divider" onPointerDown={e=>beginDivider(e,'right')} title="Drag to resize Inspector panel"/>
   <Inspector/>
  </div>
  <div className="horizontal-divider" onPointerDown={e=>beginDivider(e,'timeline')} title="Drag to resize Timeline"/>
  <Timeline/>
  <nav className="mobile-navigation" aria-label="Mobile workspace navigation">
   <button className={mobileTab==='media'?'active':''} onClick={()=>setMobileTab('media')}><PanelLeft size={19}/> <span>Library / FX</span></button>
   <button className={mobileTab==='preview'?'active':''} onClick={()=>setMobileTab('preview')}><Clapperboard size={19}/> <span>Preview</span></button>
   <button className={mobileTab==='inspector'?'active':''} onClick={()=>setMobileTab('inspector')}><SlidersHorizontal size={19}/> <span>Properties</span></button>
   <button onClick={()=>{setMobileTab('preview');useEditor.getState().setTool('select')}}><Film size={19}/> <span>Select</span></button>
   <button onClick={()=>{useEditor.getState().setPlaying(false);setShowExport(true)}}><Download size={19}/> <span>Export</span></button>
  </nav>
  <footer className="status-bar"><span><span className="dot green"/> LOCAL EDITING ENGINE</span><span>{project.clips.length} clips · {project.tracks.length} tracks · {project.assets.length} assets</span><span className="footer-right"><Video size={13}/> {project.width}×{project.height}<span className="status-divider"/><AudioLines size={13}/> Web Audio <span className="status-divider"/><Layers3 size={13}/> Canvas Compositor</span></footer>
  <GlobalContextMenu/>
  {attributeDialog&&<AttributeDialog mode={attributeDialog} close={()=>setAttributeDialog(null)}/>}
  {shortcutsWindow&&<ShortcutWorkspace mode={shortcutsWindow} close={()=>setShortcutsWindow(null)} run={runCommand}/>}
  {notice&&<div className="toast" onClick={e=>e.stopPropagation()}>{notice}<button onClick={()=>setNotice('')}><X size={14}/></button></div>}
  {showThemes&&<ThemeManager close={()=>setShowThemes(false)}/>}
  {showExport&&<ExportDialog close={()=>setShowExport(false)}/>}
  {showHelp&&<div className="dialog-backdrop" onClick={()=>setShowHelp(false)}><div className="help-dialog" onClick={e=>e.stopPropagation()}><div className="dialog-title"><div><Settings2 size={18}/> SHORTCUTS & WORKFLOW</div><button onClick={()=>setShowHelp(false)}><X size={18}/></button></div><div className="help-content"><h3>Quick start</h3><p>Import media, then drag it from Project onto a matching video or audio timeline track. Scrub the ruler, trim clips by dragging their ends, and drag the body to reposition. Select a clip to edit its properties, create keyframes using diamonds, or add effects.</p><div className="shortcuts">{[['Space','Play / pause'],['Ctrl + Shift + D','Split selected clip at playhead'],['V','Selection tool'],['C','Razor tool'],['F9','Easy Ease on keyframes'],['Ctrl + S','Download .framework project'],['Ctrl + Z','Undo'],['Ctrl + Shift + Z','Redo'],['Ctrl + D','Duplicate clip'],['Ctrl + C / V','Copy / paste clip'],['Delete','Remove clip'],['← / →','Step 1 frame'],['Shift + ← / →','Step 10 frames'],['Ctrl + wheel (timeline)','Zoom timeline'],['Ctrl + wheel (preview)','Zoom preview'],['Alt + drag clip','Temporarily disable snapping'],['Middle-drag (preview)','Pan viewport']].map(([a,b])=><div key={a}><kbd>{a}</kbd><span>{b}</span></div>)}</div><p className="hint">Projects autosave locally. .framework files contain project metadata; media files are stored separately in your browser's IndexedDB. Relink media when moving projects to another computer.</p></div><div className="dialog-footer"><button className="primary-btn" onClick={()=>setShowHelp(false)}>Close</button></div></div></div>}
 </div>;
}
export default App;
