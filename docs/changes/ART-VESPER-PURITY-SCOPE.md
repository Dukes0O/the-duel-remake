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

## Reviewed fix to build

The independent reviewer approved capturing the current protected path and
SHA inventory before private commands, then comparing every existing
preservation call with that inventory. Preserve the four static donor pins
and every native art, geometry, rig, material, action, lifecycle and
repeatability assertion and tolerance. No new guard or replay pin is needed.
The existing failures provide the tests-first baseline; this note changes
no test assertion. The source builder and fresh gates remain pending.

## Removed

Nothing removed in this tests-first handoff. The builder will replace the
historical-tree assumption with preservation of the current source snapshot.
