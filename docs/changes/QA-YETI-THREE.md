# QA-YETI-THREE

The Yeti inspection helper now takes `Vector3` and `Box3` from the existing
`p4-kits-native=1` page exposure. It requires the exposed `Vector3` to be the
actual renderer camera position's constructor before inspection begins. The
helper no longer imports a second bundled copy of Three.

The fixture, source and GLB hash collection, native pose and grounding
witnesses, cameras, audio capture, storage isolation and strict zero-warning
requirement are unchanged. No runtime or QA host source changed.

## Landed on current integration (Claude, 25 October 2026)

The branch's change was still right, but on current integration the `yeti`
scenario could not run at all, with or without it: the helper's bundle of
`tools/track-script-drive.mjs` pulled in a second copy of the whole game
through that file's `import { App }`, and since `src/circuit-manifests.js` got
a top-level wait, the game's start-up steps in that copy wait on each other in
a circle and never finish (the page stayed responsive, `__yetiQa` was never
set, `Runtime.evaluate timed out`). The helper uses only `useRacingLine`, so
the helper's build now replaces that one import with an empty `App` class
while it bundles (the file itself is untouched, and the build stops with a
clear error if the import line ever changes). The helper bundle fell from
1.2 MB to 337 KB and no longer contains any waiting start-up step.

## Checks

- `yeti` scenario (private port): passed, 5 screenshots written, 0 warnings, 0 errors;
  five views, 13,265 sampled rows, the audio capture and the packet written.
  The page's own Three classes are used and checked against the renderer.
- Lane tier `--changed --jobs 4 --keep-going`: 20 passed, 0 failed (includes
  `test-yeti`, `test-p4-kits`, `test-track-script`, `test-browser-harness`).
- `npm run build`: built.

## Removed

Removed the helper's explicit `three.module.js` import. No accepted asset,
assertion, old failed packet or player data was removed.
