# FRAMEWORK Studio 2.7 — Professional workspace, theme and context-menu repair

**Release classification:** Development release candidate. **Base:** FRAMEWORK Studio 2.6. **Scope:** No media engine, timeline data schema, or project-file version changes.

## What changed

### 1. Matte tactile controls and denser, theme-aware workspace

`src/styles/refinement.css` is layered *after* the existing stylesheet. It preserves the base DOM structure (media panel, composition viewer, Inspector, timeline and menu positions). It replaces the previous glossy visual emphasis with restrained charcoal gradients, well-defined black keylines, subtle insets and physical button travel of 2 pixels (115ms). Active and inactive states use the editor's existing `.active` / `aria-pressed` state. Theme-aware buttons, sliders, fields, Inspector sections, timeline headers, track labels, dialog windows and menu items use semantic color tokens. CSS `prefers-reduced-motion` disables ornamental animation.

### 2. Light theme repair and semantic tokens

`src/theme/themes.ts:applyTheme` now publishes semantic `--fw-*` variables for *all* presets including Default. The four existing built-in theme identities remain unchanged. Custom colors continue through the existing theme picker and are converted into contextual input/menu/contrast tokens. The new stylesheet overrides old hardcoded charcoal menu gradients and input colors. The previous theme-specific `filter` on editing panels has been removed because it made fixed popups clip or use the wrong containing block. The color of the composition frames is never changed by the interface theme.

For custom themes, the system uses the selected panel color's relative luminance to determine suitable text-secondary/input treatments; extremely unusual accent combinations may still require user adjustment.

### 3. Inspector controls

`InspectorBody` introduces live property search (filtering actual property sections), persistent collapse/expand by section name, Expand All and Collapse All, readable section headers and better spacing for numeric/keyframe controls. These are wrappers around the existing Inspector's *real* editing controls and preserve its handlers. The existing panel resizing continues to work. The Inspector still contains only controls supported by the selected clip's actual implementation; no fake material or 3D buttons were added.

### 4. Functional workspace presets

`workspaces.ts` defines Editing, Animation, Audio, Effects, 3D, Color and Export presets. Switching adjusts the *existing* left/right pane widths, timeline height and the media/effects/motion browser tab. Export opens the existing real export dialog. User layouts can be saved or reset via **Window**. The project is not reinitialized or discarded. Editing preserves the existing default geometry. This is a panel-layout/workflow preset system, **not** a new Blender-style 3D viewport, color scope engine, or audio mixer.

### 5. Specialized context menus restored instead of replaced

`ContextMenu.tsx` now renders its menu through a React portal to `document.body`, not through a clipped timeline/Inspector parent. It measures the actual size to constrain menus to the viewport, supports mouse/pointer input, Escape, arrow navigation, keyboard focus, disabled states and nested submenus. The global fallback menu still checks `event.defaultPrevented` and **does not call `stopPropagation`**; specialized handlers retain priority. Specialized menu event handlers for clips, tracks, blank timeline, timeline ruler, viewer objects, media items, effects and keyframes remain in their original files. The fallback menu also contains a working nested **Create track** action.

The browser's native context menu is prevented during ordinary in-editor right-clicks handled by FRAMEWORK, as in 2.6. Browser-controlled UI cannot be overridden by a website.

## Testing actually performed

- Existing 2.6 offline regression chain: **passed** (core editor, animation, motion presets, store history, source contracts and selection workflows).
- 2.7 source contract suite: **49 checks passed** for semantic tokens, specialized-menu preservation, React portal positioning, Inspector controls and workspace state.
- Chromium visual fixture test: **four built-in themes passed**; Inspector and menu contrast exceeded 4.5:1; press/release button travel measured at 2px; Light menus rendered with light materials. This is a **standalone HTML/CSS fixture**, not the entire React UI.
- Chromium engine tests: actual smooth-keyframe frame pixels, PNG export matching linear preview, Pause/audio startup race, and real OfflineAudioContext processing **passed**.
- TS/TSX syntax-transpilation of the source: **passed** (source syntax only, not a complete typecheck).
- The ZIP is checked for integrity at packaging time.

## Incomplete or unverified

- **Full npm install and React/Vite production build:** unavailable in this environment (dependency downloads unavailable); `tsc --noEmit` reports absent React, Lucide and other package/type modules, so it is not a valid complete typecheck.
- **Full interactive E2E:** Not performed against the running React app. A real user/QA pass is still required for all menu actions, docked panel resizing, tab overflow at intermediate sizes, project save/open and mobile long-press.
- **Theme audit:** Light theme and the four built-in palettes were checked on representative markup only; custom color combinations and every individual dialog still require a running-app visual pass.
- **Original 2.6 engine limits:** frame-accurate reverse video, advanced 3D meshes/textures and certain export formats remain limited or unavailable; this UI release does not claim to fix them.
- **All specialized menu actions:** Source handlers preserved; not every action was clicked in an end-to-end session because the application couldn't be built here.

## Manual release checklist (required before public launch)

1. `npm install && npm run build && npm run test && npm run test:e2e`.
2. Open a real project, confirm editing layout unchanged, switch all seven workspace tabs and restore Editing. Save/reset workspace layout and reload.
3. Inspect Default, Dark, Light, Monochrome and a Custom theme at desktop/tablet/mobile widths. Check text/icons and dialogs, including export and theme picker.
4. Right-click an existing video clip, audio clip, timeline ruler, blank timeline, layer name, keyframe, effect, image, text, shape, viewer object and media asset. Verify **specialized** commands, mouse boundary placement, submenu focus, click-away and Escape.
5. Verify browser context menu does not appear during ordinary editor use and editable inputs still support Cut/Copy/Paste and normal keyboard shortcuts.
6. Scrub, split, trim, animate, apply effects, undo/redo, save/reopen and export actual media. Visually compare the export with the preview.
7. Repeat key editing workflows on iOS Safari and Android Chromium using touch and long press. Confirm reduced motion.
8. Run a long timeline/large video memory/performance session; compare console logs and startup times against 2.6.

**Conclusion:** This build repairs specific design/theme/context-menu architecture issues, but it is not certified for public deployment without the above integration tests.
