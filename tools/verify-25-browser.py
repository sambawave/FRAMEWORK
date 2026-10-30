#!/usr/bin/env python3
"""Browser FontFace, canvas text and image-sequence test. IndexedDB storage is shimmed
in this sandbox because Chromium blocks all non-about:blank page navigation."""
import base64, io, json, pathlib, posixpath, re, zipfile
from functools import lru_cache
from playwright.sync_api import sync_playwright
from PIL import Image
ROOT=pathlib.Path('/tmp/framework-browser-test')
@lru_cache(None)
def url(name):
 source=(ROOT/name).read_text()
 def rewrite(m): return "from '"+url(posixpath.normpath(posixpath.join(posixpath.dirname(name),m.group(1))))+"'"
 source=re.sub(r"from ['\"](\.{1,2}/[^'\"]+)['\"]",rewrite,source)
 return 'data:text/javascript;base64,'+base64.b64encode(source.encode()).decode()
urls={name:url(name) for name in ['fonts/fontLibrary.mjs','types.mjs','engine/compositor.mjs','engine/sequenceExport.mjs']}
font=base64.b64encode(pathlib.Path('/usr/share/fonts/fonts-go/Go-Regular.ttf').read_bytes()).decode()
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
 try:
  page=browser.new_page()
  output=page.evaluate('''async ({urls,fontB64}) => {
  if(!crypto.randomUUID)Object.defineProperty(crypto,'randomUUID',{value:()=>Math.random().toString(36).slice(2)});
  // Only the database transport is shimmed; the actual browser FontFace, Canvas,
  // text renderer, image encoders and Blob output are exercised below.
  const dbRows=new Map();
  const fire=(tx)=>queueMicrotask(()=>tx.oncomplete?.());
  const database={objectStoreNames:{contains:()=>true},createObjectStore:()=>{},close:()=>{},transaction:()=>{
    const tx={oncomplete:null,onerror:null,onabort:null,objectStore:()=>({
      put:(value,key)=>{dbRows.set(key,value);fire(tx)},delete:key=>{dbRows.delete(key);fire(tx)},
      get:key=>{const req={};queueMicrotask(()=>{req.result=dbRows.get(key);req.onsuccess?.();fire(tx)});return req},
      getAll:()=>{const req={};queueMicrotask(()=>{req.result=[...dbRows.values()];req.onsuccess?.();fire(tx)});return req}
    })};return tx
  }};
  Object.defineProperty(window,'indexedDB',{configurable:true,value:{open:()=>{const r={result:database};queueMicrotask(()=>r.onsuccess?.());return r}}});
  const {importFonts,listFonts,ensureProjectFonts,portableFonts,removeFont}=await import(urls['fonts/fontLibrary.mjs']);
  const {newProject,makeClip}=await import(urls['types.mjs']);
  const {drawComposition}=await import(urls['engine/compositor.mjs']);
  const {exportImageSequence}=await import(urls['engine/sequenceExport.mjs']);
  const raw=atob(fontB64);const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  const imported=await importFonts([new File([bytes],'Go-Regular.ttf',{type:'font/ttf'})],true);
  if(imported.errors.length)throw Error(imported.errors.join(' • '));
  const font=imported.imported[0],listed=await listFonts();
  const p=newProject();p.width=320;p.height=140;p.background='#222222';p.durationFrames=4;
  const title=makeClip('text','V1',0);title.fontFamily=font.cssFamily;title.fontWeight='400';title.fontSize=55;title.text='FRAMEWORK';title.color='#ffffff';title.duration=4;p.clips=[title];
  await ensureProjectFonts(p);const cv=document.createElement('canvas');drawComposition(cv,p,0,()=>undefined);
  const pixels=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;let ink=0;
  for(let i=0;i<pixels.length;i+=4)if(pixels[i]>70)ink++;
  const portable=await portableFonts(p);
  const handle=exportImageSequence(p,{}, {mime:'image/png',width:160,height:70,frameRate:15,quality:1},()=>{});
  const gifHandle=exportImageSequence(p,{}, {mime:'image/gif',width:160,height:70,frameRate:15,quality:1},()=>{});
  const gif=await gifHandle.finished; if(!gif)throw Error('GIF cancelled');let gifBytes='';for(const byte of new Uint8Array(await gif.arrayBuffer()))gifBytes+=String.fromCharCode(byte);
  const zip=await handle.finished;if(!zip)throw Error('Cancelled');
  const zipBytes=new Uint8Array(await zip.arrayBuffer());
  const malformed=await importFonts([new File([new Uint8Array([1,2,3])],'bad.ttf')],false);
  await removeFont(font.id);let missing='';try{await ensureProjectFonts(p)}catch(e){missing=String(e)}
  let string='';for(const byte of zipBytes)string+=String.fromCharCode(byte);
  return {name:font.family,style:font.style,count:listed.length,ink,portableCount:portable.length,portableBytes:portable[0]?.base64.length,invalidErrors:malformed.errors,missing,zip:btoa(string),gif:btoa(gifBytes)};
  }''',dict(urls=urls,fontB64=font))
  gifData=base64.b64decode(output.pop('gif')); gifImg=Image.open(io.BytesIO(gifData)); output['gifFrames']=getattr(gifImg,'n_frames',1);output['gifSize']=gifImg.size;output['gifInk']=sum(v>70 for v in gifImg.convert('RGB').getchannel('R').getdata());data=base64.b64decode(output.pop('zip'));archive=zipfile.ZipFile(io.BytesIO(data));names=archive.namelist();img=Image.open(io.BytesIO(archive.read(names[0])))
  output['zipBytes']=len(data);output['frames']=names;output['pngSize']=img.size;output['pngInk']=sum(v>70 for v in img.convert('RGB').getchannel('R').getdata())
  print(json.dumps(output,indent=2))
  assert output['gifFrames']==2 and output['gifInk']>20 and output['gifSize']==(160,70),output
  assert output['count']==1 and output['ink']>200 and output['pngInk']>50,output
  assert output['portableCount']==1 and output['portableBytes']>1000,output
  assert output['frames']==['frame_000001.png','frame_000002.png'] and output['pngSize']==(160,70),output
  assert output['invalidErrors'] and 'Missing font' in output['missing'],output
  print('PASS: Chromium FontFace + animated canvas text + licensed portable metadata + PNG ZIP + invalid/missing-font handling (IDB shim)')
 finally:browser.close()
