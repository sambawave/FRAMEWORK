#!/usr/bin/env python3
"""Real Chromium canvas + shape/export regression check; no npm dependencies."""
import base64, pathlib, posixpath, re, json
from functools import lru_cache
from playwright.sync_api import sync_playwright
@lru_cache(None)
def url(name):
 source=(pathlib.Path('/tmp/framework-browser-test')/name).read_text()
 def rewrite(m): return "from '"+url(posixpath.normpath(posixpath.join(posixpath.dirname(name),m.group(1))))+"'"
 source=re.sub(r"from ['\"](\.{1,2}/[^'\"]+)['\"]",rewrite,source)
 return 'data:text/javascript;base64,'+base64.b64encode(source.encode()).decode()
urls={name:url('engine/'+name+'.mjs' if name!='types' else 'types.mjs') for name in ['types','compositor','snapping','shapes','playback']}
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
 try:
  page=browser.new_page()
  result=page.evaluate('''async urls => {
   if(!crypto.randomUUID)Object.defineProperty(crypto,'randomUUID',{value:()=>Math.random().toString(36).slice(2)});
   const {newProject,makeClip}=await import(urls.types),{drawComposition}=await import(urls.compositor),{snapEdit}=await import(urls.snapping),{shapeNames}=await import(urls.shapes),{exportVideo}=await import(urls.playback);
   const p=newProject();p.width=200;p.height=200;p.background='#000000';p.durationFrames=18;
   const c=makeClip('shape','V1',0);c.shape='rectangle';c.color='#ff0000';c.shapeWidth=90;c.shapeHeight=90;c.duration=18;p.clips=[c];
   const cv=document.createElement('canvas'),read=()=>{drawComposition(cv,p,1,()=>undefined);return [...cv.getContext('2d').getImageData(100,100,1,1).data].slice(0,3)};
   const result={rectangle:read()};
   c.shape='ellipse';result.ellipse=read();
   c.shape='star';result.star=read();result.shapes=shapeNames.length;
   c.shape='line';c.strokeWidth=4;c.strokeColor='#00ff00';result.line=read();
   c.shape='bezier';c.shapePoints=[[-1,-1],[0,1],[1,-1]];result.bezier=read();
   c.shape='rectangle';c.audioMuted=true;c.volume=.27;
   const project=JSON.parse(JSON.stringify(p));result.persistence={muted:project.clips[0].audioMuted,volume:project.clips[0].volume};
   const audio=makeClip('audio','A1',0);audio.duration=10;p.clips.push(audio); // no source: tests that video export still works
   result.snap=snapEdit(p,c,'move',0,1,true,2).guide;
   const handle=exportVideo(p,{},()=>{}, {videoBitrate:1000000});const blob=await Promise.race([handle.finished,new Promise((_,rej)=>setTimeout(()=>rej(Error('timeout')),7000))]);result.webmBytes=blob?.size||0;
   return result;
  }''',urls)
  print(json.dumps(result,indent=2))
  assert result['rectangle']==[255,0,0] and result['ellipse']==[255,0,0],result
  assert result['shapes']==10,result
  assert result['line'][1]>result['line'][0],result
  assert result['persistence']=={'muted':True,'volume':.27},result
  assert result['webmBytes']>100,result
  print('PASS: browser shape renderer, editable clip properties, no-source WebM export')
 finally:browser.close()
