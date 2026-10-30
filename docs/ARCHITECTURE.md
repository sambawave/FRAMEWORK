# FRAMEWORK v1 architecture

## Project engine

`Project` schema is versioned at `schema: 1`. Timestamp boundaries use integer frames; FPS is a rational number `{num,den}`. Assets have stable IDs, while blob bytes live in IndexedDB. Clip source position uses project-frame units and is converted to seconds for browser decode. This model is intentionally modest: no source-timebase precision or nested sequences yet.

## Timeline engine

Pure functions in `src/engine/timeline.ts` handle split, move, trim, keyframe interpolation, and effect editing. Zustand coordinates UI state; committed edits are copied into a 60-entry undo stack. UI pointer drags stage temporary geometry and commit on release. The compositor receives a stable project value for each frame.

## Rendering and compositing

`drawComposition(canvas,project,frame,getMedia)` is the single image generation function used by both preview and export. It orders video tracks bottom-to-top, performs clip activation at exact integer frames, evaluates transforms/keyframes, applies Canvas2D filters and blend modes and draws media/typography/shapes.

HTMLVideoElement supplies decoded frames; browser currentTime seeking is used for timeline scrubbing. A future WebCodecs decoder will need a source-timestamp-to-composition-frame index to support VFR and deterministic export.

## Audio

Each clip owns a separate media element for independent in/out offsets. When playback begins, its element connects to `MediaElementAudioSourceNode -> GainNode -> StereoPannerNode`. For interactive playback this routes to audio context speakers; an additional destination node is available to compose the export recording. Mute, fade and volume automation are evaluated per timeline frame.

A future offline audio engine should decode audio into buffers, schedule sample-aligned regions and render with OfflineAudioContext. It should replace the browser's independent media-element scheduling.

## Export

A separate playback engine instances the same compositor at the project output size; canvas.captureStream and MediaRecorder capture real time. `MediaStreamAudioDestinationNode` joins the canvas stream before MediaRecorder starts. Codec support is probed at runtime (VP9/Opus, VP8/Opus, WebM). No server receives media or renders clips.

For offline-frame-accurate export, create a WebCodecs VideoEncoder/AudioEncoder pipeline with deterministic per-frame composition and output muxer, or an FFmpeg WASM fallback; do not simply change the requested MIME and claim MP4 support.

## Persistence

- `localStorage`: compact autosaved project JSON and splitter dimensions.
- `IndexedDB`: imported source media Blobs addressed by asset ID.
- `.framework`: downloaded, validated, versioned project metadata (not embedded media).

Project opening only restores media from the same browser store. Explicit relink matches filenames; future versions should have hashes/OPFS handles and robust migration.

## Next milestones

1. Fix any cross-browser/Playwright failures in the implemented workflow and add a browser-export regression suite.
2. Add decoded audio-buffer scheduling and test AV sync with visual and acoustic markers.
3. Add canvas compositor transform handles, true waveform cache and snapping.
4. Add a deterministic WebCodecs + muxer export pipeline and audio-accurate offline render.
5. Introduce WebGL2 render passes and shader effect descriptors; measure against Canvas2D fallback.
6. Implement masks, precompositions, graph editor and LUT/color transforms once the core is stable.
