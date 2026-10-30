# FRAMEWORK Studio 2.5 — Final Update (Development Release Candidate)

**Branch basis:** Original 2.4 React/TypeScript/Vite project. The desktop layout, default dark/orange palette, project schema and existing video/audio editing engine are retained. These changes are source-level additions to the same application, not a separate mockup.

## Newly implemented

1. **Custom font library.** In the selected text clip's Inspector choose **Import Font**. Multiple TTF, OTF, WOFF and WOFF2 files are accepted, signature/size checked (30 MB/file), and loaded by `FontFace`. Embedded family/style names are detected for ordinary OpenType files when present; WOFF/WOFF2 may use the filename. A dedicated searchable list has real font previews, favorites, recently used order, removal and missing-font warnings. Font bytes are stored in the existing local IndexedDB (`framework-studio-v1`, upgraded from version 1 to 2). Rendering/export preflight ensures required custom fonts are loaded; missing fonts block the export rather than falling back silently.
2. **Optional portable font metadata.** **File → Save portable project (licensed fonts)…** embeds only imported fonts that the user explicitly marked **Permit portable embedding**, and only when referenced by a text clip. Ordinary `.framework` saves remain small and media is still stored separately. Font licensing and redistribution permission are the user's responsibility.
3. **Loop playback.** A Repeat toggle sits beside the magnet and marker tools in the timeline. It loops playback at the composition end without changing clips; the selection persists locally.
4. **Ruler scrolling and context menu.** Wheel on the time ruler scrolls horizontally; Ctrl+wheel retains zoom. Right-click on the ruler to position the playhead, add/remove a marker at that frame, or toggle snapping/looping.
5. **Timeline + menu.** The existing layer creation menu now renders through a top-level portal with viewport clamping to avoid appearing behind the bottom timeline. Dismiss with outside click or Escape.
6. **Light theme and timeline customization.** Light-specific contrast rules for existing buttons, menus, inputs, timelines, status information and dialogs. Theme Manager adds ten separate timeline color controls with HEX/RGB/HSL picker and preset persistence. **Default intentionally retains all original 2.4 CSS.**
7. **Export workspace.** Native WebM; MP4 **only if `MediaRecorder.isTypeSupported` reports an actual supported MP4 MIME type**; frame-rendered PNG/JPEG ZIP sequences; **real GIF89a animation with global 256-color RGB332 palette, looping, LZW compression and no audio**. Configurable dimensions (144p through 4K and custom), FPS and bitrates where applicable, JPEG quality, standard social aspect-ratio presets and saved personalized presets. Timeline effects, shapes, masks, keyframes and typography are evaluated through the existing compositor; generated image/GIF frames are rendered independently. Real progress and cancellation are connected to rendering. Contextual warnings cover 4K/60, 4K/120, large GIFs/sequences, low device memory, unsupported native codecs and missing media.
8. **Existing Undo/Redo and context menus preserved.** Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z and Ctrl+Y remain mapped to the existing 60-state history; slider dragging and continuous preview gestures are grouped into one change where the existing editing engine supports transactions. Clip/track/asset/effect/preview menus remain available. Some requested universal menu contexts remain unimplemented (see below).

## Honest functional constraints

- **MOV, AVI, MKV, WAV and MP3 outputs are not implemented** and are not presented as available. GIF works but has a fixed non-adaptive 256-color RGB332 palette: it does not include audio, optimized palette sampling, transparency, or dithering. GIF timing is quantized to 1/100 second.
- `MediaRecorder` WebM/MP4 captures at real wall-clock speed and is **not guaranteed deterministic or frame-exact** for VFR sources, reverse decoding, 4K/120 FPS or all platforms. The FPS setting requests capture cadence; browsers may skip frames. Do not use for broadcast conforming without independent verification. MP4 is absent in browsers where native capture is unavailable; it is **not** a renamed WebM file.
- Source-media files are not embedded in ordinary or portable `.framework`; users must keep the original media or relink it. IndexedDB may be removed by site-data cleanup or browser storage eviction.
- Canvas2D shaders, advanced 3D, animated text and compositing retain the inherited 2.4 limitations. Imported fonts work with existing 2D text rendering/animation/effects but **full 3D text geometry does not exist**.
- The global edit history does not yet cover **every** possible UI state, e.g. browser-native text editing, theme changes or viewport zoom. No universal nested context-menu system is complete: existing clip/layer/keyframe/effects/asset/preview menus remain and ruler menu was added.
- Browser GPU, codec and memory limits vary. Very large frame sequences and GIFs currently accumulate generated frames in memory; low-end browsers can run out of memory. GIF canvas capture cannot restore transparency from unpremultiplied pixels.
- Light theme was patched in CSS but **not verified via a complete mounted React app**.

## Tests actually run in the authoring environment

- `npm run verify:offline`: 7 original core, 5 original upgrade, 118 motion/effect/mask, 25 editing, 15 release, 46 creative, and 60 new 2.5 source-contract checks = **276 checks**. The new 60 checks are **source-contract inspections**, not full UI end-to-end tests.
- Headless Chromium engine tests: 2D effects and shapes, per-character text animation and opacity, decodable WebM from real canvas pixels, imported FontFace text, 2-frame PNG ZIP decoded by Pillow/zipfile, 2-frame GIF decoded by Pillow, invalid font rejection and licensed portable font metadata.
- The browser test had to **shim IndexedDB transport**, because browser navigation to local/HTTP pages is restricted by this sandbox. The actual `FontFace`, Canvas, image/GIF encoders, and media rendering were run. **Real native IndexedDB persistence requires testing on localhost in a normal browser.** The test uses a preinstalled system font and deliberately does not redistribute it.
- All 42 TypeScript/TSX sources parsed without syntax errors, but parsing does not replace type checking.
- **`npm install`, `npm run build`, full interactive Playwright UI and cross-device/mobile tests were NOT successful or completed:** fetching package dependencies is blocked by DNS/network restrictions in the authoring environment. Accordingly **2.5 is a development release candidate, not production-certified**.

## Install and execute

Install Node.js 22.12+; extract ZIP and run `START-WINDOWS.bat` in `framework-editor`, or:

```sh
npm install
npm run dev
```

Open the local Vite address shown by the terminal. To validate before public release:

```sh
npm run build
npm test
npm run test:e2e
npm run verify:offline
```

The browser-only tests (`npm run verify:browser:25`) additionally require Python with Playwright and Pillow, and an installed Chromium binary and an available system font, currently paths specific to the authoring Linux test environment.

## Manual acceptance checklist (required before public release)

- [ ] Install dependencies and complete `npm run build` with no TypeScript errors.
- [ ] Open saved 2.4 `.framework` project and verify all existing media, timeline edits, effects and text.
- [ ] Test `Ctrl+Z`, `Ctrl+Shift+Z`, `Ctrl+Y` on clips, masks, keyframes, drags and sliders; preserve native text-field undo.
- [ ] Right-click in timeline/ruler, on layers, clips, media, effects, text and keyframes; check no menus clip behind panels.
- [ ] Import multiple TTF/OTF/WOFF/WOFF2 fonts; refresh browser, reopen project and inspect IndexedDB persistence; test re-import of missing font.
- [ ] Save portable `.framework` with font licensing opt-in, open on a separate device and verify rendering.
- [ ] Preview/export animated custom-font text with multiple effects; compare exported frames to timeline.
- [ ] Test loop playback with audio tracks and in fullscreen viewer.
- [ ] Test Light/Default/Custom themes across menus, rulers, dialogs, numeric inputs and mobile layout.
- [ ] Test frame-rendered PNG, JPEG and GIF with imported real video and an audio-backed composition; verify GIF has no audio.
- [ ] Test WebM and MP4 (where available), cancellation, warnings, native codec support and large resolutions.
- [ ] Test in Chrome/Edge/Firefox/Safari on desktop and mobile, including low-memory constraints and audio permission failures.
- [ ] Watch developer console, memory use and IndexedDB storage stability over a longer editing session.
