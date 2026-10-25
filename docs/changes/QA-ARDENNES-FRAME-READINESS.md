# QA-ARDENNES-FRAME-READINESS: why `ardennes-views` timed out

Card: QA-ARDENNES-FRAME-READINESS (Claude). Browser scenario `ardennes-views` failed with
"Runtime.evaluate timed out." and no pictures on plain integration/wasteland, alone on the laptop.

## Cause

Not a slow world build and not a readiness condition: the scenario's native helper bundle
(`nativeBundle()` in `tools/scenarios/p4-panorama.mjs`, also used by `p4-panorama`,
`stavelot-stone` and `grand-prix-existing`) never finishes loading in the page. It is a
single-chunk copy of part of the game. `src/circuit-manifests.js` ends in a top-level await
(`registerCircuits(await modulesFromFiles())`); that makes `config.js` and so
`combat-weapons.js` wait for it, and `combat-weapons.js` and `arsenal/oil.js` import each other,
so each waits for the other forever. The scenario's step that evaluates the bundle waits its full
60 s and times out, 4 s after the menu is ready and before any course is built. Found by running
the bundle in node (the load never settles) and logging which module waits were still pending.

## Fix (scenario only)

`nativeBundle()` now has a small build step that reads the course files at build time without the
await (Vite resolves them there). It fails loudly if that line of `circuit-manifests.js` changes.
The game's own builds are untouched (they work). The bundle loads in 0.18 s in node.

## Result

`node tools/run-browser-scenarios.mjs --scenarios ardennes-views`: PASS, 32 screenshots, 0 warnings,
0 errors, 97 s, alone on the laptop. The three other scenarios that share the bundle are listed
below with the gate results.

## Changed assertions

None.

## Removed

Nothing replaced.

## Gates

24 October 2026, once, after merging current `integration/wasteland` (clean):
`node tools/run-browser-scenarios.mjs --scenarios ardennes-views`: PASS, 32 screenshots, 0 warnings,
0 errors, 97 s. The scenarios sharing the bundle, `p4-panorama` (26 screenshots), `stavelot-stone` (4)
and `grand-prix-existing` (36): PASS, 0 warnings, 0 errors. `node tools/run-tests.mjs --tier lane
--changed --jobs 4`: 21 passed, 0 failed (170 s). `npm run build`: pass. Frame (timing) checks were
not run and are not claimed: this fix is about the pictures and the field run; Ardennes' frame check
can now be attempted by its own recipe.
