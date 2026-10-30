import {useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,Fullscreen,Grid3X3,Pause,Play,Scan,Move,RotateCw,Maximize2,ZoomIn,ZoomOut,Minimize2} from 'lucide-react';
import {createShapeGeometry} from '../engine/shapes';
import {makeClip} from '../types';
import {useEditor} from '../store';
import {Clip,formatTimecode,projectEnd} from '../types';
import {PlaybackEngine} from '../engine/playback';
import {isActive,valueAt} from '../engine/timeline';
import {layerSize} from '../engine/compositor';
import {maskPointsAt,setMaskAt} from '../engine/masks';
import {ContextMenu,ContextAction} from './ContextMenu';
function editedTransform(before:Clip,prop:'x'|'y'|'rotation'|'scale',value:number,frame:number):Partial<Clip>{
 const local=frame-before.start;
 if(before.keyframes[prop]?.length){const keys=[...before.keyframes[prop]!];const ix=keys.findIndex(k=>k.frame===local);if(ix>=0)keys[ix]={...keys[ix],value};else keys.push({frame:local,value,ease:before.smoothEasing===false?'linear':'easeInOut',autoEase:true});return {keyframes:{...before.keyframes,[prop]:keys.sort((a,b)=>a.frame-b.frame)}}}
 return {transform:{...before.transform,[prop]:value}};
}
export function Viewer(){
 const canvas=useRef<HTMLCanvasElement>(null),stage=useRef<HTMLDivElement>(null),viewerRoot=useRef<HTMLElement>(null),engine=useRef<PlaybackEngine|null>(null);
 const bezierPoints=useRef<[number,number][]>([]);const pinch=useRef<{distance:number;zoom:number}|null>(null);
 const loopPlayback=useEditor(s=>s.loopPlayback);const shapeChoice=useEditor(s=>s.shapeChoice);const project=useEditor(s=>s.project),urls=useEditor(s=>s.mediaUrls),playhead=useEditor(s=>s.playhead),playing=useEditor(s=>s.playing),selected=useEditor(s=>s.selected),tool=useEditor(s=>s.tool);
 const [fitSize,setFitSize]=useState({width:640,height:360});
 const [viewerZoom,setViewerZoom]=useState<number|null>(null),[fullscreen,setFullscreen]=useState(false);
 const [shapeDraft,setShapeDraft]=useState<{x:number;y:number;w:number;h:number}|null>(null);
 const [bezierDraft,setBezierDraft]=useState<[number,number][]>([]);
 const [guides,setGuides]=useState(false),[grid,setGrid]=useState(false),[layerControls,setLayerControls]=useState(true),[rulers,setRulers]=useState(false),[motionPaths,setMotionPaths]=useState(false),[showMasks,setShowMasks]=useState(true),[menu,setMenu]=useState<{x:number;y:number;id:string}|null>(null);
 useEffect(()=>{if(!stage.current)return;const element=stage.current;const refresh=()=>{const w=Math.max(16,element.clientWidth-38),h=Math.max(16,element.clientHeight-38);const scale=Math.min(w/project.width,h/project.height);setFitSize({width:project.width*scale,height:project.height*scale})};const obs=new ResizeObserver(refresh);obs.observe(element);refresh();return()=>obs.disconnect()},[project.width,project.height]);
 useEffect(()=>{if(!canvas.current)return;const inst=new PlaybackEngine(canvas.current,useEditor.getState().project,useEditor.getState().mediaUrls);engine.current=inst;return()=>{inst.dispose();engine.current=null}},[]);
 useEffect(()=>{engine.current?.update(project,urls)},[project,urls]);
 useEffect(()=>{engine.current?.setLoop(loopPlayback)},[loopPlayback]);
 useEffect(()=>{if(!playing)engine.current?.seek(playhead)},[playhead,playing]);
 useEffect(()=>{const redraw=()=>{const st=useEditor.getState();engine.current?.seek(st.playhead)};window.addEventListener('framework:3d-ready',redraw);window.addEventListener('framework:fonts-changed',redraw);return()=>{window.removeEventListener('framework:3d-ready',redraw);window.removeEventListener('framework:fonts-changed',redraw)}},[]);
 useEffect(()=>{if(playing){void engine.current?.play(useEditor.getState().playhead,f=>useEditor.getState().setPlayhead(f),()=>useEditor.getState().setPlaying(false))}else engine.current?.pause();return()=>engine.current?.pause()},[playing]);
 useEffect(()=>{const unlock=()=>{void engine.current?.unlock()};window.addEventListener('framework:unlock-audio',unlock);return()=>window.removeEventListener('framework:unlock-audio',unlock)},[]);
 useEffect(()=>{const onChange=()=>setFullscreen(document.fullscreenElement===viewerRoot.current);document.addEventListener('fullscreenchange',onChange);return()=>document.removeEventListener('fullscreenchange',onChange)},[]);
 useEffect(()=>{const event=(e:Event)=>{const command=(e as CustomEvent<string>).detail;
  if(command==='grid')setGrid(v=>!v);
  if(command==='guides')setGuides(v=>!v);
  if(command==='controls')setLayerControls(v=>!v);
  if(command==='rulers')setRulers(v=>!v);
  if(command==='motionPaths')setMotionPaths(v=>!v);
  if(command==='masks')setShowMasks(v=>!v);
  if(command==='fit')setViewerZoom(null);
  if(command==='actual')setViewerZoom(1);
  if(command==='fullscreen'){if(document.fullscreenElement===viewerRoot.current)void document.exitFullscreen();else void viewerRoot.current?.requestFullscreen()}
 };
 window.addEventListener('framework:viewer',event);return()=>window.removeEventListener('framework:viewer',event)},[]);
 useEffect(()=>{const element=stage.current;if(!element)return;
  const onStart=(e:TouchEvent)=>{if(e.touches.length===2){const a=e.touches[0],b=e.touches[1];pinch.current={distance:Math.max(1,Math.hypot(b.clientX-a.clientX,b.clientY-a.clientY)),zoom:viewerZoom??fitSize.width/project.width}}};
  const onMove=(e:TouchEvent)=>{if(e.touches.length!==2||!pinch.current)return;e.preventDefault();const a=e.touches[0],b=e.touches[1],distance=Math.hypot(b.clientX-a.clientX,b.clientY-a.clientY);
   setZoomAt(pinch.current.zoom*distance/pinch.current.distance,(a.clientX+b.clientX)/2,(a.clientY+b.clientY)/2)};
  const onEnd=(e:TouchEvent)=>{if(e.touches.length<2)pinch.current=null};
  element.addEventListener('touchstart',onStart,{passive:true});element.addEventListener('touchmove',onMove,{passive:false});element.addEventListener('touchend',onEnd);element.addEventListener('touchcancel',onEnd);
  return()=>{element.removeEventListener('touchstart',onStart);element.removeEventListener('touchmove',onMove);element.removeEventListener('touchend',onEnd);element.removeEventListener('touchcancel',onEnd)};
 },[viewerZoom,fitSize.width,project.width]);
 const viewScale=viewerZoom??fitSize.width/project.width;
 function setZoomAt(next:number,clientX?:number,clientY?:number){
  const el=stage.current,cv=canvas.current;
  if(!el||!cv)return;
  const bound=cv.getBoundingClientRect(),stageBox=el.getBoundingClientRect();
  const x=clientX??stageBox.left+stageBox.width/2,y=clientY??stageBox.top+stageBox.height/2;
  const fractionX=(x-bound.left)/Math.max(1,bound.width),fractionY=(y-bound.top)/Math.max(1,bound.height);
  const nextZoom=Math.max(.05,Math.min(8,next));setViewerZoom(nextZoom);
  requestAnimationFrame(()=>{
   const target=cv.getBoundingClientRect();
   if(stage.current){stage.current.scrollLeft+=target.left+fractionX*target.width-x;stage.current.scrollTop+=target.top+fractionY*target.height-y}
  });
 }
 useEffect(()=>{const el=stage.current;if(!el)return;
  const wheel=(ev:WheelEvent)=>{if(ev.ctrlKey){ev.preventDefault();setZoomAt(viewScale*Math.exp(-.0025*ev.deltaY),ev.clientX,ev.clientY)}};
  el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel);
 },[viewScale]);
 function panStage(e:React.PointerEvent){if(e.button!==1)return;e.preventDefault();const element=stage.current;if(!element)return;const startX=e.clientX,startY=e.clientY,oldX=element.scrollLeft,oldY=element.scrollTop;
  const move=(ev:PointerEvent)=>{element.scrollLeft=oldX+startX-ev.clientX;element.scrollTop=oldY+startY-ev.clientY};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up)};
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);
 }
 function viewerPoint(e:{clientX:number;clientY:number}):[number,number]{const r=canvas.current!.getBoundingClientRect();return [(e.clientX-r.left)*project.width/r.width,(e.clientY-r.top)*project.height/r.height]}
 function finishBezier(){const pts=bezierPoints.current.filter((point,i,arr)=>i===0||Math.hypot(point[0]-arr[i-1][0],point[1]-arr[i-1][1])>2);
  if(pts.length>=2)createShape('bezier',pts);bezierPoints.current=[];setBezierDraft([]);useEditor.getState().setTool('select')}
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(useEditor.getState().tool!=='shape'||useEditor.getState().shapeChoice!=='bezier')return;
  if(e.key==='Enter'){e.preventDefault();finishBezier()}else if(e.key==='Escape'){bezierPoints.current=[];setBezierDraft([]);useEditor.getState().setTool('select')}};
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
 },[project,shapeChoice]);
 function createShape(type:NonNullable<Clip['shape']>,points:[number,number][],bounds?:{x:number;y:number;width:number;height:number}){
  const pr=useEditor.getState().project,track=pr.tracks.find(t=>t.kind==='video'&&!t.locked);if(!track)return;
  const box=bounds??createShapeGeometry(points);
  const c=makeClip('shape',track.id,playhead,type);
  c.shape=type;c.color='#e6a14a';c.shapeWidth=Math.max(2,box.width);c.shapeHeight=Math.max(2,box.height);
  c.transform.x=box.x-pr.width/2;c.transform.y=box.y-pr.height/2;
  if(type==='line'||type==='bezier'){c.strokeWidth=4;c.strokeColor='#e6a14a';}
  if(type==='bezier')c.shapePoints=createShapeGeometry(points).normalized;
  useEditor.getState().addClip(c);
 }
 function beginShapeDraw(e:React.PointerEvent<SVGSVGElement>){if(e.button!==0)return;e.preventDefault();e.stopPropagation();
  const point=viewerPoint(e);const type=useEditor.getState().shapeChoice;
  if(type==='bezier'){bezierPoints.current.push(point);setBezierDraft([...bezierPoints.current]);return;}
  let latest=point;const update=(ev:PointerEvent)=>{latest=viewerPoint(ev);let left=Math.min(point[0],latest[0]),top=Math.min(point[1],latest[1]),w=Math.abs(point[0]-latest[0]),h=Math.abs(point[1]-latest[1]);
   if(type==='circle'){const side=Math.max(w,h);w=side;h=side;if(latest[0]<point[0])left=point[0]-side;if(latest[1]<point[1])top=point[1]-side}
   setShapeDraft({x:left,y:top,w,h});};
  const up=()=>{window.removeEventListener('pointermove',update);window.removeEventListener('pointerup',up);
   let left=Math.min(point[0],latest[0]),top=Math.min(point[1],latest[1]),w=Math.abs(point[0]-latest[0]),h=Math.abs(point[1]-latest[1]);
   if(type==='circle'){const side=Math.max(w,h);w=side;h=side;if(latest[0]<point[0])left=point[0]-side;if(latest[1]<point[1])top=point[1]-side}
   setShapeDraft(null);if((type==='line'&&Math.max(w,h)>=3)||(w>=3&&h>=3)){createShape(type,[point,latest],{x:left+w/2,y:top+h/2,width:Math.max(2,w),height:Math.max(2,h)});useEditor.getState().setTool('select')}
  };
  window.addEventListener('pointermove',update);window.addEventListener('pointerup',up);
 }
 function toggleFullscreen(){if(document.fullscreenElement===viewerRoot.current)void document.exitFullscreen();else void viewerRoot.current?.requestFullscreen()}
 const play=()=>{void engine.current?.unlock();const s=useEditor.getState();if(!s.playing&&s.playhead>=projectEnd(s.project))s.setPlayhead(0);s.setPlaying(!s.playing)};
 const active=project.tracks.filter(t=>t.kind==='video'&&!t.hidden&&(!project.tracks.some(t=>t.kind==='video'&&t.solo)||t.solo)).flatMap(t=>project.clips.filter(c=>c.trackId===t.id&&c.kind!=='audio'&&c.kind!=='null'&&c.kind!=='adjustment'&&isActive(c,playhead))).reverse();
 const props=(c:Clip)=>{const s=layerSize(c,project,project.assets.find(a=>a.id===c.mediaId));return {w:s.width,h:s.height,x:project.width/2+valueAt(c,'x',playhead),y:project.height/2+valueAt(c,'y',playhead),scale:Math.max(.001,valueAt(c,'scale',playhead)),rotation:valueAt(c,'rotation',playhead)}};
 function toMaskPoint(ev:{clientX:number;clientY:number},el:SVGGraphicsElement,g:{w:number;h:number}):[number,number]{
  const matrix=el.getScreenCTM();if(!matrix)return [0,0];const local=new DOMPoint(ev.clientX,ev.clientY).matrixTransform(matrix.inverse());
  return [Number((local.x/(g.w/2)).toFixed(4)),Number((local.y/(g.h/2)).toFixed(4))];
 }
 function addMaskVertex(e:React.PointerEvent,id:string){
  e.preventDefault();e.stopPropagation();const c=useEditor.getState().project.clips.find(c=>c.id===id);if(!c)return;
  const element=e.currentTarget.parentNode as SVGGraphicsElement,g=props(c);
  const point=toMaskPoint(e,element,g);
  const points=[...(c.mask==='polygon'?maskPointsAt(c,playhead):[]),point];
  if(c.maskKeyframes?.length){
   const extended={...c,maskPoints:[...(c.maskPoints??[]),point] as [number,number][],maskKeyframes:c.maskKeyframes.map(k=>({...k,points:[...k.points,point]}))};
   useEditor.getState().updateClip(id,{...setMaskAt(extended,playhead,points),maskPoints:extended.maskPoints});
  }else useEditor.getState().updateClip(id,{mask:'polygon',maskPoints:points});
 }
 function dragMaskVertex(e:React.PointerEvent,id:string,index:number){
  e.stopPropagation();e.preventDefault();const c=useEditor.getState().project.clips.find(c=>c.id===id);if(!c||!maskPointsAt(c,playhead).length)return;
  if(e.altKey){if(maskPointsAt(c,playhead).length>3)useEditor.getState().updateClip(id,{maskPoints:(c.maskPoints??[]).filter((_,i)=>i!==index),maskKeyframes:c.maskKeyframes?.map(k=>({...k,points:k.points.filter((_,i)=>i!==index)}))});return}
  const before=structuredClone(useEditor.getState().project),g=props(c),el=e.currentTarget.parentNode as SVGGraphicsElement;
  const move=(ev:PointerEvent)=>{const point=toMaskPoint(ev,el,g);const current=useEditor.getState().project.clips.find(x=>x.id===id);if(!current)return;
   useEditor.getState().previewClip(id,setMaskAt(current,playhead,maskPointsAt(current,playhead).map((p,i)=>i===index?point:p)));
  };
  const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);useEditor.getState().finishPreview(before)};
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);
 }
 function pickChroma(e:React.PointerEvent,id:string){
  e.preventDefault();e.stopPropagation();const c=useEditor.getState().project.clips.find(c=>c.id===id);const layer=c?.effects.find(f=>f.type==='chroma');if(!c||!layer||!canvas.current)return;
  const r=canvas.current.getBoundingClientRect(),x=Math.max(0,Math.min(project.width-1,Math.floor((e.clientX-r.left)*project.width/r.width))),y=Math.max(0,Math.min(project.height-1,Math.floor((e.clientY-r.top)*project.height/r.height)));
  const pixels=canvas.current.getContext('2d')?.getImageData(x,y,1,1).data;if(!pixels)return;
  const hex='#'+Array.from(pixels.slice(0,3)).map(v=>v.toString(16).padStart(2,'0')).join('');
  useEditor.getState().updateClip(c.id,{effects:c.effects.map(f=>f.id===layer.id?{...f,keyColor:hex}:f)});useEditor.getState().setTool('select');
 }
 function interact(e:React.PointerEvent,id:string,mode:'move'|'scale'|'rotate'){
  if(e.button!==0)return;
  e.stopPropagation();e.preventDefault();const editor=useEditor.getState();if(e.ctrlKey||e.metaKey){editor.toggleSelected(id,true);return}editor.setPlaying(false);if(!editor.selectedIds.includes(id))editor.setSelected(id);
  const c=editor.project.clips.find(c=>c.id===id);if(!c||editor.project.tracks.find(t=>t.id===c.trackId)?.locked)return;
  const before=structuredClone(editor.project),startX=e.clientX,startY=e.clientY,rect=canvas.current!.getBoundingClientRect();
  const ratioX=project.width/rect.width,ratioY=project.height/rect.height;const g=props(c),startAngle=Math.atan2((startY-rect.top)*ratioY-g.y,(startX-rect.left)*ratioX-g.x);
  const centerDistance=Math.hypot((startX-rect.left)*ratioX-g.x,(startY-rect.top)*ratioY-g.y);
  const ids=useEditor.getState().selectedIds.filter(id=>before.clips.some(c=>c.id===id));
  const items=before.clips.filter(v=>ids.includes(v.id));
  const origin=items.reduce((acc,v)=>({x:acc.x+valueAt(v,'x',playhead)/items.length,y:acc.y+valueAt(v,'y',playhead)/items.length}),{x:0,y:0});
  const existing={x:valueAt(c,'x',playhead),y:valueAt(c,'y',playhead),scale:valueAt(c,'scale',playhead),rotation:valueAt(c,'rotation',playhead)};
  const move=(ev:PointerEvent)=>{
   const dx=(ev.clientX-startX)*ratioX,dy=(ev.clientY-startY)*ratioY;
   let updated=structuredClone(c);
   const change=(prop:'x'|'y'|'scale'|'rotation',value:number)=>updated={...updated,...editedTransform(updated,prop,value,playhead)};
   if(mode==='move'){
    let x=existing.x+dx,y=existing.y+dy;
    if(!ev.altKey){const snap=(n:number)=>Math.abs(n)<12?0:n;x=snap(x);y=snap(y);if(grid){x=Math.round(x/10)*10;y=Math.round(y/10)*10}}
    change('x',x);change('y',y);
   }else if(mode==='scale'){
    const d=Math.hypot((ev.clientX-rect.left)*ratioX-g.x,(ev.clientY-rect.top)*ratioY-g.y);
    change('scale',Math.max(.02,Math.min(20,existing.scale*(d/Math.max(1,centerDistance)))));
   }else{
    const a=Math.atan2((ev.clientY-rect.top)*ratioY-g.y,(ev.clientX-rect.left)*ratioX-g.x);
    const degrees=existing.rotation+(a-startAngle)*180/Math.PI;change('rotation',ev.shiftKey?Math.round(degrees/15)*15:degrees);
   }
   if(items.length>1){const patches:Record<string,Partial<Clip>>={};
    const factor=mode==='scale'?Math.max(.02,Math.min(20,(Math.hypot((ev.clientX-rect.left)*ratioX-g.x,(ev.clientY-rect.top)*ratioY-g.y)/Math.max(1,centerDistance)))):1;
    const radians=mode==='rotate'?((valueAt(updated,'rotation',playhead)-existing.rotation)*Math.PI/180):0;
    for(const member of items){const peer={...member,transform:{...member.transform},keyframes:{...member.keyframes}};
     if(mode==='move'){
      Object.assign(peer,editedTransform(peer,'x',valueAt(member,'x',playhead)+(valueAt(updated,'x',playhead)-existing.x),playhead));
      Object.assign(peer,editedTransform(peer,'y',valueAt(member,'y',playhead)+(valueAt(updated,'y',playhead)-existing.y),playhead));
     }else if(mode==='scale'){
      Object.assign(peer,editedTransform(peer,'scale',valueAt(member,'scale',playhead)*factor,playhead));
      Object.assign(peer,editedTransform(peer,'x',origin.x+(valueAt(member,'x',playhead)-origin.x)*factor,playhead));
      Object.assign(peer,editedTransform(peer,'y',origin.y+(valueAt(member,'y',playhead)-origin.y)*factor,playhead));
     }else{
      const x=valueAt(member,'x',playhead)-origin.x,y=valueAt(member,'y',playhead)-origin.y;
      Object.assign(peer,editedTransform(peer,'x',origin.x+x*Math.cos(radians)-y*Math.sin(radians),playhead));
      Object.assign(peer,editedTransform(peer,'y',origin.y+x*Math.sin(radians)+y*Math.cos(radians),playhead));
      Object.assign(peer,editedTransform(peer,'rotation',valueAt(member,'rotation',playhead)+radians*180/Math.PI,playhead));
     }
     patches[member.id]=peer;
    }
    useEditor.getState().previewClips(patches);
   }else useEditor.getState().previewClip(id,updated);
  };
  const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);useEditor.getState().finishPreview(before)};
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);
 }
 function longPressObject(e:React.PointerEvent,id:string){if(e.pointerType==='mouse')return;
  const x=e.clientX,y=e.clientY;let cancelled=false;
  const cleanup=()=>{cancelled=true;clearTimeout(timer);window.removeEventListener('pointermove',moved);window.removeEventListener('pointerup',cleanup);window.removeEventListener('pointercancel',cleanup)};
  const moved=(v:PointerEvent)=>{if(Math.hypot(v.clientX-x,v.clientY-y)>11)cleanup()};
  const timer=window.setTimeout(()=>{if(!cancelled){useEditor.getState().setSelected(id);setMenu({x,y,id});cleanup()}},570);
  window.addEventListener('pointermove',moved);window.addEventListener('pointerup',cleanup);window.addEventListener('pointercancel',cleanup);
 }
 const reset=(id:string)=>{const c=useEditor.getState().project.clips.find(c=>c.id===id);if(c)useEditor.getState().updateClip(id,{transform:{x:0,y:0,scale:1,rotation:0,opacity:1},keyframes:{...c.keyframes,x:[],y:[],scale:[],rotation:[]}})};
 const commands=(id:string):ContextAction[]=>[{label:'Copy    Ctrl+C',run:()=>useEditor.getState().copy()},{label:'Duplicate    Ctrl+D',run:()=>useEditor.getState().duplicate()},{label:'Delete',run:()=>useEditor.getState().removeClip(id),danger:true},{label:'Reset transform',run:()=>reset(id)},{label:'Center in composition',run:()=>{const c=useEditor.getState().project.clips.find(c=>c.id===id);if(c)useEditor.getState().updateClip(id,{transform:{...c.transform,x:0,y:0}})}},{label:'Rotate +90°',run:()=>{const c=useEditor.getState().project.clips.find(c=>c.id===id);if(c)useEditor.getState().updateClip(id,{transform:{...c.transform,rotation:c.transform.rotation+90}})}}];
 async function drop(e:React.DragEvent){e.preventDefault();const id=e.dataTransfer.getData('application/x-framework-asset');if(id)useEditor.getState().insertAsset(id,undefined,playhead)}
 return <section className="viewer pane" ref={viewerRoot}>
  <div className="panel-title"><span><span className="dot green"/> COMPOSITION <span className="composition-name">{project.name}</span></span><span className="small-dim">{project.width} × {project.height} · {(project.fps.num/project.fps.den).toFixed(2)} FPS</span></div>
  {selected&&active.some(c=>c.id===selected)&&<div className="contextual-edit-toolbar" role="toolbar" aria-label="Selected layer quick settings">{(()=>{const clip=active.find(c=>c.id===selected)!;
    const change=(patch:Partial<Clip>)=>useEditor.getState().updateClip(clip.id,patch);
    return <><strong title={clip.name}>{clip.name}</strong>
      {clip.kind==='text'&&<><label>Font <select aria-label="Font family" value={clip.fontFamily??'Arial'} onChange={e=>change({fontFamily:e.target.value})}>{['Arial','Georgia','Verdana','Impact','Courier New'].map(f=><option key={f}>{f}</option>)}</select></label><label>Size <input aria-label="Font size" type="number" min="8" max="1000" value={clip.fontSize??86} onChange={e=>change({fontSize:Math.max(8,Number(e.target.value))})}/></label></>}
      {(clip.kind==='shape'||clip.kind==='solid'||clip.kind==='text'||clip.kind==='3d')&&<label>Color <input aria-label="Layer fill color" type="color" value={clip.color??'#ffffff'} onChange={e=>change({color:e.target.value})}/></label>}
      {clip.kind==='shape'&&<label>Stroke <input aria-label="Stroke width" type="number" min="0" max="100" value={clip.strokeWidth??0} onChange={e=>change({strokeWidth:Math.max(0,Math.min(100,Number(e.target.value)))})}/></label>}
      {clip.kind==='video'&&<><button title="Reverse footage" className={clip.reverse?'active':''} onClick={()=>change({reverse:!clip.reverse})}>Reverse</button><label>Speed <input aria-label="Clip speed" type="number" min="0.1" max="8" step="0.1" value={clip.speed??1} onChange={e=>change({speed:Math.max(.1,Math.min(8,Number(e.target.value)))})}/></label></>}
      <button title="Reset position, scale and rotation" onClick={()=>reset(clip.id)}>Reset</button><button title="Open Effects Browser" onClick={()=>{useEditor.getState().setTab('effects');window.dispatchEvent(new CustomEvent('framework:mobile-panel',{detail:'media'}))}}>FX</button>
    </>})()}</div>}
  <div className={"viewer-stage"+(tool==='shape'?" draw-shape-cursor":"")} ref={stage} onPointerDown={panStage} onDragOver={e=>e.preventDefault()} onDrop={e=>void drop(e)}><div className="canvas-wrapper" style={{width:project.width*viewScale,height:project.height*viewScale,aspectRatio:`${project.width}/${project.height}`}}>
   <canvas ref={canvas} width={project.width} height={project.height} aria-label="Actual composition preview"/>
   <svg className="viewer-overlay" viewBox={`0 0 ${project.width} ${project.height}`} preserveAspectRatio="none" onPointerDownCapture={e=>{if(tool==='shape')beginShapeDraw(e)}} onDoubleClickCapture={e=>{if(tool==='shape'&&shapeChoice==='bezier'){e.preventDefault();e.stopPropagation();finishBezier()}}} onPointerDown={e=>{if(e.target===e.currentTarget)useEditor.getState().setSelected(null)}}>
    {shapeDraft&&<rect className="shape-draw-preview" x={shapeDraft.x} y={shapeDraft.y} width={shapeDraft.w} height={shapeDraft.h}/>}
    {bezierDraft.length>0&&<polyline points={bezierDraft.map(p=>p.join(',')).join(' ')} fill="none" stroke="#e6a14a" strokeWidth="3" strokeDasharray="6 4" pointerEvents="none"/>}
    {grid&&<defs><pattern id="viewer-grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" fill="none" stroke="#ffffff22" strokeWidth="1"/></pattern></defs>}
    {grid&&<rect width={project.width} height={project.height} fill="url(#viewer-grid)" pointerEvents="none"/>}
    {motionPaths&&selected&&(()=>{const clip=project.clips.find(c=>c.id===selected);if(!clip)return null;
      const times=[...new Set([...(clip.keyframes.x??[]).map(k=>k.frame),...(clip.keyframes.y??[]).map(k=>k.frame)])].sort((a,b)=>a-b);
      if(times.length<2)return null;
      const points=times.map(local=>[project.width/2+valueAt(clip,'x',clip.start+local),project.height/2+valueAt(clip,'y',clip.start+local)]);
      return <g className="viewer-motion-path" pointerEvents="none"><polyline points={points.map(pt=>pt.join(',')).join(' ')} fill="none" stroke="#e6a14a" strokeDasharray="8 5" strokeWidth="2"/>{points.map(([x,y],i)=><circle key={i} cx={x} cy={y} r="5" fill="#e6a14a" stroke="#141414" strokeWidth="1.4"/>)}</g>;
    })()}
    {layerControls&&active.map(c=>{const g=props(c);return <g key={c.id} transform={`translate(${g.x} ${g.y}) rotate(${g.rotation}) scale(${g.scale})`}><rect x={-g.w/2} y={-g.h/2} width={g.w} height={g.h} fill="transparent" stroke={selected===c.id?'#e6a14a':'transparent'} strokeWidth={2/g.scale} strokeDasharray={selected===c.id?`${8/g.scale} ${4/g.scale}`:'none'} onPointerDownCapture={e=>longPressObject(e,c.id)} onPointerDown={e=>tool==='mask'?addMaskVertex(e,c.id):tool==='eyedropper'?pickChroma(e,c.id):interact(e,c.id,tool==='rotate'?'rotate':tool==='scale'?'scale':'move')} onContextMenu={e=>{e.preventDefault();e.stopPropagation();useEditor.getState().setSelected(c.id);setMenu({x:e.clientX,y:e.clientY,id:c.id})}}/>
    {showMasks&&selected===c.id&&c.mask==='polygon'&&maskPointsAt(c,playhead).length>0&&<>
     <polygon points={maskPointsAt(c,playhead).map(([x,y])=>`${x*g.w/2},${y*g.h/2}`).join(' ')} fill="#e6a14a16" stroke="#e6a14a" strokeWidth={2/g.scale} strokeDasharray={`${4/g.scale} ${3/g.scale}`} pointerEvents="none"/>
     {maskPointsAt(c,playhead).map(([x,y],i)=><circle key={i} cx={x*g.w/2} cy={y*g.h/2} r={7/g.scale} fill="#e6a14a" stroke="#161718" strokeWidth={1.5/g.scale} style={{cursor:'grab'}} onPointerDown={e=>dragMaskVertex(e,c.id,i)}/>)}
    </>}
    {selected===c.id&&<><circle cx={0} cy={0} r={4/g.scale} fill="none" stroke="#e6a14a" strokeWidth={1.5/g.scale} pointerEvents="none"/><path d={`M ${-9/g.scale} 0 H ${9/g.scale} M 0 ${-9/g.scale} V ${9/g.scale}`} stroke="#e6a14a" strokeWidth={1/g.scale} pointerEvents="none"/>
    {[[-g.w/2,-g.h/2],[g.w/2,-g.h/2],[g.w/2,g.h/2],[-g.w/2,g.h/2]].map(([x,y],i)=><rect key={i} x={x-5/g.scale} y={y-5/g.scale} width={10/g.scale} height={10/g.scale} fill="#e9e9e9" stroke="#282828" strokeWidth={1/g.scale} className="viewer-resize" onPointerDown={e=>interact(e,c.id,'scale')}/>)}
    <line x1={0} y1={-g.h/2} x2={0} y2={-g.h/2-35/g.scale} stroke="#e6a14a" strokeWidth={1.5/g.scale} pointerEvents="none"/><circle cx="0" cy={-g.h/2-39/g.scale} r={7/g.scale} fill="#e6a14a" stroke="#17181a" strokeWidth={1/g.scale} className="viewer-rotate" onPointerDown={e=>interact(e,c.id,'rotate')}/></>}
    </g>})}
   </svg>
   {rulers&&<><div className="viewer-ruler-horizontal" style={{backgroundSize:`${Math.max(10,50*viewScale)}px 100%`}} aria-label="Horizontal composition ruler"/><div className="viewer-ruler-vertical" style={{backgroundSize:`100% ${Math.max(10,50*viewScale)}px`}} aria-label="Vertical composition ruler"/></>}
   {guides&&<div className="safe-guides"><div className="safe-guides-inner"/></div>}</div></div>
  <div className="viewer-toolbar"><span className="timecode">{formatTimecode(playhead,project)}</span><div className="playback-buttons"><button title="Previous frame" onClick={()=>{useEditor.getState().setPlaying(false);useEditor.getState().setPlayhead(playhead-1)}}><ChevronLeft size={19}/></button><button className="play-main" title="Play or pause (Space)" onClick={play}>{playing?<Pause size={18} fill="currentColor"/>:<Play size={18} fill="currentColor"/>}</button><button title="Next frame" onClick={()=>{useEditor.getState().setPlaying(false);useEditor.getState().setPlayhead(playhead+1)}}><ChevronRight size={19}/></button></div><span className="viewer-actions"><button title="Move selected layer (V)" className={tool==='move'?'active':''} onClick={()=>useEditor.getState().setTool('move')}><Move size={15}/></button><button title="Scale selected layer" className={tool==='scale'?'active':''} onClick={()=>useEditor.getState().setTool('scale')}><Maximize2 size={15}/></button><button title="Rotate selected layer" className={tool==='rotate'?'active':''} onClick={()=>useEditor.getState().setTool('rotate')}><RotateCw size={15}/></button><button title="Toggle grid" className={grid?'active':''} onClick={()=>setGrid(!grid)}><Grid3X3 size={15}/></button><button title="Toggle safe guides" className={guides?'active':''} onClick={()=>setGuides(!guides)}><Scan size={15}/></button><span className="viewer-zoom-controls"><button title="Viewer zoom out" onClick={()=>setZoomAt(viewScale/1.25)}><ZoomOut size={14}/></button><select aria-label="Viewer zoom presets" value={viewerZoom===null?'fit':[.25,.5,1,2].includes(viewerZoom)?String(viewerZoom):'custom'} onChange={e=>{if(e.target.value==='fit')setViewerZoom(null);else if(e.target.value!=='custom')setZoomAt(Number(e.target.value))}}><option value="fit">Fit</option><option value=".25">25%</option><option value=".5">50%</option><option value="1">100%</option><option value="2">200%</option><option value="custom">Custom</option></select><input title="Custom viewer zoom %" aria-label="Custom viewer zoom percent" type="number" min="5" max="800" value={Math.round(viewScale*100)} onChange={e=>{const n=Number(e.target.value);if(n>=5&&n<=800)setZoomAt(n/100)}} style={{width:52,height:25}}/><button title="Viewer zoom in" onClick={()=>setZoomAt(viewScale*1.25)}><ZoomIn size={14}/></button></span><button title={fullscreen?'Exit fullscreen (Esc)':'Fullscreen composition'} onClick={toggleFullscreen}>{fullscreen?<Minimize2 size={15}/>:<Fullscreen size={15}/>}</button></span></div>
  {menu&&<ContextMenu x={menu.x} y={menu.y} items={commands(menu.id)} close={()=>setMenu(null)}/>}
 </section>;
}
