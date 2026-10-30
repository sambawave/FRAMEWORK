/* Dependency-free regression assertions for FRAMEWORK 2.5 changes.
 * These are source-contract checks; actual pixel, GIF and FontFace operations
 * are separately tested in Chromium (verify-25-browser.py). */
const fs=require('fs'),assert=require('node:assert/strict'),root='src/';
const read=(p)=>fs.readFileSync(root+p,'utf8');let total=0;
function check(ok,msg){assert.ok(ok,msg);total++}
const font=read('fonts/fontLibrary.ts'),manager=read('components/FontManager.tsx');
for(const ext of ['ttf','otf','woff','woff2'])check(font.includes(`'${ext}'`),'missing '+ext+' validator');
for(const symbol of ['FontFace','document.fonts.ready','indexedDB.open','listFonts','importFonts','ensureProjectFonts','portableFonts','restorePortableFonts','licenseEmbed'])check(font.includes(symbol),'missing font pipeline '+symbol);
for(const name of ['Import Font','Custom Fonts','font-sample','font-search','MISSING','removeFont','favorite'])check(manager.includes(name),'missing font selector '+name);
const playback=read('engine/playback.ts'),sequence=read('engine/sequenceExport.ts'),timeline=read('components/Timeline.tsx'),theme=read('theme/themes.ts'),app=read('App.tsx'),css=read('styles/app.css');
for(const part of ['setLoop(enabled:boolean)','this.loopPlayback','this.startFrame=0','this.startedAt=performance.now()'])check(playback.includes(part),'loop missing '+part);
for(const part of ['rulerContext','onContextMenu','scrollLeft','wheel.ctrlKey','layer-create-portal','createPortal'])check(timeline.includes(part),'timeline missing '+part);
for(const part of ['gifPalette','gifLzw','gifFrame','GIF89a','image/gif','zipStored','drawComposition','ensureProjectFonts'])check(sequence.includes(part),'sequence missing '+part);
for(const part of ['timelineBackground','trackBackground','layerHeaders','timelineRuler','clipBackground','selectedClip','trackSeparators','playhead','markers','timelineToolbar'])check(theme.includes(part),'theme missing '+part);
for(const part of ['GIF animation','MP4 (native encoder)','Export format','Export frame rate','Video bitrate','PNG sequence ZIP','JPEG sequence ZIP','Save preset','fontLibrary'])check(app.includes(part),'export UI missing '+part);
for(const part of ['data-framework-theme="light"','theme-timelineBackground','layer-create-portal'])check(css.includes(part),'theme CSS missing '+part);
console.log(`PASS: ${total} 2.5 source-contract assertions (functional tests run separately in Chromium)`);
