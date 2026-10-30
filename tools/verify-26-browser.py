"""Offline Chromium audio-graph proof: processors change real rendered PCM."""
from pathlib import Path
from playwright.sync_api import sync_playwright

def run():
    from subprocess import check_output
    js=check_output(['node','-e',"const t=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript'),f=require('fs').readFileSync('src/engine/audioFx.ts','utf8');process.stdout.write(t.transpileModule(f,{compilerOptions:{target:t.ScriptTarget.ES2022,module:t.ModuleKind.ESNext}}).outputText)"] ,text=True)
    js=js.replace('export ','')+'\nwindow.buildAudioEffects=buildAudioEffects;'
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        page=browser.new_page()
        page.goto('about:blank')
        page.add_script_tag(content=js)
        values=page.evaluate('''async ()=>{
          async function test(effects){const ctx=new OfflineAudioContext(1,44100,44100);const osc=ctx.createOscillator();osc.frequency.value=4800;const g=ctx.createGain();g.gain.value=.75;osc.connect(g);buildAudioEffects(ctx,g,ctx.destination,effects);osc.start(0);osc.stop(1);const buffer=await ctx.startRendering();const data=buffer.getChannelData(0);let sum=0;for(let i=11025;i<33075;i++)sum+=data[i]**2;return Math.sqrt(sum/22050)}
          return {original:await test([]),lowpass:await test([{id:'lp',type:'lowpass',enabled:true,amount:0}]),highpass:await test([{id:'hp',type:'highpass',enabled:true,amount:100}]),distortion:await test([{id:'di',type:'distortion',enabled:true,amount:100}]),tremolo:await test([{id:'tr',type:'tremolo',enabled:true,amount:100}]),delay:await test([{id:'de',type:'delay',enabled:true,amount:60}])};
        }''')
        assert values['original']>.3,values
        assert values['lowpass']<values['original']*.1,values
        assert abs(values['distortion']-values['original'])>.02,values
        assert abs(values['tremolo']-values['original'])>.02,values
        assert values['delay']>.03,values
        print('PASS: real Chromium OfflineAudioContext PCM test',values)
        browser.close()
if __name__=='__main__':run()
