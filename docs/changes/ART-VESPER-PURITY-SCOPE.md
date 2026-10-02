# ART-VESPER-PURITY-SCOPE: private recipe preservation scope

## Tests first

The existing native suite reproduces the defect before any test change.
On clean Salt source ba53f81, `node tools/test-vesper-art.mjs` reaches
103,229 acceptance checks: 21 cases, 17 pass and four fail. All four failures
compare `src/app.js` with the historical integration tree at e2e4fdb. They
occur in the initial preservation check, after the actual candidate build,
after two repeatable exports and in the final preservation check.

The seven recipe, fit config, test, donor and reference paths match current
integration 87bcd6a exactly. All four static source pins pass. Geometry,
embedded materials, bones, actions, native view lifecycle and repeatable real
exports pass. The Salt lane remains clean after the suite. Outputs stay in
its ignored private QA folders. No game source or real saves changed.

## Reviewed fix

The independent reviewer approved replacing the historical integration tree
with the current game's protected path and SHA inventory. Before any private
recipe command, module initialization captures every file under src, public
and tools/replays into one frozen in-memory object. The four existing
preservation calls require the same exact paths and SHA-256 bytes afterward.
Added, removed or changed files still fail. No generated baseline is saved.

The four static donor, original recipe, reference and rights pins remain
unchanged. A read-only comparison confirms every native art, geometry, rig,
material, action, lifecycle and repeatability assertion and tolerance outside
this reviewed preservation scope is byte exact, including all recipe calls.
This fixes provenance after later legitimate cards; it does not approve any
recipe mutation of the current game.

## Current checks

`node --check tools/test-vesper-art.mjs` and `git diff --check` pass.
`node tools/test-vesper-art.mjs --fresh-output-only` passes all three genuine
CLI cases with 19 reached acceptance checks. The full 21-case native suite,
independent review and fresh lane/build gates await the Director's heavy slot.
No Blender, browser, build, broad tier or live-game command ran for this fix.

## Removed

Removed only the obsolete historical BASE constant and git ls-tree comparison.
The current in-memory inventory replaces both its path and byte checks.
No asset, static source pin, replay file, native art assertion or guard matrix
was removed or added.
