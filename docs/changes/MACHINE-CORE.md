# MACHINE-CORE follow-up: capacity and edited ground

## Changed

- Digging passes the bucket's remaining compacted-volume capacity into the ground cut. The edit layer stops at that limit, so material that cannot fit stays in the ground. Bulking remains 1.25.
- The Scablands horizon rebuild samples the shared edited height layer. Untouched samples retain their prior heights.
- Dig effects load Kenney's transparent `dirt_01.png` particle sprite in the browser. Credit is in `public/assets/textures/CREDITS.md`. Headless scene construction skips browser-only texture loading.
- The cursor dev dig key stays with MACHINE-VIEW, which owns the input hook. The current scene exposes its ground refresh and effect burst APIs for that hook.

## Checks

- `node tools/test-machines.mjs` — passed. Added a near-full bucket case proving the cut is limited by remaining capacity after bulking.
- `node tools/test-ground-view.mjs` — passed.
- `node tools/test-scablands-scene.mjs` — passed. Added an edit/rebuild case and exact equality check for an untouched far-ground sample.
- `npm.cmd run build` — passed. Vite reported the existing dynamic-import and large-chunk warnings.
- Browser and look checks — Claude should inspect a dig burst in the Scablands and confirm the Kenney sprite reads as dirt at play distance. Also check that far ground follows an edited pit after a work order commits. The dev key is for MACHINE-VIEW.
- Changed assertions: none weakened. The new scene refresh assertion accepts any positive changed-chunk count because an edit can touch more than one chunk.
- Race fingerprints: none; race rules and course signatures are unchanged.

## Removed

- Removed the 4-by-4 flipbook UV slicing from the dig effect. It now uses the single transparent Kenney dirt sprite directly.
