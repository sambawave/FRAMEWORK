# FRAMEWORK Studio 2.4 — Creative Tools Update

**Development release, not a certified professional or production-ready suite.** This is an in-place extension of 2.3 RC. The existing `schema:1` `.framework` format, responsive workspace, layer/timeline engine, audio mixer, masks, effects, motion presets, IndexedDB assets and WebM pipeline are retained. Old clip documents are supported because all new fields are optional.

## Implemented

| Area | Functional path | Caveats |
|---|---|---|
| Precision sliders | `ProSlider.tsx` gives range drag, engraved knob, editable decimal numeric entry with intermediate valid typing states, Shift fine adjustment, double-click reset and user-defined units | Numeric edits beyond the slider range are accepted; downstream validation depends on the property. Not all legacy numeric controls are sliders. |
| Slider undo grouping | Inspector slider drag begins a project transaction; changes update preview during movement; pointer release commits one Undo/Redo step and autosaves once | Numeric field commits remain individual edits. |
| Linked dimensions | `Transform.scaleX` and `.scaleY` default to 1 on old projects, scale actual composition contents, have independent keyframe channels; linked mode writes both scales together | Existing on-canvas resize handles continue to use uniform scale; no pixel-dimension constraint solver. |
| Universal opacity | 0–100% Inspector property for all rendered visible clips, including generated text, 3D, media and shapes; stored internally as 0–1 | Organizational groups and unimplemented precompositions do not have composited group opacity. |
| Effects panel | Expand/collapse, amount slider+numeric, amount keyframes, reorder, enable/disable, remove, duplicate, copy/paste, reset to effect defaults, save/apply named local effect presets | Detailed controls remain type-specific (Chroma tolerance/softness/spill); this is NOT a fully general parameter graph for every effect. |
| Inversion strength | 0%=original, 50%=intermediate, 100%=inverted using real Canvas filters | Out-of-range numeric values may be browser-clamped. |
| Easing preference | Animated 175ms switch chooses linear vs Ease In Out for **new** keyframes, without modifying old/custom curves | It deliberately does not rewrite existing graph curves when toggled. Easy Ease (F9) still applies explicitly. |
| Theme gallery | View → Themes with Default, Dark, Light, Monochrome, live preview, custom swatches, accent/button/highlight/background/panel/text/border/tint, brightness/contrast/shadow controls, rename/save/duplicate/delete and `.fwtheme.json` import/export | Dark/Light/Monochrome use UI CSS overrides; some legacy isolated colors still use hardcoded values. Default has no overrides, preserving its prior appearance. |
| RGB picker | Draggable hue ring, saturation/brightness square, HEX/RGB/HSL fields, live preview, Apply/Cancel, outside click, Escape | No eye-dropper in theme picker. |
| Text animation | 14 deterministic procedural character presets, adjustable frame duration, letter delay, intensity, loop; per-character position/rotation/scale/opacity/color/blur overrides; text remains editable | Text intensity supports timeline keyframes. Duration/delay/character overrides are persistent but not all separately keyframeable. Range/Wiggly selectors, 3D text extrusions and glyph Bézier controls are not included. |
| Three.js GPU primitives | Cubes, spheres, cylinders, cones, planes, tori, pyramids and capsules through a lazy-loaded WebGL renderer, with animated X/Y/Z rotation, depth, axis scale, roughness, metalness, key light and emission | Requires Three.js npm install and device WebGL. Shared 2D compositor samples the WebGL canvas for preview/export. Not full Blender-style modeling or full 3D world/camera tools. |
| Project compatibility | 2.4 `.framework` files contain optional `textAnimation`, `characters`, `three`, `scaleX/Y`, `lockAspect`, and keyframes. Previous files still validate. | Loading a *new* project in an *older* release is not guaranteed to preserve newly introduced fields. |

## Still not implemented

- **3D modeling**: vertex/edge/face selection, extrude, bevel, inset, merge, gizmo manipulators, custom meshes, GLB/GLTF/OBJ/STL imports, video/image face textures, 3D text, scene camera rigs, accurate soft shadows and geometry editing.
- **Text**: true Range/Wiggly/Random Selectors, fully independent animated text character curves, text extrusions and sophisticated path-based character tracking.
- **General animation**: Bézier graph tangent editing and keyframes for every possible numeric or color parameter. The graph editor supports the numeric channels listed in `types.ts`.
- **Effect controls**: separate glow speed/mix/threshold, per-effect opacity/blend, full multi-param keyframing and an extensible GPU shader effect pipeline. Existing CPU/Canvas effects are retained.
- **Theme UX**: pixel-perfect restyling of every hardcoded legacy color and native OS popup; Theme Manager is the new floating dialog with undoable Cancel, not a wholesale dialog/window manager rewrite.
- **Export**: native MP4/GIF output, frame-exact offline encode, guaranteed real-time 4K/multi-GPU operation. Browser WebM remains real-time.

## Testing performed in the authoring environment

- `npm run verify:offline`: 7 core + 5 legacy upgrade + 118 motion/mask/effect + 25 editing + 15 release + **46 creative feature** deterministic checks passed. These include HEX/RGB/HSL/HSV conversion, theme validation/persistence, source parsing, text animation frame evaluation, inversion strength, 3D metadata and keyframes.
- `node tools/build-browser-engine.cjs /tmp/framework-browser-test` then `python tools/verify-creative-browser.py`: headless Chromium **real Canvas pixels** verified text fade, independent 2D axes, inversion at 50% and opacity automation.
- `python tools/verify-release-browser.py`: headless Chromium confirms compositing stack reorder, solo/visibility, adjustment layer pixels and a **nonempty decodable WebM**.
- `python tools/verify-responsive.py`: CSS-only phone/tablet/desktop layout checks passed.
- TypeScript compiler source parser validated all new TS/TSX source syntax.

**Not verified:** `npm install`, `npm run build`, `npm test`, full interactive React Playwright E2E, real Three.js GPU output, model/device/browser matrix and full audio/video round-trip media tests. npm registry dependency fetching was unavailable in this environment. The existing `test:e2e` workflow is shipped but was not executed. Test installed dependencies locally before production use.

## Developer workflow

```bash
npm install
npm run dev
npm run build
npm test
npm run test:e2e
npm run verify:offline
```

On Windows, start with `START-WINDOWS.bat`. Open `examples/creative-24.framework` for a no-media text + 3D demonstration (WebGL required for the torus). The project continues to store uploaded media in browser IndexedDB; the `.framework` JSON is not a portable media bundle. Keep original files and backups.
