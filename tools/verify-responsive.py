#!/usr/bin/env python3
"""CSS breakpoint/layout checks for desktop, narrow phone, and tablet; not full React E2E."""
from playwright.sync_api import sync_playwright
from pathlib import Path
css=Path('src/styles/app.css').read_text()
markup='''<div class="app-shell" data-mobile-panel="preview" style="--timeline-h:240px;--left-w:270px;--right-w:300px">
 <nav class="desktop-menubar"><div class="desktop-menu"><button>File</button></div></nav>
 <header class="app-header"></header>
 <div class="workspace"><aside class="media-panel pane"></aside><div class="vertical-divider"></div><section class="viewer pane"></section><div class="vertical-divider"></div><aside class="inspector pane"></aside></div>
 <div class="horizontal-divider"></div><section class="timeline pane"></section>
 <nav class="mobile-navigation"><button>Library</button><button>Preview</button></nav><footer class="status-bar"></footer>
 </div>'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 try:
  for width,height,touch in [(390,844,True),(810,1080,True),(1440,900,False)]:
   page=browser.new_page(viewport={'width':width,'height':height},has_touch=touch,is_mobile=touch)
   page.set_content('<meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style>'+markup)
   data=page.evaluate('''()=>{const el=s=>document.querySelector(s),style=s=>getComputedStyle(el(s)),b=s=>el(s).getBoundingClientRect();return {nav:style('.mobile-navigation').display,media:style('.media-panel').display,viewer:style('.viewer').display,timelineH:b('.timeline').height,viewportH:innerHeight,appH:b('.app-shell').height,appW:b('.app-shell').width}}''')
   print(width,data)
   if touch:
    assert data['nav']!='none' and data['viewer']!='none' and data['media']=='none',data
    page.eval_on_selector('.app-shell',"el=>el.dataset.mobilePanel='media'")
    changed=page.evaluate("()=>[getComputedStyle(document.querySelector('.media-panel')).display,getComputedStyle(document.querySelector('.viewer')).display]")
    assert changed[0]!='none' and changed[1]=='none',changed
   else: assert data['nav']=='none' and data['viewer']!='none' and data['media']!='none',data
   assert 100<data['timelineH']<height*.7
   page.close()
  print('PASS: responsive desktop, phone, tablet CSS panel switching and timeline dimensions')
 finally:browser.close()
