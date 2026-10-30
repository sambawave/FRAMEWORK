# FRAMEWORK 2.3 — release candidate engineering notes

## Upgrade boundaries

Upgrades in this ZIP are in the existing `src/` files. No component, editor engine, media database, or project type has been discarded. Existing schema 1 documents remain accepted. Added fields (`solo`, `color`, `folder`, `groupId` on tracks; `adjustment`, `null` clip kinds) are optional or backward-compatible.

## Core behavior

1. Layer ordering comes from `Project.tracks`. `insertAtVisualIndex` and `reorderTracks` deterministically rearrange track references, **not** clips. Row transforms animate 175 ms; the dragged row remains under the pointer. The store provides `previewTracks` for transient compositor updates and `finishTrackPreview` for one undoable history commit. Pointer cancellation restores original tracks.
2. The layer + menu imports each chosen source into the same IndexedDB library and creates a corresponding track. Generated text, shape, solid, adjustment, or null clips use the same timeline and project representation. An organizational Group folder stores metadata only: **there is no nested-track rendering, parenting, or precompose engine**.
3. Adjustment layers render source pixels from tracks below their track and run effects through the existing Canvas pipeline. They are not performance-optimized GPU adjustments; current CPU-bound pixel effects can be slow at 4K.
4. Responsive layouts use width and input capabilities (coarse pointer), not user-agent strings. Mobile tabs expose the original MediaPanel, Viewer and Inspector. Existing timeline remains at the bottom. Touch pinch scales viewport state only; composition/export resolution is unchanged. All browser export limitations remain and are reported in the Export dialog.
5. Right-click or long press on clips, tracks, assets and preview objects opens their existing/contextual action menus. Inspector effects and keyframes now support contextual actions as well.
6. The native F/ text logo was replaced with an SVG. CSS `user-select:none` applies to editor chrome; native text controls and `contenteditable` allow selection.
7. An older complete autosave JSON is preserved periodically in `framework.autosave.recovery.v2`. This recovery is best-effort and local to one browser origin; exporting `.framework` and backing up media remains essential.

## Current verification

- `node tools/verify-core.cjs`: pass (7)
- `node tools/verify-upgrade.cjs`: pass (5)
- `node tools/verify-pro.cjs`: pass (118)
- `node tools/verify-final.cjs`: pass (25)
- `node tools/verify-release.cjs`: pass (15)
- Chromium Canvas pixel tests: real reordered stacking, hidden/solo, adjustment effect processing, null object transparency and nonempty WebM export: pass
- Chromium CSS breakpoint test for 390px phone, 810px tablet, 1440px desktop: pass
- Previous Chromium shape rendering, source video effect/export and per-clip volume checks: included and available to run
- **Blocked**: npm installation (DNS resolution failure accessing registry.npmjs.org); therefore no claim of a completed Vite production build, browser-run React interactions, real-device touch testing, or a fully production-certified application.

## Manual acceptance checklist before releasing publicly

- [ ] `npm install && npm run build && npm test` complete with zero errors.
- [ ] Import video/audio/image assets, save a project, reload in a new tab, and confirm media relinks.
- [ ] Drag one and multiple layers with mouse and touch; verify live preview stacking, no clip movement, and Ctrl+Z restores original order.
- [ ] Test portrait and landscape phones (iOS Safari, Android Chrome) and tablets; test touch pinch/long press vs trim and draggable layer handles.
- [ ] Create solid/text/shape/adjustment/null layers; verify all visual effects on both preview and recorded output.
- [ ] Validate long-press menus, name editing, text selection, VoiceOver/TalkBack navigation, and keyboard focus.
- [ ] Export a mixed A/V composition and verify audio alignment and visual fidelity in external media players.
- [ ] Test quotas/private storage, interrupted export, low-memory devices, very long clips, and recovery from corrupted autosaves.

## Known technical boundaries

MediaRecorder WebM support differs between browsers; not all mobile browsers support this export method. Touch dragging can interact with OS navigation and browser gesture heuristics. Large CPU pixel effects may stall on phones. Track folders are labels only; full nested compositions, GPU acceleration, user-customizable shortcuts, MP4 export, automated cross-browser testing and many advanced editing features remain unfinished. Consult `docs/FEATURE_STATUS.md` for inherited limitations.
