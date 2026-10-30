# FRAMEWORK 2.5.1 — Repair audit / release-candidate report

**Base:** FRAMEWORK Studio 2.5 RC, modified in place; all original source modules, UI structure and Default theme retained.
**Purpose:** bug fixing and regression coverage, **not** a new creative-tools feature release.
**Status:** development release candidate. **NOT production-certified.**

## 1. Confirmed bugs and repairs

| ID | Found / how reproduced | Repair | Verification |
| --- | --- | --- | --- |
| QA-01 | **Smooth Keyframes OFF did not disable easing of pre-existing keyframes.** The toggle only changed the easing assigned when creating new keys. | `resolvedEase` now resolves automatic interpolation *at evaluation time*, using the selected layer's `smoothEasing` state; OFF becomes linear and ON becomes ease-in-out. `valueAt` uses this for all animated transform, opacity, audio-volume, text-intensity, and 3D properties. | 110 executable engine assertions; Chromium canvas pixels with OFF vs ON, including exported PNG sequence at the same frame. |
| QA-02 | Effect-strength keyframes and the Graph Editor used `evaluate` without the layer's Smooth setting. | Both now use `evaluate(keys, base, time, clip.smoothEasing)`. The compositor path used by preview and image-sequence export also evaluates effect keyframes with the same flag. | Engine numerical assertions, Chromium pixel regression, source-level audit. |
| QA-03 | Updating an animated effect amount overwrote its prior easing choice at that timestamp. | Existing keyframe metadata and user-selected easing are preserved when updating its value. | Code path inspected, test coverage for per-key resolution. **Full inspector interaction still untested.** |
| QA-04 | Moving layers directly in the viewer inserted ease-in-out keyframes unconditionally, ignoring the OFF setting. | Viewer-created automatic keys read `smoothEasing` and are marked `autoEase`. Inspector-generated keys follow the same scheme. | Source-level review; end-to-end pointer interaction untested. |
| QA-05 | Explicit easing selections (including F9 and motion presets) were not distinguishable from automatically generated easing. | Added **optional**, backward-compatible `manualEase`/`autoEase` keyframe metadata; explicit user choices are preserved while the global switch affects automatic keys. The interpolation dropdown displays the effective mode. | Engine tests for manual Ease Out, Hold, legacy Linear and Ease In Out; JSON save/load tests. |
| QA-06 | Graph Editor could display an eased curve even when playback was linear. | Curve generation invokes the same resolved evaluation function. | Inspected source wiring; full Graph Editor pointer UI not run. |
| QA-07 | Playback startup could race with Pause while waiting for Web Audio to initialize; a delayed `AudioContext.resume()` could restart playback. | Added a monotonic play-request token and disposed guard; older async starts are invalidated when Pause or Dispose is called. | Actual Chromium test: Play then immediate Pause leaves `isPlaying === false` after audio initialization. |
| QA-08 | Keyframe context action callback was executed twice per keyframe (including potentially stateful edits). | Call once and use the returned keyframe; no duplicate invocation. | Inspected code path / syntax checks; UI context-menu interaction untested. |
| QA-09 | Top-level startup for snapping and looping accessed `localStorage` directly and could throw in restricted browser contexts. | Preference access and writes now fail gracefully without crashing editor initialization. | Code audit and source parser; restricted-origin complete React UI untested. |
| QA-10 | Several existing verification scripts hardcoded the Linux TypeScript module path, preventing their use on Windows after `npm install`. | Scripts now use `require('typescript')` first, with the existing offline fallback only for the sandbox. | `npm run verify:audit:offline` passed here; Windows execution not available. |
| QA-11 | Undo after adding a clip left its no-longer-existing ID selected; timeline tools could remain enabled with a dangling selection. | Undo/Redo now clear selected IDs not present in the restored project. | Actual store action test reproduced the failure before the fix, then passed after it. |
| QA-12 | Continuous slider/drag transactions still serialized the entire project on every intermediate update despite grouping history. | Avoid repeated full-project JSON serialization inside active transactions; commit once on gesture end. | Source inspection and 60-update transaction store regression; no large-project benchmark. |

## 2. Tests actually executed

### Dependency-free regression checks

Command: `npm run verify:audit:offline`

- 276 previously supplied checks passed across timeline, keyed alpha, masks, effects, layering, themes, animation metadata, and source contracts. **These include source-contract checks; do not interpret 276 as 276 end-to-end interactions.**
- 110 new executable interpolation checks passed over 101 successive linear frames, automatic ON/OFF, explicit per-keyframe easing, legacy projects, motion presets, and splitting.
- All 35 application TypeScript/TSX modules parsed and transpiled via the available TypeScript compiler. **This is not equivalent to `tsc` semantic typechecking.**
- The isolated timeline/mask/snapping/motion engine modules passed an actual TypeScript strict semantic typecheck using `tsc -p tsconfig.audit.json`.
- 13 additional store-transition assertions passed with a lightweight Zustand state adapter: add/undo/redo selection, 60 continuous parameter edits grouped into one history action, autosave, loop and snapping persistence. **This is not a full React/Zustand UI test.**

### Actual Chromium rendering/engine checks

- OFF vs ON at the same composition frame changes real canvas pixels. Linear frame-20 position was 20.0px; smoothed position was 8.28125px for an 80-frame movement.
- An actual rendered PNG exported at the matching frame has the same tested pixel as the linear preview.
- 90 frames were present in that image-sequence ZIP.
- Play immediately followed by Pause does not resume after async audio setup.
- Existing browser checks passed for real media-frame compositing/effects, polygon masks, shape render, decodable WebM, browser audio graph clip gain and mute, FontFace rendering, GIF, and PNG sequences.
- Responsive CSS browser checks passed at widths 390px, 810px and 1440px. These are layout checks, not touch gesture interactions.

### Tests not completed

- `npm install` failed with `EAI_AGAIN` (DNS unavailable for npm registry).
- Consequently, a complete React/Vite production build, the application's full Playwright UI workflow, and full TS semantic typecheck could **not** be certified.
- No interactive audit of **every** button, popup, context menu, shortcut, slider, mobile gesture, all themes, every video codec/device combination, or all long-media/export scenarios was possible.
- Browser runtime tests used real Chromium Canvas/Web Audio/MediaRecorder and image codecs, but **not the fully assembled React app**.
- Custom-font database persistence was exercised in prior checks using an IndexedDB shim, not a real installed-origin persistence/restart test.
- 3D Three.js models and texture rendering were not runtime-verified in the installed React app.

## 3. Remaining risks / known limitations

1. **Release gate incomplete:** full `npm install`, `npm run typecheck`, `npm run build`, `npm test` and `npm run test:e2e` must run on a machine with dependencies, followed by manual smoke tests on Chrome/Edge, Firefox and mobile browsers.
2. **Video reverse:** seeks of HTMLVideoElement to successive reversed timestamps are asynchronous; real-time reverse/accurate frame-by-frame video output is not guaranteed in the MediaRecorder route. A decoding pipeline based on frame timestamps would be needed for guaranteed frame-accurate reverse.
3. **Video export:** MediaRecorder is real-time and may skip frames under load. A deterministic video encoder/muxer is required before claiming frame-exact professional production exports. Image-sequence exports are frame-rendered.
4. **Encoding formats:** MP4 requires an available native browser recorder; MOV, AVI, MKV, WAV and MP3 are not implemented. Do not rename WebM files as other formats.
5. **Bezier curves:** arbitrary user-defined cubic Bezier handles were not present in the 2.5 evaluator and remain unimplemented; this fix preserves the supported easing modes but does not invent curve-editor behavior.
6. **Legacy project ambiguity:** old files did not mark whether `easeInOut` was created automatically or explicitly. Their original curve data is kept; under Smooth OFF, unmarked ease-in-out keys are treated as automatic. Re-enable Smooth to restore them. Previously explicit legacy `linear` and nonstandard modes are preserved.
7. **Mobile performance and UI:** pinch zoom, pointer interactions and dialogs have not been exercised in a real phone/tablet browser as part of this audit.
8. **No claim of total absence of bugs:** this audit fixes confirmed issues; exhaustive interaction testing requires the complete application running with installed dependencies.

## 4. Manual production-release acceptance checklist

- [ ] `npm ci` (or `npm install`) succeeds and `npm run build` produces a bundle.
- [ ] `npm run typecheck`, `npm test`, and `npm run test:e2e` succeed.
- [ ] Open old `.framework` file; check text/fonts, all assets, keyframes, easing switch ON/OFF, Graph Editor and export match.
- [ ] Create/import/trim/split/ripple/reorder/undo/redo; save/reload and relink media.
- [ ] Drag animated objects and change effect amount at existing keyframes; ensure key interpolation is not overwritten.
- [ ] Play/Pause/Loop rapidly with and without audio. Validate the resulting video/audio files in an independent media player.
- [ ] Try every tool and context menu at desktop, touch tablet and phone sizes; inspect console for errors.
- [ ] Test Light/Default/Dark/Monochrome and custom themes, dialogs, text selection, and hover/focus behavior.
- [ ] Test rendering on low-memory machines with long/large projects; observe performance, dropped frames and memory retention.

## 5. How to reproduce the completed checks

```bash
npm run verify:audit:offline
npm run verify:audit:engine-types
# Requires Python + playwright + Pillow + installed Chromium:
npm run verify:audit:browser
# Existing Chromium suites:
python tools/verify-browser.py
python tools/verify-25-browser.py
python tools/verify-volume-browser.py
python tools/verify-responsive.py
```

The new `tests/audit.test.ts` is run automatically once Vitest dependencies are installed: `npm test`.
