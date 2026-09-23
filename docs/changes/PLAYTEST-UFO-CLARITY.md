# UFO destination readout

The weapon bar now says whether the UFO will swap with the rival or warp
forward. It shows the expected route gain while ready. The race callout shows
the exact route gain after use. A warp blocked by the next checkpoint keeps
its charge and says why it did not fire.

The underlying swap and warp distances are unchanged. This is a visibility
and charge-waste fix while the separate UFO balance gate remains open.
The live preview now recalculates the destination each frame, so the label
changes as soon as the rival moves ahead or behind. The browser check still
shows no needless text writes during a steady state.

Checks: `node tools/test-combat.mjs` passed 72 checks;
`node tools/run-tests.mjs --tier lane --changed --jobs 8` passed 93 suites;
`node ../../node_modules/vite/bin/vite.js build` passed; the isolated
`weapon-bar` browser scenario passed with one screenshot and no warnings or
errors. `git diff --check` passed. No existing test target was changed.
