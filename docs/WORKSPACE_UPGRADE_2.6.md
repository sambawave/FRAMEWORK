# FRAMEWORK Studio 2.6 — Workspace Upgrade (Development RC)

This version is a **patch of FRAMEWORK 2.5.1**. The project schema remains `schema: 1`, the existing media IDs/IndexedDB storage are untouched, and the Canvas/Web Audio/WebM editing pipeline remains in place. No feature has been intentionally removed.

## Implemented in this update

### Tactile interface
- Added CSS-based charcoal surface/bevel styling to the major editor control families; 125 ms button press travel, inset contact shadows, warm copper active buttons, recessed numeric inputs, and floating-menu opening animation.
- Applied reduced-motion media-query fallback. Existing panel arrangement, sizes, positions, timelines, and alternate theme manager are preserved.
- **This is a design approximation of the supplied images**, not an exact pixel-for-pixel Figma implementation.

### Context menus
- Added global document-level `contextmenu` prevention **within the app**, honoring existing specialist Timeline, Inspector, Viewer and Media context menus first.
- Unknown areas open a general FRAMEWORK action menu; text controls receive Cut, Copy, Paste, Select All actions. Native browser-controlled chrome cannot be replaced by a page.
- Existing long-press object/track menus preserved, with a fallback long-press menu for other touch surfaces. Keyboard navigation and Escape handling enhanced.
- Some browser clipboard APIs require a secure context or explicit user permission; fallback text entry is offered if reading the clipboard fails.

### Keyframes and workflow
- Per-property previous / next frame-exact keyframe navigation buttons added alongside the existing diamonds, plus exact-frame selection in inspector and selected-point highlighting in the graph.
- Shortcut registry includes ~40 editing/navigation commands, command palette, searchable shortcut editor, recording, conflict validation, reset, JSON import/export and persistent preferences. Reserved browser shortcuts are rejected; input editing keys remain native.
- Existing automatic smoothing evaluator was not replaced: Smooth OFF yields linear automatic interpolation; explicitly assigned Bézier/easing modes remain explicit.
- **Context conflict:** `K` stops playback; `Shift+K` adds a position keyframe. These two functions cannot both be bound to plain `K` in the same editing context.

### Attributes and multiselection
- `Ctrl`+click clips toggles selection, `Shift`+click selects time-ordered ranges within a track.
- Added attribute-copy/paste dialog with selectable categories. Supports transform, effects, animation, text styling, 3D primitive material metadata, audio settings and masks where compatible. Media links, source trim, clip ID and timeline positioning are not copied. Optional merge and relative-keyframe timing supported.
- Selected clips can be moved together on the timeline, duplicated, deleted, and receive common base transforms. In the Viewer, multi-object moves/scales/rotations update real project transforms via one preview batch and a single history commit. Multi-clip selection survives clicks on already-selected items.
- Full freeform rectangular marquee selection and grouped 3D mesh edits are **not** implemented.

### Web Audio
- Added a real AudioContext effect chain to each audio/video clip (`audioEffects`), with a chain inspector, reordering, enable/disable, removal and parameter adjustment.
- Seven Web Audio processors are supported: low-pass filter, high-pass filter, band-pass filter, dynamics compressor, waveshaper distortion, wet/dry echo delay and LFO tremolo. They operate before the existing per-clip gain/pan/fade nodes.
- Effect chains are rebuilt safely on parameter changes, and the existing `PlaybackEngine` is used for audio capture during WebM export. Audio waveform extraction from real decoded PCM remains unchanged.
- These 7 processors do not constitute the full 20+ requested effect library. They have basic intensity controls, not full multi-parameter automation.

## Testing actually executed

- `npm run verify:audit:offline`: original core, upgrade, animation, mask, theme, waveform, persistence and store tests passed. These include **source-contract checks**, not only functional tests.
- `node tools/verify-26.cjs`: 25 executable checks of attribute preservation, relative keyframes, multi-selection, editing history and shortcut conflict detection.
- `python tools/verify-26-browser.py`: Chromium OfflineAudioContext produced actual PCM whose RMS differed appropriately under filter, compression-style distortion, tremolo and delay paths. No simulated sample data.
- `python tools/verify-audit-browser.py`: Chromium Canvas pixels changed under keyframe smoothing ON vs OFF; a PNG frame ZIP matched the linear preview; pending audio play was correctly aborted by pause.
- `tsc -p tsconfig.audit.json`: the isolated timeline/engine subset typechecked.
- **Not verified:** complete Vite/React production build and full app Playwright interaction suite. npm dependencies were unavailable in the sandbox. UI touch interactions and macOS Safari/Firefox were not tested.

## Existing features preserved and limitations

- Prior project files should continue to load because only optional clip metadata (`audioEffects`) was added. Native media remains stored in the existing IndexedDB scheme. Older clips without that field play unchanged.
- Full 3D model hierarchies, vertex/edge/face modeling, per-face cube textures, user decals, model ungroup baking, independent child bone animation, pitch shifting, advanced EQ/reverb, advanced animated effect automation, waveform channel splitting and perfect full project export parity remain incomplete or unverified. No dummy buttons were added to claim these features.
- Full app build and interaction verification are **release blockers** before public certification. 3D runtime still depends on actual installed Three.js, which was not available for integrated testing here.

## How to test and build

```sh
npm install
npm run typecheck
npm run build
npm run test
npm run test:e2e
npm run verify:workspace
npm run verify:workspace:browser
```

For browser tests on Linux, `/usr/bin/chromium` is used by the standalone Python checks. The complete app's Playwright setup may require `npx playwright install`.

## Suggested manual release acceptance path

1. Create a project, import audio and video, save/reopen, confirm media relinking.
2. Add two shapes, select both with Ctrl, move together and Undo/Redo.
3. Animate position with two keyframes, navigate with property arrows, toggle Smooth and confirm preview/export match.
4. Copy transforms and effects to another compatible clip using the attribute dialog; verify the source media and original timing remain intact.
5. Import an audio clip, enable LPF and tremolo, listen to playback and compare rendered WebM audio.
6. Right-click top toolbar, blank viewer, timeline clips, inputs, effects and project assets; confirm specialist and fallback menus.
7. Open the palette with Ctrl/Cmd+Shift+P and edit shortcuts; confirm browser reserved shortcuts remain unaffected.
8. Test Default/Dark/Light/Monochrome themes and mobile layout with touch input.
