"""Visual checks of the real FRAMEWORK theme/CSS implementation on representative DOM.
This is not a React-app E2E test; it explicitly does not certify the whole UI.
"""
from pathlib import Path
import subprocess, json, re
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
TS_PATH='/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript'
# Compile the *actual* theme engine to a browser ES module.
compiler='''const ts=require(process.argv[1]),fs=require('fs');const source=fs.readFileSync(process.argv[2],'utf8');const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;process.stdout.write(compiled+"\\nwindow.__fwThemes={THEMES,applyTheme};");'''
js=subprocess.check_output(['node','-e',compiler,TS_PATH,str(ROOT/'src/theme/themes.ts')],text=True)
html='''<!doctype html><html><head><meta charset="UTF-8"></head><body><div id="root"><div class="app-shell" style="width:1120px;height:730px;display:block">
 <div class="desktop-menubar"><span>FRAMEWORK</span><div class="desktop-menu"><button>File</button></div><div class="workspace-switcher"><button>Editing</button><button>Animation</button><button class="current" aria-pressed="true">Effects</button></div></div>
 <div class="app-header"><div class="toolbar-group"><button id="physical">◻ Selection</button><button aria-pressed="true">✦ Active</button></div></div>
 <div style="display:flex;height:550px;gap:5px"><div class="media-panel pane" style="width:250px"><div class="panel-title">PROJECT</div><div class="media-item selected"><strong>Media.mov</strong></div></div>
 <div class="viewer pane" style="flex:1"><div class="panel-title">COMPOSITION</div><div class="viewer-stage" style="height:410px"><div class="canvas-wrapper" style="width:400px;height:225px;background:#161719"></div></div></div>
 <aside class="inspector pane" style="width:300px"><div class="panel-title">INSPECTOR</div><div class="inspector-body"><div class="inspector-filter"><input placeholder="Search properties"></div><div class="inspector-section"><h4>TRANSFORM</h4><label class="field">Position <input value="12"></label></div><div class="inspector-section"><h4>EFFECTS</h4><div class="effect-control">Glow</div></div></div></aside></div>
 <div class="timeline"><div class="timeline-header">Timeline</div><div class="ruler-row">00:00:00</div><div class="track-lane"><div class="track-label">Video 1</div></div></div></div></div>
 <div class="context-menu" id="test-menu" style="left:1030px;top:350px"><button>Duplicate layer</button><button>Copy Attributes</button><button>Delete clip</button></div>
 <div class="theme-manager" style="width:250px;height:100px;position:absolute;top:610px;left:700px"><div class="theme-manager-head"><strong>THEMES</strong></div><div class="theme-card-label">Light palette</div></div></body></html>'''
def rgb(v):
 nums=re.findall(r'[\d.]+',v);return list(map(float,nums[:3]))
def luminance(color):
 a=rgb(color);a=[v/255 for v in a];a=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in a];return a[0]*.2126+a[1]*.7152+a[2]*.0722
def contrast(a,b):
 x,y=sorted([luminance(a),luminance(b)],reverse=True);return (x+.05)/(y+.05)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1260,'height':820},device_scale_factor=1)
 page.set_content(html)
 page.add_style_tag(path=str(ROOT/'src/styles/app.css'))
 page.add_style_tag(path=str(ROOT/'src/styles/refinement.css'))
 page.add_script_tag(content=js,type='module')
 page.wait_for_function('!!window.__fwThemes')
 for theme in ['default','dark','light','mono']:
  page.evaluate("theme => window.__fwThemes.applyTheme(window.__fwThemes.THEMES.find(t=>t.id===theme))",theme)
  page.wait_for_timeout(160)
  values=page.evaluate('''() => {
   const styles=q=>getComputedStyle(document.querySelector(q));
   return {button:styles('#physical').backgroundColor,buttonText:styles('#physical').color,menu:styles('#test-menu').backgroundColor,
    menuText:styles('#test-menu button').color,panel:styles('.inspector').backgroundColor,text:styles('.inspector').color,
    menuPosition:styles('#test-menu').position,menuZ:styles('#test-menu').zIndex}
  }''')
  assert values['menuPosition']=='fixed',values
  assert int(values['menuZ'])>=6000,values
  assert contrast(values['panel'],values['text'])>=4.5,(theme,values,contrast(values['panel'],values['text']))
  assert contrast(values['menu'],values['menuText'])>=4.5,(theme,values,contrast(values['menu'],values['menuText']))
  if theme=='light':
   assert luminance(values['panel'])>.6,values
   assert luminance(values['menu'])>.6,values
  else: assert luminance(values['panel'])<.3,values
  print('PASS theme',theme,'menu contrast',round(contrast(values['menu'],values['menuText']),2),'panel contrast',round(contrast(values['panel'],values['text']),2))
  if theme in ('default','light'):
   folder=ROOT/'docs/visual-test-fixtures';folder.mkdir(parents=True,exist_ok=True)
   page.screenshot(path=str(folder/f'{theme}-fixture.png'))
 page.evaluate("() => window.__fwThemes.applyTheme(window.__fwThemes.THEMES[0])")
 page.locator('#physical').scroll_into_view_if_needed()
 before=page.locator('#physical').evaluate('el=>getComputedStyle(el).transform')
 page.locator('#physical').hover()
 page.mouse.down();page.wait_for_timeout(165)
 down=page.locator('#physical').evaluate('el=>getComputedStyle(el).transform')
 page.mouse.up();page.wait_for_timeout(165)
 up=page.locator('#physical').evaluate('el=>getComputedStyle(el).transform')
 assert before!=down,(before,down)
 assert before==up,(before,up)
 print('PASS tactile button press and release',before,down,up)
 browser.close()
