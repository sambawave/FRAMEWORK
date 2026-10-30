#!/usr/bin/env python3
"""Real browser Canvas pixel checks for new text animation, independent dimensions, and inversion."""
import base64,json,pathlib,posixpath,re
from functools import lru_cache
from playwright.sync_api import sync_playwright
@lru_cache(None)
def url(name):
 source=(pathlib.Path('/tmp/framework-browser-test')/name).read_text()
 def rewrite(m):return "from '"+url(posixpath.normpath(posixpath.join(posixpath.dirname(name),m.group(1))))+"'"
 source=re.sub(r"from ['\"](\.{1,2}/[^'\"]+)['\"]",rewrite,source)
 return 'data:text/javascript;base64,'+base64.b64encode(source.encode()).decode()
urls={name:url('engine/'+name+'.mjs' if name!='types' else 'types.mjs') for name in ['types','compositor']}
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-webgl','--use-gl=angle'])
 try:
  page=browser.new_page()
  result=page.evaluate('''async urls=>{
   if(!crypto.randomUUID)Object.defineProperty(crypto,'randomUUID',{value:()=>Math.random().toString(36).slice(2)});
   const {newProject,makeClip}=await import(urls.types),{drawComposition}=await import(urls.compositor);
   const p=newProject();p.width=128;p.height=128;p.durationFrames=70;p.background='#000000';
   const canvas=document.createElement('canvas');const pixel=(x,y)=>{const a=canvas.getContext('2d').getImageData(x,y,1,1).data;return Array.from(a.slice(0,3))};
   const total=()=>{const data=canvas.getContext('2d').getImageData(0,0,128,128).data;let sum=0;for(let i=0;i<data.length;i+=4)sum+=data[i]+data[i+1]+data[i+2];return sum};
   const text=makeClip('text','V1',0);text.duration=70;text.text='HI';text.fontSize=78;text.color='#ffffff';text.textAnimation={mode:'fade',duration:30,delay:0,intensity:100,loop:false};p.clips=[text];
   drawComposition(canvas,p,0,()=>undefined);const faded=total();drawComposition(canvas,p,45,()=>undefined);const visible=total();
   const shape=makeClip('shape','V1',0);shape.duration=70;shape.shape='rectangle';shape.shapeWidth=40;shape.shapeHeight=40;shape.color='#ff0000';shape.transform.scaleX=2;shape.transform.scaleY=.5;p.clips=[shape];
   drawComposition(canvas,p,5,()=>undefined);const wide=pixel(86,64),low=pixel(64,79);
   shape.effects=[{id:'invert',type:'invert',amount:50,enabled:true}];drawComposition(canvas,p,5,()=>undefined);const half=pixel(64,64);
   shape.keyframes.opacity=[{frame:0,value:0,ease:'linear'},{frame:30,value:1,ease:'linear'}];drawComposition(canvas,p,0,()=>undefined);const invisible=pixel(64,64);drawComposition(canvas,p,30,()=>undefined);const opaque=pixel(64,64);
   return {faded,visible,wide,low,half,invisible,opaque};
  }''',urls)
  print(json.dumps(result,indent=2))
  assert result['visible']>result['faded']+10000,result
  assert result['wide'][0]>100 and result['low'][0]==0,result
  assert all(105<=c<=150 for c in result['half']),result
  assert result['invisible']==[0,0,0] and result['opaque'][0]>100,result
  print('PASS: Chromium rendered per-character fade, independent X/Y scale, 50% inversion, and opacity keyframes')
 finally:browser.close()
