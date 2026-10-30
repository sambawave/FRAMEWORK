# FRAMEWORK STUDIO 2.7 — Interface & Theme Repair (development release candidate)

This update **modifies the existing FRAMEWORK 2.6 application**. The timeline, compositor, audio engine, project files, media storage, editing commands, and the existing specialized context-menu actions remain in the project. No editor engine was replaced.

**New in 2.7:** a matte skeuomorphic control finish (reference-inspired, not pixel-perfect); a centralized semantic token layer; a complete Light-theme CSS repair covering floating/portalled menus and dialogs; dedicated searchable/collapsible Inspector sections; seven panel-layout presets; and portalled context menus with correct screen-edge positioning and nested actions. Specialized timeline/clip/track/media/keyframe/effect/viewer menus remain in their original components and are not replaced by the global fallback.

Read **docs/RELEASE_NOTES_2.7.md** for implementation details, tests, limits, and the manual release acceptance checklist.

**RUN:** Install Node.js 20+; extract the ZIP; open `framework-editor`; run `npm install`, then `npm run dev` (or double-click `START-WINDOWS.bat` on Windows). Build with `npm run build`. Internet access is needed for the first dependency installation.

**Testing:** `npm run verify:release:27` runs dependency-independent assertions; `npm run verify:visual:27` runs a Chromium visual fixture check if Playwright for Python and Chromium are available; existing `npm run test` and `npm run test:e2e` require npm dependencies and a test browser. Static visual fixtures are NOT screenshots of the full React application.

**Status:** This is **not a public-production-certified build**. Full npm install, Vite build, and all interactive app/browser tests could not run here. The requested sophisticated 3D, reliable MP4 and other earlier advanced features have their previous documented limits. Do not deploy publicly without executing the application acceptance checklist.

---

# FRAMEWORK STUDIO 2.6 — WORKSPACE UPDATE

This is a source-preserving upgrade of 2.5.1. Download includes a tactile control refresh, global workspace context-menu fallback, frame-accurate keyframe buttons, configurable commands, multi-clip transformations, attribute copying and seven real Web Audio effects. See **docs/WORKSPACE_UPGRADE_2.6.md** for verified functionality, known limitations, and release blockers. The advanced 3D mesh/model and decal features are **not yet implemented**; this is not a certified production release.

# FRAMEWORK Studio 2.5 — Final Update (Development Release Candidate)

> **2.5.1 QA repair release candidate:** Preserves the FRAMEWORK 2.5 editor and project schema. Fixes Smooth Keyframes ON/OFF evaluation, Graph Editor/effect animation consistency, async playback pause race, and several reliability issues. Tested with dependency-free engine checks and real Chromium rendering tests; **full React production build and complete interactive UI remain unverified** because npm downloads failed. Read [`docs/QA_AUDIT_2.5.1.md`](docs/QA_AUDIT_2.5.1.md) for the exact bugs, checks, and remaining release blockers.


This is the **existing FRAMEWORK 2.4 source tree with targeted 2.5 modifications**, not a replacement. The default desktop design, existing editing engine and `.framework` schema are preserved.

**2.5 additions:** TTF/OTF/WOFF/WOFF2 custom fonts (FontFace + IndexedDB + opt-in licensed portable embedding), text export font preflight, Loop Playback, horizontal ruler scrolling, portal layer-creation menu, Light-theme contrast fixes, 10 extra timeline theme colors, ruler right-click menu, and actual WebM / browser-native MP4 / GIF / PNG-ZIP / JPEG-ZIP export with presets, warnings and cancellation.

**Install:** Node.js 22.12+ → extract this folder → run `START-WINDOWS.bat` or `npm install && npm run dev`. The first installation requires npm network access.

**Limitations:** MOV/AVI/MKV/MP3/WAV and deterministic native video encoding are not implemented. MP4 exists only where MediaRecorder natively supports it; GIF has limited 256-color palette/no audio. 3D and all inherited 2.4 limitations remain. `npm run build` and complete mobile/desktop UI integration tests were **not verified here** because npm downloads failed. This is **not a production-certified release**.

Full details: **[2.5 release notes](docs/RELEASE_NOTES_2.5.md)** and **[feature status](docs/FEATURE_STATUS.md)**.

---

# FRAMEWORK Studio 2.4 — Creative Tools & Themes (Development Build)

This archive **updates the original FRAMEWORK 2.3 source tree in place**. It keeps the editor's canvas + Web Audio render engine, layer timeline, existing desktop design, WebM export, project launcher, mobile layout and native `.framework` schema 1.

## New in 2.4

- **Precision slider system:** engraved-knob ranges with decimal text boxes and optional values beyond their track limits; Shift fine adjustment; double-click reset. Editor property drags form single Undo steps. Inspector values are persisted to the same project schema.
- **Linked dimensions:** width/height scale multipliers with independent X/Y keyframe channels for visual clips. Chain button locks/unlocks scaling; default keeps the original proportions. Opacity is displayed in 0–100% while the compositor still uses 0–1 internally.
- **Expandable effect controls:** actual intensity keyframes, enable/disable, order, reset, per-effect copy/paste and locally saved named presets. **Invert Colors is adjustable (0/50/100%)**, not a binary toggle.
- **Text animation:** 14 deterministic frame-based character animations (fade, typewriter, cascade, wave, float, pulse, shake, bounce, rotate, glitch, neon, zoom, flip, spiral). Editable text and per-letter overrides for position, scale, rotation, opacity, color and blur. Text can also receive the existing effect stack and keyframes.
- **GPU 3D primitive layers:** use the Timeline **+ → 3D Object** or **Layer → New GPU 3D object**. Supports 8 geometries, Three.js material color/emission/roughness/metalness, basic scene lighting, animated rotation/scale/depth and timeline layering. The WebGL result is drawn into the same canvas used for both preview and WebM export. **This is a limited GPU primitive renderer, not a Blender modeling workspace.**
- **Theme Manager:** **View → Themes…** opens the theme gallery. Default keeps the original dark gray/orange palette. Dark, Light and Monochrome are optional. Edit colors with the hue ring and saturation/value plane or HEX/RGB/HSL input; save, rename, duplicate, delete, import and export custom themes. Cancel discards the live preview; Apply persists a theme across sessions.
- **Motion easing preference:** use the 175ms switch in the Inspector to choose linear or eased interpolation for newly inserted keyframes, without destroying pre-existing custom easing curves.

## Get started

1. Install **Node.js 22.12+** and use current Chrome/Edge with hardware acceleration enabled for 3D.
2. Extract the ZIP and open its `framework-editor` folder.
3. On Windows double-click `START-WINDOWS.bat`, or run:

```bash
npm install
npm run dev
```

4. Open Vite's local URL (usually http://localhost:5173). Choose New Project or Open Project in the launcher.
5. Import real videos, audio or images; edit the timeline as before. Use the Inspector for transforms, effects, text animation and 3D materials. `examples/creative-24.framework` is a no-media example of an animated text layer over a spinning torus.

Production build and tests (internet required the first time to install dependencies):

```bash
npm run build
npm test
npm run test:e2e
```

For engine-only tests in the author's environment:

```bash
npm run verify:offline
node tools/build-browser-engine.cjs /tmp/framework-browser-test
python tools/verify-creative-browser.py
python tools/verify-release-browser.py
```

**Caution:** The authoring environment couldn't download npm dependencies, so the full React/Vite build and functional Three.js WebGL integration have not been verified here. Source-level checks, Chromium Canvas rendering and WebM regression tests passed. Please perform the production build and interactive browser tests before deploying.

Details: [2.4 release notes](docs/RELEASE_NOTES_2.4.md), [feature status](docs/FEATURE_STATUS.md), [architecture](docs/ARCHITECTURE.md). The `.framework` file saves project metadata, not embedded video/audio/image blobs; retain your original media and backups.

---

# FRAMEWORK Studio 2.3 — Public Release Upgrade Candidate

**This release modifies FRAMEWORK 2.2 in place.** It retains the existing desktop interface, `.framework` schema 1, local IndexedDB media storage, timeline, Canvas compositor, masks, effects, motion presets, and WebM export. It is a **release candidate**, not a verified production-ready public release: the complete Vite/React build and interactive mobile end-to-end testing were blocked because npm dependencies could not be fetched in this environment. See [`docs/RELEASE_NOTES_2.3.md`](docs/RELEASE_NOTES_2.3.md).

### New in 2.3

- **Live animated layer reordering:** grab the grip handle at the left of a track, drag it up/down, and release. Other track rows slide into place using a 175ms transform transition, and the compositor's real stacking order updates while dragging. Canceling a pointer gesture reverts the preview; a completed drag creates one undo history entry. Ctrl/Shift-click track names to select multiple tracks and drag them together. Touch input uses the same Pointer Events.
- **Layer + menu:** create Video, Audio, Image (select source file), Text, Shape, Solid, Adjustment, Null, or an organizational Group folder. Video/audio/image files import into the current local media library and are placed on a new dedicated track. Double-click a track name to rename, or right-click for duplicate, locking, visibility, solo, mute, color, grouping and deletion. Group folders are organizational metadata **only**, not nested compositions. **Real precomposition rendering is not implemented** and no false command is presented.
- **Real adjustment and null clips:** adjustment layers process already composited pixels beneath their track using the existing effect engine; null clips render no visible pixels. Basic solo behavior affects corresponding video and audio track types.
- **Touch-friendly workspace:** responsive viewer/library/properties tabs on phone/tablet, persistent timeline, horizontal toolstrip and menus, touch-sized controls, two-finger pinch-to-zoom timeline/viewer, and long-press context menus on clips, layers, assets and preview objects. The layout is adaptive to viewport and coarse pointer capabilities; existing editing components and project engine are shared. Smaller displays and mobile video codecs may limit usability and exporting.
- **Reliable visual details:** the former text-based `F/` logo is now a fixed SVG; unwanted browser selection is disabled on editing surfaces but retained in inputs, textareas and editable fields; reduced motion and focus outlines are supported.
- **Menus, context actions and quick settings:** real View commands toggle Grid, Guides, Rulers, Motion Paths, Masks, Layer Controls, Fit/100%/Fullscreen; File has Relink Media and Save As; inspector gains effect/keyframe right-click commands; selected layers show a compact contextual properties strip with real controls.
- **Recovery:** a prior autosave snapshot is retained periodically alongside current project metadata, and Home offers **Recover**. This is not a substitute for exporting `.framework` and backing up your source media.

### Install / run

Unzip, open the `framework-editor` folder and use Node.js 22.12+ (or 20.19+):

```bash
npm install
npm run dev
```

For a production build run `npm run build`. For installed dependencies run `npm test` and `npm run test:e2e`. For offline engine verification in the provided authoring environment run `node tools/verify-release.cjs`, then `node tools/build-browser-engine.cjs /tmp/framework-browser-test` and Python 3 + Playwright scripts (`tools/verify-release-browser.py`, `tools/verify-responsive.py`). These are NOT substitutes for browser-interaction E2E tests of the full app. Note that the offline verification scripts use the author's globally installed TypeScript and Chromium paths and may need path adjustments on other machines.

---

# FRAMEWORK Studio 2.2 — previous version editing improvements (development build)

This ZIP **upgrades the existing FRAMEWORK React/TypeScript editor**, preserving its timeline, compositor, project schema, and local media storage. It is real local-first editing software source, **not** a mockup. It does not yet have the feature completeness, performance, color accuracy or export determinism of professional desktop editors. The exact boundaries are in [docs/FEATURE_STATUS.md](docs/FEATURE_STATUS.md).

## FRAMEWORK 2.2 — six focused improvements (no redesign)

This update **modifies the FRAMEWORK 2.1 source in place**, retaining its existing project schema, timeline, canvas renderer, export pipeline, effects, mask editor, project launcher, and motion presets.

1. **Magnetic timeline:** click either magnet icon (top toolbar or timeline bar) to toggle snapping. Drag or trim near another clip edge, marker, the timeline origin or playhead to align precisely on an integer frame. The gold alignment line shows the snap. Hold **Alt** while dragging to temporarily bypass. Click **M+** in the timeline to add a marker at the current playhead. Snap distance is 9 screen pixels (minimum one frame).
2. **Clip volume:** select an **audio or video** clip, then use Inspector → **AUDIO** → the metallic horizontal volume slider (0–200%). Click the speaker button to mute/unmute the clip without losing the last gain setting. The existing gain keyframe button and numeric gain control remain. All values are stored in `.framework` and routed into the same Web Audio pipeline used for playback and WebM export. Reverse clips retain the existing limitation of no reverse audio.
3. **Shapes:** right-click the **Shape** button for a menu of ten shapes, choose one, and drag across the composition viewer to draw it. A normal left-click keeps the older behavior of inserting a standard rectangle at the playhead. Supported shapes: Rectangle, Rounded Rectangle, Circle, Ellipse, Triangle, Polygon, Star, Line, Arrow, Custom Bézier Shape. For Bézier, click points and **double-click or press Enter** to finish; **Escape** cancels. Use Inspector → Shape to change geometry, width, height, fill, outline and sides; standard transform/opacity keyframes work as before. The custom Bézier is a smoothed path through clicked points rather than a professional control-point tangent editor.
4. **Timeline zoom:** +/− buttons, logarithmic slider, Zoom to Fit, and **Ctrl+wheel** over timeline. Playhead-based button zoom and pointer-centered wheel zoom modify pixels per frame, not clip frames.
5. **Viewer zoom:** independent Fit, 25%, 50%, 100%, 200%, custom percentage field, +/− and **Ctrl+wheel** over the preview. **Middle-button drag** pans the scrollable viewport. All viewport scaling is via CSS dimensions; **export resolution and layer transforms never change**.
6. **Fullscreen preview:** the composition panel's fullscreen control enlarges the **entire viewer including playback controls**; pressing Escape or the exit button restores the existing layout.

The six changes reuse the existing audio engine, timeline state and shared compositor so preview and export apply the same image and audio parameters. New shape coordinates, outlines, clip mute, gain, and timeline markers persist in the existing `.framework` format.

## Run the editor

Requires Node.js **22.12+** or Node 20.19+, npm, and latest Chrome or Edge. Installation requires internet to download dependencies the first time. Extract the ZIP to a normal writable folder.

**Windows:** double-click `START-WINDOWS.bat` or run:

```powershell
npm install
npm run dev
```

Open the Vite local address (normally http://localhost:5173). To build locally:

```powershell
npm run build
npm run preview
```

Tests (after `npm install`):

```powershell
npm test
npx playwright install chromium
npm run test:e2e
```

`npm run test:e2e` also requires FFmpeg/FFprobe in `PATH` (see original E2E test). There are dependency-free engine checks `node tools/verify-core.cjs`, `node tools/verify-upgrade.cjs` and `node tools/verify-pro.cjs` in the authoring environment where global TypeScript is installed. Full app build/E2E was **not performed here** due npm download failure. Engine TypeScript strict typecheck, 130 smoke assertions, and headless Chromium actual Canvas + WebM test passed.

## Workflow

1. Choose **New Project** in the launcher, set dimensions/FPS and a project name, or open a recent/`.framework` file.
2. Import footage/audio/images using **Import** or drag files into the Project panel. Source media bytes remain on your device in IndexedDB.
3. Drag media onto compatible timeline tracks. Drag a clip body to move, drag an edge to trim, press **S** to split, **Shift+Delete** for ripple delete, **Ctrl+D** to duplicate. Click a clip to select it.
4. Use the preview handles to move, scale and rotate layers or numeric controls in the Inspector. Use **F9** for Easy Ease.
5. Open **Motion** in the left panel. Choose duration, intensity, direction and easing, select a visible layer, click a motion preset: this inserts **real editable keyframes**. Save custom settings with the preset bookmark button. The typewriter preset is enabled on text layers only.
6. For manual foreground isolation choose **Polygon** in the selected layer's Inspector. Select the **Mask Tool** from the toolbar, drag orange vertices or click inside the layer to add them. Alt-click a vertex to remove it. Enable mask animation, seek a new frame and adjust vertices to write animated path keyframes. Use **Invert** to punch out the selected region instead.
7. Add effects from **Effects** and tweak them in the Inspector. Diamond next to effect strength creates a **real effect keyframe**. Chroma Key has tolerance/softness/spill and an eyedropper tool.
8. Audio files display waveforms after decoding. Gain, pan and fade controls affect live playback and the recorded audio mix.
9. **Export** offers real-time local **WebM** (browser codec availability) with adjustable bitrate, or a **PNG still of the current composition preview**. Keep browser tab foreground during render. The recording reflects the timeline compositor; it does **not** render original media unchanged.
10. Ctrl+S downloads `.framework` metadata. The app also stores recent project state locally. To move projects between machines, back up all original source media and relink through the folder button.

Two no-media examples are in `examples/animated-intro.framework` and `examples/motion-showcase.framework`. Open it from the home screen for an immediate composition. If you want a project to share with somebody else, send the original video/audio/image files alongside its `.framework` metadata, not just the JSON.

## Architecture

```
src/
  App.tsx                     menus, toolstrip, layout, WebM/PNG export dialogs
  types.ts                   versioned project, clip, track, effect/keyframe models
  store.ts                   Zustand commands, persistence and undo history
  engine/
    timeline.ts              frame-based cuts/trim/ripple/easing and remapping
    snapping.ts              frame-accurate clip edge, marker and playhead snapping
    shapes.ts                10 shared Canvas shape path generators
    compositor.ts            shared Canvas rendering for preview + WebM
    pixelEffects.ts          actual RGBA processing (vignette, grain, RGB split...)
    masks.ts                 polygon paths and time interpolation
    motionPresets.ts         18 named animation-to-keyframe generators
    waveform.ts              downsampled decoded PCM peak analysis
    playback.ts              audio routing, playback, video recording
  storage/
    db.ts                    IndexedDB binary media, autosave, blob downloading
    projects.ts              launcher project metadata
  components/
    Home.tsx                 project manager
    DesktopMenus.tsx         desktop action menus
    MediaPanel.tsx           project/effects/motion browsers + asset relinking
    MotionPresets.tsx        parameterized motion presets UI
    Timeline.tsx             clips/tracks/ruler/drag, snapping, markers, zoom and audio waveform
    Viewer.tsx               direct manipulation, mask handles, shape drawing, independent viewer zoom and fullscreen
    Inspector.tsx            properties, per-clip audio/video gain slider, shapes and masks
    GraphEditor.tsx          interactive value curves
  styles/app.css             professional dark-gray panel controls
```

No media is uploaded to the cloud by this app. Note that when running Vite on localhost, browser storage is origin-specific (`localhost:5173` differs from another port). Store media separately as a backup. See `docs/ARCHITECTURE.md` for the original engine design and `docs/FEATURE_STATUS.md` for unimplemented advanced requirements.

## Verification of 2.2 changes

When dependencies are installed, run `npm run build`, `npm test` and `npm run test:e2e`. Source-only checks can run without npm packages by running `node tools/verify-final.cjs` (requires the global TypeScript compiler path used by this repository's existing test scripts). In this author's environment the following checks passed:

- Existing core smoke tests: 7 checks; upgrade tests: 5 checks; professional feature tests: 118 checks.
- New snapping, shape and project field checks: 25 checks.
- Real Chromium canvas test: shapes render, no-media WebM file is recorded and persists.
- Real Chromium Web Audio test: both audio and video clip gains change, mute sets gain to zero, and unmute restores gain.
- Existing real Chromium engine test: generated video is recorded and reimported; pixel effects change decoded frames.

**Not verified here:** a full `npm run build`, React UI end-to-end automation, and a full real-footage AV export after editing; package installation was blocked by offline npm registry DNS. The included source and Vitest/UI E2E tests are available for local verification. Do not rely on this developmental editor for irreplaceable source footage without backup.
