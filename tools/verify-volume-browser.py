#!/usr/bin/env python3
"""Browser smoke for per-clip audio graph gain, mute and restore (video + audio)."""
import json,base64,pathlib,posixpath,re
from functools import lru_cache
from playwright.sync_api import sync_playwright
@lru_cache(None)
def url(path):
 src=(pathlib.Path('/tmp/framework-browser-test')/path).read_text()
 def rewrite(m):return "from '"+url(posixpath.normpath(posixpath.join(posixpath.dirname(path),m.group(1))))+"'"
 src=re.sub(r"from ['\"](\.{1,2}/[^'\"]+)['\"]",rewrite,src)
 return 'data:text/javascript;base64,'+base64.b64encode(src.encode()).decode()
urls={k:url('engine/'+k+'.mjs' if k!='types' else 'types.mjs') for k in ['types','playback']}
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
 try:
  page=browser.new_page()
  result=page.evaluate('''async urls=>{
   if(!crypto.randomUUID)Object.defineProperty(crypto,'randomUUID',{value:()=>Math.random().toString(36).slice(2)});
   const {newProject,makeClip}=await import(urls.types);const {PlaybackEngine}=await import(urls.playback);
   const samples=new Uint8Array(44+48000*2);const d=new DataView(samples.buffer);
   const ascii=(i,s)=>{for(let n=0;n<s.length;n++)d.setUint8(i+n,s.charCodeAt(n))};
   ascii(0,'RIFF');d.setUint32(4,samples.length-8,true);ascii(8,'WAVE');ascii(12,'fmt ');d.setUint32(16,16,true);d.setUint16(20,1,true);d.setUint16(22,1,true);d.setUint32(24,48000,true);d.setUint32(28,96000,true);d.setUint16(32,2,true);d.setUint16(34,16,true);ascii(36,'data');d.setUint32(40,96000,true);
   for(let i=0;i<48000;i++)d.setInt16(44+i*2,Math.round(Math.sin(i*2*Math.PI*440/48000)*12000),true);
   const audioURL=URL.createObjectURL(new Blob([samples],{type:'audio/wav'}));const p=newProject();p.width=64;p.height=64;
   const a=makeClip('audio','A1',0),v=makeClip('video','V1',0);a.mediaId='tone';v.mediaId='tone';a.volume=.42;v.volume=1.4;p.clips=[a,v];
   const engine=new PlaybackEngine(document.createElement('canvas'),p,{tone:audioURL},false);await engine.unlock();engine.seek(0);
   const inspect=()=>[engine.players.get(a.id).gain.gain.value,engine.players.get(v.id).gain.gain.value];
   const before=inspect();a.audioMuted=true;v.audioMuted=true;engine.update(p,{tone:audioURL});engine.seek(1);const muted=inspect();a.audioMuted=false;v.audioMuted=false;engine.update(p,{tone:audioURL});engine.seek(2);const restored=inspect();
   engine.dispose();URL.revokeObjectURL(audioURL);return {before,muted,restored};
  }''',urls)
  print(json.dumps(result))
  assert all(abs(a-b)<1e-5 for a,b in zip(result['before'],[.42,1.4])),result
  assert result['muted']==[0,0],result
  assert all(abs(a-b)<1e-5 for a,b in zip(result['restored'],[.42,1.4])),result
  print('PASS: real browser Web Audio graph gains follow per-clip audio/video volume and mute/restore')
 finally:browser.close()
