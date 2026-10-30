import {Clip,Project,fps,projectEnd} from '../types';
import {buildAudioEffects} from './audioFx';
import {drawComposition} from './compositor';
import {prepareThree} from './threeScene';
import {ensureProjectFonts} from '../fonts/fontLibrary';
import {isActive,sourceTime,valueAt} from './timeline';
interface Player {el:HTMLVideoElement|HTMLAudioElement;source?:MediaElementAudioSourceNode;gain?:GainNode;pan?:StereoPannerNode;cleanupFx?:()=>void;fingerprint?:string;url:string}
export class PlaybackEngine {
 private p:Project;private canvas:HTMLCanvasElement;
 private players=new Map<string,Player>();private images=new Map<string,HTMLImageElement>();
 private ctx?:AudioContext;private dest?:MediaStreamAudioDestinationNode;
 private raf=0;private startedAt=0;private startFrame=0;private frame=0;private isPlaying=false;
 private loopPlayback=false;private playRequest=0;private disposed=false;private displayAudio:boolean;private onFrame?:(frame:number)=>void;private onFinish?:()=>void;
 constructor(canvas:HTMLCanvasElement,p:Project,urls:Record<string,string>,speakers=true){this.canvas=canvas;this.p=p;this.displayAudio=speakers;this.update(p,urls)}
 update(p:Project,urls:Record<string,string>){
  this.p=p;
  const expected=new Set(p.clips.map(c=>c.id));
  for(const [id,player] of this.players)if(!expected.has(id)||urls[p.clips.find(c=>c.id===id)?.mediaId??'']!==player.url){player.cleanupFx?.();player.source?.disconnect();player.el.pause();player.el.removeAttribute('src');player.el.load();this.players.delete(id)}
  for(const [id] of this.images)if(!p.assets.some(a=>a.id===id)){this.images.delete(id)}
  for(const c of p.clips){if(!c.mediaId||!urls[c.mediaId])continue;const url=urls[c.mediaId];
   if(c.kind==='image'&&!this.images.has(c.mediaId)){const img=new Image();img.onload=()=>this.draw(this.frame);img.src=url;this.images.set(c.mediaId,img)}
   else if((c.kind==='video'||c.kind==='audio')&&!this.players.has(c.id)){
    const el=c.kind==='video'?document.createElement('video'):document.createElement('audio');
    el.src=url;el.preload='auto';el.loop=false;el.muted=false;
    if(el instanceof HTMLVideoElement)el.playsInline=true;
    el.addEventListener('seeked',()=>{if(!this.isPlaying)this.draw(this.frame)});
    el.addEventListener('loadeddata',()=>{if(!this.isPlaying)this.draw(this.frame)});
    this.players.set(c.id,{el,url});
   }
  }
  this.updateFx();if(!this.isPlaying)this.seek(this.frame);
 }
 private async initAudio(){
  if(!this.ctx)this.ctx=new AudioContext({latencyHint:'interactive'});
  if(!this.dest){
   this.dest=this.ctx.createMediaStreamDestination();
   // A connected zero-gain audio node supplies valid silent packets to WebM muxers,
   // even when the timeline contains only video/shapes. Otherwise some browsers
   // produce a zero-byte file for an inactive MediaStreamAudioDestinationNode.
   const silence=this.ctx.createConstantSource(),quiet=this.ctx.createGain();quiet.gain.value=0;
   silence.connect(quiet);quiet.connect(this.dest);silence.start();
  }
  for(const player of this.players.values()){
   if(player.source)continue;
   try{
    const source=this.ctx.createMediaElementSource(player.el);const gain=this.ctx.createGain();const pan=this.ctx.createStereoPanner();
    gain.connect(pan);pan.connect(this.dest);
    if(this.displayAudio)pan.connect(this.ctx.destination);
    player.source=source;player.gain=gain;player.pan=pan;
   }catch(e){console.warn('Could not connect media audio',e)}
  }
  this.updateFx();await this.ctx.resume();
 }
 private updateFx(){if(!this.ctx)return;
  for(const clip of this.p.clips){const player=this.players.get(clip.id);if(!player?.source||!player.gain)continue;
   const signature=JSON.stringify(clip.audioEffects??[]);if(signature===player.fingerprint)continue;
   player.cleanupFx?.();player.source.disconnect();
   player.cleanupFx=buildAudioEffects(this.ctx,player.source,player.gain,clip.audioEffects??[]);
   player.fingerprint=signature;
  }
 }
 setLoop(enabled:boolean){this.loopPlayback=enabled}
 async unlock(){await this.initAudio()}
 get audioStream(){return this.dest?.stream}
 private getMedia=(c:Clip)=>c.kind==='image'?this.images.get(c.mediaId??''):this.players.get(c.id)?.el;
 draw(frame:number){this.frame=frame;drawComposition(this.canvas,this.p,frame,this.getMedia)}
 seek(frame:number){this.frame=Math.max(0,Math.round(frame));this.sync(false);this.draw(this.frame)}
 private sync(playing:boolean){
  for(const c of this.p.clips){const player=this.players.get(c.id);if(!player)continue;
   const track=this.p.tracks.find(t=>t.id===c.trackId);
   const soloTracks=this.p.tracks.some(t=>t.kind===track?.kind&&t.solo);
   const active=isActive(c,this.frame)&&!track?.hidden&&(!soloTracks||!!track?.solo);
   const el=player.el;
   if(active){
    const target=Math.max(0,sourceTime(c,this.frame,this.p));
    el.playbackRate=Math.max(.1,Math.min(8,c.speed??1));
    if(Number.isFinite(target)&&Math.abs(el.currentTime-target)>(c.reverse?.012:playing?.16:.035)){
     try{el.currentTime=target}catch{/* metadata not loaded */}
    }
    const local=this.frame-c.start;
    const fadeIn=c.fadeIn>0?Math.min(1,local/c.fadeIn):1;
    const fadeOut=c.fadeOut>0?Math.min(1,(c.duration-local)/c.fadeOut):1;
    const vol=(track?.muted||c.audioMuted||c.reverse?0:1)*Math.max(0,Math.min(2,valueAt(c,'volume',this.frame)))*Math.max(0,Math.min(fadeIn,fadeOut));
    if(player.gain)player.gain.gain.value=vol;
    else el.volume=Math.min(1,vol);
    if(player.pan)player.pan.pan.value=Math.max(-1,Math.min(1,c.pan));
    if(playing&&!c.reverse&&el.paused)void el.play().catch(()=>{});
    if((!playing||c.reverse)&&!el.paused)el.pause();
   }else if(!el.paused)el.pause();
  }
 }
 async play(from:number,onFrame?:(f:number)=>void,onFinish?:()=>void){
  this.pause();const request=this.playRequest;
  this.frame=from;this.startFrame=from;this.onFrame=onFrame;this.onFinish=onFinish;
  await this.initAudio();
  // AudioContext.resume() can resolve after the user pressed Pause or changed projects.
  if(this.disposed||request!==this.playRequest)return;
  this.startedAt=performance.now();this.isPlaying=true;
  const tick=()=>{
   if(!this.isPlaying)return;
   const elapsed=(performance.now()-this.startedAt)/1000;
   const next=this.startFrame+Math.floor(elapsed*fps(this.p));
   if(next>=projectEnd(this.p)){
    if(this.loopPlayback){
     this.startFrame=0;this.startedAt=performance.now();this.frame=0;this.sync(true);this.draw(0);this.onFrame?.(0);
     this.raf=requestAnimationFrame(tick);return;
    }
    this.frame=projectEnd(this.p);this.sync(false);this.draw(this.frame);this.onFrame?.(this.frame);this.pause();this.onFinish?.();return;
   }
   this.frame=next;this.sync(true);this.draw(this.frame);this.onFrame?.(this.frame);this.raf=requestAnimationFrame(tick);
  };
  tick();
 }
 pause(){this.playRequest++;this.isPlaying=false;cancelAnimationFrame(this.raf);for(const {el} of this.players.values())el.pause()}
 dispose(){this.disposed=true;this.pause();for(const {el,source,cleanupFx} of this.players.values()){cleanupFx?.();source?.disconnect();el.removeAttribute('src');el.load()}this.players.clear();this.images.clear();void this.ctx?.close()}
}
export interface ExportOptions {videoBitrate?:number;audioBitrate?:number;mime?:string;width?:number;height?:number;frameRate?:number;includeAudio?:boolean}
export interface ExportStatus {state:'idle'|'rendering'|'complete'|'failed'|'cancelled'; progress:number; message?:string}
export interface ExportHandle {cancel:()=>void;finished:Promise<Blob|null>}
export function supportedVideoMimes(){
 if(typeof MediaRecorder==='undefined'||typeof HTMLCanvasElement==='undefined'||typeof HTMLCanvasElement.prototype.captureStream!=='function')return {webm:null as string|null,mp4:null as string|null};
 const supported=(list:string[])=>list.find(x=>MediaRecorder.isTypeSupported(x))??null;
 return {webm:supported(['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm']),mp4:supported(['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4;codecs=avc1.42E01E','video/mp4'])};
}
export function canExport(){const m=supportedVideoMimes();return !!(m.webm||m.mp4)}
export function exportVideo(p:Project,urls:Record<string,string>,onProgress:(v:number)=>void,options:ExportOptions={}):ExportHandle{
 let cancelled=false;let stop=()=>{};
 const finished=(async():Promise<Blob|null>=>{
  if(!canExport())throw Error('This browser does not support canvas recording');
  if(p.clips.some(c=>c.mediaId&&!urls[c.mediaId]))throw Error('Missing media. Relink your files before exporting.');
  await ensureProjectFonts(p);
  if(p.clips.some(c=>c.kind==='3d'))await prepareThree();
  const canvas=document.createElement('canvas');canvas.width=p.width;canvas.height=p.height;
  const engine=new PlaybackEngine(canvas,p,urls,false);
  const durationFrames=projectEnd(p);
  const mime=options.mime??(supportedVideoMimes().webm||supportedVideoMimes().mp4);
  if(!mime||!MediaRecorder.isTypeSupported(mime)){engine.dispose();throw Error('Requested video codec is not available in this browser')}
  let recorder:MediaRecorder|undefined;
  try{
   engine.seek(0);
   const recorderCanvas=options.width&&options.height&&(options.width!==p.width||options.height!==p.height)?document.createElement('canvas'):canvas;
   if(recorderCanvas!==canvas){recorderCanvas.width=options.width!;recorderCanvas.height=options.height!;recorderCanvas.getContext('2d')?.drawImage(canvas,0,0,recorderCanvas.width,recorderCanvas.height)}
   const stream=recorderCanvas.captureStream(Math.max(1,Math.min(120,options.frameRate??fps(p))));
   // Initialize audio before recording, with output redirected to the recorder only.
   // AudioContext is resumed from the export click handler's user gesture.
   await engine.play(0,undefined,undefined);engine.pause();
   const audio=engine.audioStream;
   if(options.includeAudio!==false&&audio)for(const track of audio.getAudioTracks())stream.addTrack(track);
   const chunks:Blob[]=[];
   recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:options.videoBitrate??6_000_000,audioBitsPerSecond:options.audioBitrate??192_000});
   let resolveStop:(v:Blob|null)=>void=()=>{},rejectStop:(e:Error)=>void=()=>{};
   let encoderFailure:Error|undefined;
   const completion=new Promise<Blob|null>((resolve,reject)=>{resolveStop=resolve;rejectStop=reject});
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
   recorder.onerror=(event)=>{
    const errorEvent=event as Event&{error?:DOMException};
    encoderFailure=new Error(errorEvent.error?.message??'The browser video encoder failed');
    if(recorder?.state!=='inactive')recorder?.stop();
   };
   recorder.onstop=()=>{
    if(encoderFailure){rejectStop(encoderFailure);return}
    const blob=new Blob(chunks,{type:mime});
    if(!cancelled&&blob.size===0){rejectStop(Error('Encoder produced an empty WebM file'));return}
    resolveStop(cancelled?null:blob);
   };
   stop=()=>{cancelled=true;engine.pause();if(recorder?.state!=='inactive')recorder?.stop()};
   recorder.start(1000);
   await engine.play(0,f=>{if(recorderCanvas!==canvas)recorderCanvas.getContext('2d')?.drawImage(canvas,0,0,recorderCanvas.width,recorderCanvas.height);onProgress(Math.min(1,f/durationFrames))},()=>{if(recorder?.state==='recording')recorder.stop()});
   const output=await completion;
   onProgress(output?1:0);
   return output;
  }finally{engine.dispose()}
 })();
 return {cancel:()=>{cancelled=true;stop()},finished};
}
