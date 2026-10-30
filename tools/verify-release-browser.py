#!/usr/bin/env python3
"""Chromium pixel-level release checks for live reordering, solo, null, and adjustment layers."""
import base64,json,pathlib,posixpath,re
from functools import lru_cache
from playwright.sync_api import sync_playwright
@lru_cache(None)
def url(name):
 source=(pathlib.Path('/tmp/framework-browser-test')/name).read_text()
 def rewrite(m):return "from '"+url(posixpath.normpath(posixpath.join(posixpath.dirname(name),m.group(1))))+"'"
 source=re.sub(r"from ['\"](\.{1,2}/[^'\"]+)['\"]",rewrite,source)
 return 'data:text/javascript;base64,'+base64.b64encode(source.encode()).decode()
urls={name:url('engine/'+name+'.mjs' if name!='types' else 'types.mjs') for name in ['types','compositor','layers','playback']}
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
 try:
  page=browser.new_page()
  result=page.evaluate('''async urls=>{
   if(!crypto.randomUUID)Object.defineProperty(crypto,'randomUUID',{value:()=>Math.random().toString(36).slice(2)});
   const {newProject,makeClip}=await import(urls.types),{drawComposition}=await import(urls.compositor),{insertAtVisualIndex}=await import(urls.layers),{exportVideo}=await import(urls.playback);
   const p=newProject();p.width=80;p.height=80;p.durationFrames=20;p.background='#000000';
   const lower=makeClip('solid','V2',0),upper=makeClip('solid','V3',0);lower.color='#00ff00';upper.color='#ff0000';lower.duration=20;upper.duration=20;p.clips=[lower,upper];
   const canvas=document.createElement('canvas'),pixel=()=>{drawComposition(canvas,p,5,()=>undefined);return Array.from(canvas.getContext('2d').getImageData(40,40,1,1).data).slice(0,3).join(',')};
   const initial=pixel();
   p.tracks=insertAtVisualIndex(p.tracks,['V2'],0);const reordered=pixel();
   p.tracks.find(t=>t.id==='V2').hidden=true;const hidden=pixel();p.tracks.find(t=>t.id==='V2').hidden=false;
   p.tracks.find(t=>t.id==='V3').solo=true;const solo=pixel();p.tracks.find(t=>t.id==='V3').solo=false;
   const adjustment=makeClip('adjustment','V2',0);adjustment.duration=20;adjustment.effects=[{id:'i',type:'invert',amount:100,enabled:true}];p.clips.push(adjustment);const adjusted=pixel();
   p.clips.pop();const nul=makeClip('null','V2',0);nul.duration=20;p.clips.push(nul);const nullPixel=pixel();p.clips.pop();
   const handle=exportVideo(p,{},()=>{}, {videoBitrate:800000});const blob=await Promise.race([handle.finished,new Promise((_,reject)=>setTimeout(()=>reject(Error('timeout')),8000))]);
   return {initial,reordered,hidden,solo,adjusted,nullPixel,exportBytes:blob?.size||0};
  }''',urls)
  print(json.dumps(result,indent=2))
  assert result['initial']=='255,0,0',result
  assert result['reordered']=='0,255,0',result
  assert result['hidden']=='255,0,0',result
  assert result['solo']=='255,0,0',result
  assert result['adjusted']=='255,0,255',result
  assert result['nullPixel']=='0,255,0',result
  assert result['exportBytes']>100,result
  print('PASS: real stacking order, visibility, solo, adjustment pixels, null transparency, and decodable export')
 finally:browser.close()
