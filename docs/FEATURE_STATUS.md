# FRAMEWORK 2.5 — updated feature status

| Requirement | Status | Notes |
|---|---|---|
| Undo/Redo keyboard/menu | Existing, retained and strengthened | Zustand snapshot/transaction history; not every UI setting is history-tracked |
| Context menus | Partial, extended | Existing clip/layer/effect/keyframe/asset/preview menus; ruler marker/playhead/snapping/loop menu added; not truly universal |
| Loop playback | Implemented in source | Engine restarts timeline timebase and media seeking at end |
| Light theme contrast | Updated CSS, unverified full UI | 2.4 Default theme CSS unchanged |
| Timeline custom color tokens | Implemented in source | Ten new palette properties saved in existing theme presets |
| Timeline ruler wheel horizontal | Implemented in source | Ctrl+wheel retains zoom; clip tracks synchronized |
| Timeline layer + menu clipping | Implemented in source | Body portal, fixed viewport coordinates, outside/Escape close |
| Custom font importing | Implemented, partial runtime verification | Actual FontFace+Canvas tested; native IndexedDB end-to-end blocked by test sandbox |
| Font persistence and portable export | Implemented in source | IndexedDB v2 stores bytes; font bytes embedded only with user’s licensing opt-in |
| WebM export | Existing, browser regression passed | Actual canvas MediaRecorder output; real-time pacing |
| MP4 export | Conditional | Only shown if native MediaRecorder.isTypeSupported returns an actual MP4 MIME |
| GIF export | Implemented, browser decoded | RGB332 palette, LZW, looping, no audio/dithering, fixed palette |
| PNG/JPEG sequence ZIP | Implemented; PNG verified | Real frame-by-frame compositor; cancellation and ZIP packaging |
| MOV/AVI/MKV/MP3/WAV export | Not implemented | Never presented as functional or renamed files |
| Export presets/warnings | Implemented in source | Social/master/small/GIF, custom presets, codec/4K/memory warnings |
| Public production release | Not certified | npm registry blocked; full `npm run build`, full UI/mobile E2E not run |

See [2.5 release notes](RELEASE_NOTES_2.5.md) for exact tests, known issues and manual acceptance checklist. Past release status is retained below for history.

---

# FRAMEWORK 2.4 — Latest implementation status

For this update's supported features, tested paths and known gaps, see [RELEASE_NOTES_2.4.md](RELEASE_NOTES_2.4.md). **2.4 remains a development build, not a finished professional suite.** Existing `.framework` schema 1 is preserved, and the Default desktop theme remains unchanged.

---

# FRAMEWORK 2.3 — release candidate status

The 2.3 work is a **scoped upgrade of 2.2**, not a new editor. The original `.framework` schema and saved project compatibility remain intact; new `Track` fields are optional.

| Feature | State | Verification |
|---|---|---|
| Live reordering with animated row shifts and undo history | Implemented in source; track list updates the actual renderer while dragging | Pure reorder tests + Chromium stacking pixel checks; full UI drag test pending |
| Multi-track selection and drag | Implemented Ctrl/Shift-click / pointer drag | Stable selection algorithm test; touch gesture E2E pending |
| Layer creation/rename/colors/solo/lock/mute | Implemented in source, group is an organizational folder | Source/parser checks; Chromium solo/visibility pixels |
| Adjustment layers and null objects | Basic functioning implementation | Chromium pixel tests, WebM export regression |
| Precompositions and nested groups | Not implemented | No fake operational control |
| Mobile responsive library/viewer/inspector/timeline | Implemented in CSS/React with shared engine | Chromium responsive-layout checks (390/810/1440px); full functional mobile testing pending |
| Touch pinch/drag and long press | Implemented in source | Gesture interaction E2E remains pending |
| SVG logo | Implemented | Source parsing, static layout |
| Browser text selection protection | Implemented with editable input exceptions | CSS review; interactive copy/paste accessibility test pending |
| View toggles, rulers, motion paths, quick toolbar | Implemented, viewport-only | Source parser checks; live UI checks pending |
| Effect and keyframe right-click commands | Implemented in inspector | Source parser; UI E2E pending |
| Recovery snapshot / launcher recovery | Implemented localStorage previous-snapshot backup | Basic persistence checks; quota and crash tests pending |
| Export | Existing WebM and PNG render pipeline retained | Actual nonempty WebM canvas browser test; mobile encoder compatibility unverified |

**Not ready to promise as production quality:** full mobile gesture interoperability; completed cross-browser QA and accessibility audit; autosave histories beyond previous snapshot; full compositing precompositions; custom shortcut editor; MP4/GIF/publishing export presets; GL acceleration; fully reliable audio/video synchronization and frame-exact export. The app should be tested with user media on real devices before public launch.

---

# FRAMEWORK 2.2 — scoped editing changes

**Base:** FRAMEWORK 2.1 source. This release deliberately does not implement the previously unbuilt professional features.

## New / modified

| Feature | Implementation | Test coverage |
|---|---|---|
| Magnetic timeline snapping | Integer-frame snap to playhead, 0, project markers and clip start/end for dragging + both trim edges; visible gold guide; Alt override + magnet toggle | Pure engine checks |
| Per-clip audio/video volume | Inspector 0–200% metallic slider, mute/restore, volume keyframe numeric control retained; same Web Audio graph for playback and WebM capture | Real Chromium AudioContext gains and JSON round trip |
| Ten shapes | Right-click Shape dropdown; drag-to-draw; Bézier point clicks/Enter/double-click; persistent shape dimensions, fill/stroke, corners; same shapePath canvas drawing in preview/export | Ten geometry checks + Chromium pixel checks |
| Timeline zoom | Slider, +/−, fit, Ctrl-wheel, anchored scroll | Syntax/source checks; manual UI check pending |
| Composition zoom | Independent fit, presets, custom %, +/−, Ctrl-wheel, middle-pan; CSS-only | Syntax/source checks; manual UI check pending |
| Fullscreen viewer | Fullscreen entire composition pane with active transport controls; Escape native fullscreen exit | Syntax/source checks; manual UI check pending |

**Limitations:** custom Bézier smooth path does not expose explicit tangent editing. Draw tools create basic shape paths, not a full vector authoring suite. Zoom anchoring depends on browser layout and should be exercised manually at multiple window sizes. Volume is browser Web Audio gain (0–200% linear), not loudness normalization. Reverse video audio remains muted (pre-existing). WebM export remains real-time rather than offline deterministic.

**Build verification:** npm install/production build and full React E2E not completed in this runtime because npm registry access failed; browser engine tests are separate from full UI tests.

---

# FRAMEWORK Studio 2.1 — feature status

**Honest status:** This is an incremental upgrade to the original React project, **not** a completed After Effects/Premiere/Resolve/Blender competitor. Source and engine smoke tests passed; the complete React + Vite production build and full app end-to-end test could not be executed here because npm package fetching was unavailable. The browser engine's canvas and WebM output were independently exercised in headless Chromium.

## Working implementation paths

| Feature | Status | Notes |
|---|---|---|
| Dark professional desktop-styled workspace | Implemented in source | Menubar, dimensional FL Studio-style controls, two side splitters, bottom timeline splitter, persistent dimensions |
| Project launcher | Implemented in source | Local recent projects, create with sizes/FPS/color, rename, duplicate, delete metadata (not blobs), open file, autosave/recovery metadata |
| Video/image/audio/GIF import | Implemented in source | Browser decoded, media bytes saved in IndexedDB and relinkable, local-only |
| Timeline editing | Partial | Multiple A/V tracks, trim, split, move, duplicate, ripple delete, undo/redo, audio mute/video visibility, locks, seek, zoom, drag effects |
| Timeline audio waveform | Implemented in source | Real downsampled decoded PCM for imported audio files (not movie audio), cached in-memory |
| Composition viewer | Partial | Real Canvas frames, select/move/scale/rotate, handles, grid, safe areas, fullscreen, fit, eyedropper |
| Keyframes + motion presets | Partial | 18 editable animation presets (text typewriter exclusive to text), deterministic evaluators, F9 easing, value graph; no custom Bézier tangent handles |
| Effects | Partial | 19 actual Canvas CSS/pixel effects, ordering, toggles, effect amount keyframing (including chroma), input sliders. No GL shader stack or color management |
| Chroma key | Partial | Actual transparent RGBA pixels, key color, tolerance, softness, spill, picker; CPU effect may be slow for large footage |
| Polygon rotoscope | Partial | Manual polygon vertices in viewer, inverse alpha, path-keyframe interpolation; **not** full Bézier, AI segmentation, mask feathering or automatic tracking |
| Audio editing | Partial | Multi-track source audio, gain/pan, timeline fades, waveform; no equalizer/compressor/beat grid |
| Reverse/speed | Partial | Source seek mapping for reverse (reverse audio muted), constant rate speed and duration; no optical flow or speed-ramp curves; browser seeking may miss frames |
| Preview/export common rendering | Implemented in source | Both use `drawComposition`; WebM uses canvas capture + Web Audio, progress/cancel, adjustable video bitrate. Export current preview as PNG |
| Project saving | Implemented in source | `.framework` JSON, local recent project versions, metadata persistence, media relinking. **Not** portable all-in-one media packages |

## Not completed / not exposed as functional

- Advanced docking/undocking, floating windows, multi-selection and group editing.
- Ripple/rolling/slip/slide all together (only ripple delete currently), linked clips, precompositions and full nested sequences.
- Automatic transitions, speed ramps, time-remapped audio, true frame-accurate reverse decoding, proxy editing, GPU accelerated effect shaders.
- Bezier mask drawing, feathering, motion tracking, auto roto/AI object segmentation and camera stabilization.
- Professional curves/scopes/LUTs, node compositing, arbitrary fonts, 3D cameras, editable Bézier graph handles.
- MP4/MOV/GIF/WAV/MP3 rendering, image sequences, offline deterministic encoding, true render queue or reliable real-time 4K.
- Audio effects beyond gain/pan/fades and waveform, BPM/transient detection and audio-reactive animation.

## Tests

- `node tools/verify-core.cjs`: legacy 7 assertions (passed).
- `node tools/verify-upgrade.cjs`: reverse/ease/chroma checks (passed).
- `node tools/verify-pro.cjs`: 118 checks (passed) covering preset generation, animated paths, effect pixels, PCM peaks and ripple operations.
- Browser-only renderer test (`tools/verify-browser.py`): headless Chromium verified red canvas, real inversion, polygon clipping, mask interpolation, grain, RGB split, pixelation, motion keys, and **nonempty decodable real WebM export**, then re-imported the produced video blob and verified the inversion effect changed decoded source pixels.
- `npm test`, `npm run build`, and full UI Playwright E2E: provided but **not run in the authoring environment** (npm registry access blocked). Run these locally before using the app for important footage.

## Limitations and known edge cases

- Browser `MediaRecorder` records at real wall-clock speed; render speed and A/V precision can be affected by headless/background playback, browser tab throttling, GPU load and codec seeking.
- Source time is based on integer frames at project FPS but browser decoders may seek to neighboring source frames, especially VFR footage. Do not assume broadcast conform accuracy.
- CPU pixel effects and chroma process canvas pixels; 4K multi-layer heavy effects may stutter. Limited scratch-buffer reuse is implemented, not a worker/GPU pipeline.
- Native `.framework` documents contain media IDs, not embedded source files. Browser storage eviction and switching machines can put assets offline; relink with matching filenames.
- The home screen local persistence uses localStorage metadata; clearing site data clears both metadata and IndexedDB media.
- Headless Chromium browser tests do not substitute for a full manual interactive editor validation.
