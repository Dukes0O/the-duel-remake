# QA-YETI-THREE

The Yeti inspection helper now takes `Vector3` and `Box3` from the existing
`p4-kits-native=1` page exposure. It requires the exposed `Vector3` to be the
actual renderer camera position's constructor before inspection begins. The
helper no longer imports a second bundled copy of Three.

The fixture, source and GLB hash collection, native pose and grounding
witnesses, cameras, audio capture, storage isolation and strict zero-warning
requirement are unchanged. No runtime or QA host source changed.

## Checks

Source preparation only during the Ardennes release hold. `node --check
tools/scenarios/yeti.mjs` passed; both edited files use LF line endings.
No tests, build, helper compilation or browser run
has been performed for this change. Applicable existing checks are
`test-yeti`, `test-p4-kits`, `test-track-script` and `test-browser-harness`, then
the genuine private `yeti` scenario, canonical lane tier with `--jobs 4`, build
and independent review. Independent source review is CLEAR; actual compilation
and zero-warning browser confirmation remain pending. The earlier failed packet remains evidence; it does
not become an acceptance result for this change.

## Removed

Removed the helper's explicit `three.module.js` import. No accepted asset,
assertion, old failed packet or player data was removed.
