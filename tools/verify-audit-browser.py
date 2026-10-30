#!/usr/bin/env python3
"""Exercise real Chromium Canvas with the same interpolated frame model as sequence export.
Loads the actual editor engine transpiled from source, not a parallel mock renderer.
"""
import base64,io,json,pathlib,posixpath,re,zipfile
from functools import lru_cache
from playwright.sync_api import sync_playwright
from PIL import Image
ROOT=pathlib.Path('/tmp/framework-browser-test')
@lru_cache(None)
def url(name):
 s=(ROOT/name).read_text()
 s=re.sub(r"from ['\"](\.{1,2}/[^'\"]+)['\"]",lambda m:"from '"+url(posixpath.normpath(posixpath.join(posixpath.dirname(name),m.group(1))))+"'",s)
 return 'data:text/javascript;base64,'+base64.b64encode(s.encode()).decode()
urls={name:url(name) for name in ['types.mjs','engine/timeline.mjs','engine/compositor.mjs','engine/sequenceExport.mjs','engine/playback.mjs']}
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
 try:
  page=browser.new_page()
  result=page.evaluate('''async urls=>{
   if(!crypto.randomUUID)Object.defineProperty(crypto,'randomUUID',{value:()=>Math.random().toString(36).slice(2)});
   const {newProject,makeClip}=await import(urls['types.mjs']);
   const {valueAt,evaluate}=await import(urls['engine/timeline.mjs']);
   const {drawComposition}=await import(urls['engine/compositor.mjs']);
   const {exportImageSequence}=await import(urls['engine/sequenceExport.mjs']);
   const {PlaybackEngine}=await import(urls['engine/playback.mjs']);
   let project=newProject();project.width=220;project.height=100;project.background='#000000';project.durationFrames=90;
   const layer=makeClip('shape','V1',0);layer.shape='rectangle';layer.shapeWidth=26;layer.shapeHeight=26;layer.color='#ff0000';layer.duration=90;
   layer.keyframes.x=[{frame:0,value:0,ease:'easeInOut',autoEase:true},{frame:80,value:80,ease:'linear',autoEase:true}];project.clips=[layer];
   const canvas=document.createElement('canvas');const pixel=x=>Array.from(canvas.getContext('2d').getImageData(x,50,1,1).data);
   layer.smoothEasing=false;drawComposition(canvas,project,20,()=>undefined);const linearPixel=pixel(140),linearPos=valueAt(layer,'x',20);
   layer.smoothEasing=true;drawComposition(canvas,project,20,()=>undefined);const smoothPixel=pixel(140),smoothPos=valueAt(layer,'x',20);
   layer.smoothEasing=false;const pending=exportImageSequence(project,{}, {mime:'image/png',width:220,height:100,frameRate:30,quality:1},()=>{});
   const file=await pending.finished;if(!file)throw Error('sequence unexpectedly canceled');
   const bytes=new Uint8Array(await file.arrayBuffer());let text='';for(let i=0;i<bytes.length;i++)text+=String.fromCharCode(bytes[i]);
   const engine=new PlaybackEngine(document.createElement('canvas'),project,{});
   const pendingPlay=engine.play(0);engine.pause();await pendingPlay;
   const lateResume=engine.isPlaying;engine.dispose();
   const output={linearPixel,smoothPixel,linearPos,smoothPos,lateResume,zip:btoa(text)};
   return output;
  }''',urls)
  data=base64.b64decode(result.pop('zip'));z=zipfile.ZipFile(io.BytesIO(data));file=z.namelist()[20];pix=Image.open(io.BytesIO(z.read(file))).convert('RGB').getpixel((140,50));result['exportFrame']=file;result['exportPixel']=pix;result['frames']=len(z.namelist());print(json.dumps(result,indent=2))
  assert result['linearPos']==20 and result['smoothPos']<10,result
  assert result['linearPixel'][0]>200 and result['smoothPixel'][0]<20,result
  assert pix[0]>200 and result['frames']==90,result
  assert result['lateResume'] is False,result
  print('PASS: toggle switches actual rasterized frames; PNG export matches linear preview, and Pause cancels pending Web Audio startup')
 finally:browser.close()
