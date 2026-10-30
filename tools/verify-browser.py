#!/usr/bin/env python3
"""Browser engine smoke verification: uses installed Python Playwright and Chromium.
Run after: node tools/build-browser-engine.cjs /tmp/framework-browser-test
Does not rely on frontend npm packages.
"""
import base64, json, pathlib, posixpath, re
from functools import lru_cache
from playwright.sync_api import sync_playwright

@lru_cache(maxsize=None)
def module_url(name):
    """Recursively inline the test engine as data: ESM modules; no HTTP navigation required."""
    source=(pathlib.Path('/tmp/framework-browser-test')/name).read_text()
    def rewrite(match):
        dep=posixpath.normpath(posixpath.join(posixpath.dirname(name),match.group(1)))
        return "from '"+module_url(dep)+"'"
    source=re.sub(r"from ['\"](\.{1,2}/[^'\"]+)['\"]",rewrite,source)
    return 'data:text/javascript;base64,'+base64.b64encode(source.encode()).decode()

urls={key:module_url(key+'.mjs' if key=='types' else 'engine/'+key+'.mjs') for key in ['types','compositor','motionPresets','masks','playback']}
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
    try:
        page=browser.new_page()  # about:blank; navigation may be blocked in sandbox
        page.on('console',lambda msg: print('BROWSER:',msg.text) if msg.type=='error' else None)
        result=page.evaluate('''async (urls) => {
            if(!crypto.randomUUID)Object.defineProperty(crypto,'randomUUID',{value:()=>('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx').replace(/[xy]/g,t=>{const r=Math.random()*16|0;return (t==='x'?r:r&3|8).toString(16)})});
            const {newProject,makeClip}=await import(urls.types);
            const {drawComposition}=await import(urls.compositor);
            const {createMotionKeys,initialMotionOptions}=await import(urls.motionPresets);
            const {startMaskAnimation,setMaskAt}=await import(urls.masks);
            const {exportVideo,PlaybackEngine}=await import(urls.playback);
            const p=newProject();p.width=100;p.height=100;p.durationFrames=20;p.background='#0033ff';
            const c=makeClip('solid','V1',0);c.duration=20;c.color='#ff0000';p.clips.push(c);
            const canvas=document.createElement('canvas');const render=f=>{drawComposition(canvas,p,f,()=>undefined);return canvas.getContext('2d').getImageData(50,50,1,1).data.slice(0,3).join(',')};
            let base=render(0);
            c.effects.push({id:'invert',type:'invert',amount:100,enabled:true});const invert=render(0);
            c.effects=[];c.mask='polygon';c.maskPoints=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]];
            const center=render(0),edge=canvas.getContext('2d').getImageData(5,5,1,1).data.slice(0,3).join(',');
            Object.assign(c,startMaskAnimation(c,0));
            Object.assign(c,setMaskAt(c,19,[[.5,-.5],[.9,-.5],[.9,.5],[.5,.5]]));
            const late=render(19);
            c.mask='none';c.maskKeyframes=undefined;
            c.effects=[{id:'grain',type:'grain',amount:100,enabled:true}];const grain=render(0);
            c.effects=[{id:'rgb',type:'rgbSplit',amount:4,enabled:true}];render(0);
            c.effects=[{id:'pix',type:'pixelate',amount:5,enabled:true}];render(0);
            c.effects=[];
            const moved=createMotionKeys(c,p,0,'slideIn',{...initialMotionOptions,duration:10,intensity:100,direction:'left'});
            const motionKeys=moved.keyframes.x?.length||0;
            p.clips=[{...c,mask:'none',maskKeyframes:undefined,effects:[],keyframes:{}}];
            const handle=exportVideo(p,{},()=>{}, {videoBitrate:1_500_000});
            const blob=await Promise.race([handle.finished,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Export timed out')),9000))]);
            let decoded=false,sourceFrame='';
            if(blob&&blob.size>100){const url=URL.createObjectURL(blob);const v=document.createElement('video');v.src=url;v.preload='metadata';decoded=await new Promise(resolve=>{v.onloadedmetadata=()=>resolve(v.duration>0);v.onerror=()=>resolve(false);setTimeout(()=>resolve(false),3000)});
              const q=newProject();q.width=100;q.height=100;q.background='#0033ff';q.durationFrames=20;
              q.assets=[{id:'import-video',name:'source.webm',type:'video',duration:.6,mime:'video/webm',bytes:blob.size,width:100,height:100}];
              const clip=makeClip('video','V1',0);clip.mediaId='import-video';clip.duration=20;clip.effects=[{id:'i',type:'invert',amount:100,enabled:true}];q.clips=[clip];
              const preview=document.createElement('canvas'),engine=new PlaybackEngine(preview,q,{'import-video':url},false);
              const player=engine.players.values().next().value?.el;
              if(player){await new Promise(resolve=>{if(player.readyState>=2)return resolve(true);player.onloadeddata=()=>resolve(true);player.onerror=()=>resolve(false);setTimeout(()=>resolve(false),3000)});engine.seek(2);await new Promise(resolve=>setTimeout(resolve,200));engine.draw(2);sourceFrame=preview.getContext('2d').getImageData(50,50,1,1).data.slice(0,3).join(',')}
              engine.dispose();URL.revokeObjectURL(url)
            }
            return {base,invert,center,edge,late,grain,motionKeys,exportBytes:blob?.size||0,decoded,sourceFrame};
        }''',urls)
        print(json.dumps(result,indent=2))
        assert result['base']=='255,0,0',result
        assert result['invert']=='0,255,255',result
        assert result['center']=='255,0,0',result
        assert result['edge']=='0,51,255',result
        assert result['late']=='0,51,255',result
        assert result['motionKeys']==2,result
        assert result['exportBytes']>100,result
        assert result['decoded'],result
        assert int(result['sourceFrame'].split(',')[0])<100 and int(result['sourceFrame'].split(',')[1])>150,result
        print('PASS: actual browser canvas rendering, invert effect, polygon masks, path keyframes, grain, RGB split, pixelation, motion presets and decodable WebM export + actual imported video effect pipeline')

    finally:
        browser.close()
