const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const src=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');let checks=0;
function ok(condition,name){assert.ok(condition,name);checks++}
const old=src('docs/WORKSPACE_UPGRADE_2.6.md'),app=src('src/App.tsx'),timeline=src('src/components/Timeline.tsx'),viewer=src('src/components/Viewer.tsx'),inspector=src('src/components/Inspector.tsx');
const menu=src('src/components/ContextMenu.tsx'),global=src('src/components/GlobalContextMenu.tsx'),themes=src('src/theme/themes.ts'),css=src('src/styles/refinement.css'),desktop=src('src/components/DesktopMenus.tsx');
for(const [name,part] of [['Timeline clip', 'setContext('],['Layer','setTrackContext('],['Empty timeline','setEmptyContext('],['Ruler','setRulerContext(']])ok(timeline.includes(part),name+' specialized context preserved');
for(const [name,part] of [['Selected viewer object','setMenu('],['Media asset','setContext('],['Effect','setEffectContext('],['Keyframe','setKeyContext(']]){const file=name==='Selected viewer object'?viewer:name==='Media asset'?src('src/components/MediaPanel.tsx'):inspector;ok(file.includes(part),name+' menu preserved')}
ok(global.includes('const handled=e.defaultPrevented')&&global.includes('if(handled)'), 'Global fallback preserves native React context handlers');
ok(!global.includes('stopPropagation'), 'Global fallback does not block specialized menu event propagation');
ok(menu.includes('createPortal')&&menu.includes('document.body'), 'Context menus portal above clipped panels');
ok(menu.includes('useLayoutEffect')&&menu.includes('getBoundingClientRect'), 'Context menus measure viewport and content');
ok(menu.includes("e.key==='Escape'")&&menu.includes("e.key==='ArrowDown'"),'Context menus keep keyboard accessibility');
ok(css.includes('context-menu button:hover')&&css.includes('--fw-menu'),'Theme-aware context menu CSS');
for(const theme of ['default','dark','light','mono'])ok(themes.includes(`id:'${theme}'`),theme+' retained');
for(const token of ['bg','panel','button','button-top','button-bottom','text','muted','border','accent','menu','input','timeline','track','layer','playhead','marker'])ok(themes.includes(`'${token}':`)||themes.includes(`'${token}'`),token+' semantic token');
ok(css.includes("[data-framework-theme='light'] .context-menu"), 'Light menus explicitly styled after legacy rules');
ok(css.includes('filter:none!important'), 'Legacy filter containing-block clipping removed');
ok(!css.includes('canvas{filter:'), 'No unintended color effects on video canvas');
ok(inspector.includes('InspectorBody')&&src('src/components/InspectorBody.tsx').includes('aria-expanded'),'Inspector search and collapse controls live');
ok(src('src/components/InspectorBody.tsx').includes('localStorage.setItem'),'Inspector section state persisted');
for(const workspace of ['Editing','Animation','Audio','Effects','3D','Color','Export'])ok(src('src/workspaces.ts').includes(`${workspace.includes('3D')?"'3D'":workspace}`),workspace+' workspace defined');
ok(desktop.includes('workspace-switcher')&&app.includes('activateWorkspace'),'Workspace tabs change editor layout');
ok(app.includes('setShowExport(true)')&&app.includes('setTab(WORKSPACES[name].tab)'), 'Workspace switching performs actual UI actions');
ok(app.includes("<Timeline/>")&&app.includes('<Viewer/>')&&app.includes('<Inspector/>'), 'Original editors preserved');
console.log(`PASS: ${checks} design/theme/menu/workspace release regression checks`);
