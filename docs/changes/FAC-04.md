# FAC-04: course files register themselves

Status: merged. Scope and design are settled before tests or code. No release, new course admission, price change, save-shape change or fixture regeneration.

## Owned files and granted hooks

Own the original card: circuits/index.js, feature-flags.js, course-access.js, race-field.js, start-preview.bat, generated reference data, reference publisher, replays folder, world-composition guard and this note. Director additionally grants manifest exports in the four current course files; circuit-manifests.js; reference-laps.js and generated/reference-laps/; preview-flags.mjs; fixtures/world-signatures/; replay consumer; narrow salt-flats/arena-pit hash consumers; Blender file-presence hook; circuit-layout/Snow/preview/reference tests; new test-course-kit.mjs and pure course-fixtures.mjs JSON directory loader. Course.js and every generator remain unchanged; the Director narrowed the stage design after the genuine failure below. No shared board/inbox/status edit, count sweep, dependency or scenario change. FAC-06 owns the separate Preview completed-card assertion; preserve that accepted correction on sync and change only FAC-04 flag/registry assertions here.

## Design before code

Each course module adds an immutable manifest with id, flag, state, price, grandPrix, releaseOrder and driver. Current order remains Woods, Snow, Harbour, Panorama; current states remain on/on/on/dev, prices 1600/1800/1800/1600, and Panorama stays outside Grand Prix until its own admission. Driver metadata describes the current reference recipe: Stuttgart 959S, club driver, racing-line controller at .95. It does not change existing driving. The authored stage keeps its existing generation and entitlement identity.

A discovery module independent of feature-flags loads current course files with Vite eager glob or Node directory/import, validates unique ids/flags/release positions, and sorts by declared releaseOrder. Index returns frozen original definitions without mutating prior authored exports or global imports. Public COURSE position is the stable base16 plus enabled ordered index; manifests derive flags, prices, Grand Prix membership and Preview course flags. Existing non-circuit data stays exact. Helper-only modules are skipped; real kind:circuit definitions with missing/malformed manifests fail clearly. Course and helper modules under circuits must not import config or circuits/index: discovery loads them before those catalogues exist. This authoring contract avoids a registry cycle without shipping raw source to the browser or adding a new discovery framework.

Important identity: authored stage values are Woods18, Snow19, Harbour17, Panorama16, while released array positions are16/17/18. Rewriting stage caused a real Woods obstacle divergence: circuit-kit-layout and other generators also seed from stage, not only Course. The new deep assertion expanded that mismatch into a 4 GB heap exhaustion at about45 seconds. The job drained; no expected map was regenerated. Before changing the new assertions, the Director settled the narrower rule: retain every authored definition.stage exactly, and derive public course position from the ordered list/indexOf. Restore only the two local Course RNG edits; no generator hook or legacy entitlement change is needed. The new identity assertion compares complete unrounded serialized samples/features by SHA256, avoiding huge error-object expansion, plus the independent course/reference fingerprints and existing world guards. This changes only the new fixture representation, not its exact-data requirement or any old assertion.

Split the existing reference rows into one file per event under generated/reference-laps/ and discover them in the runtime loader. Preserve all 28 current records and their measured values, policy, clocks, traces and fingerprints; do not rebuild them. Publisher writes complete per-event records atomically. Route-filtered partial probes cannot publish.

Keep original non-circuit replay envelope, inputs and fingerprints in the existing base files. Move authored replay cases and their unchanged fingerprint maps to replays/courses/<id>.json; the reader merges only enabled course data and preserves exact original case order and fingerprint values. Salt controls pin only the unchanged non-circuit fingerprint file, as Claude settled. Physical and native eight-second trace pins remain exact. No --record or signature capture is used.

Move world baseline values into fixtures/world-signatures/<id>.json and discover them on read. Keep every current hash, resource count and assertion. A new test course adds only its course file and own reference/replay/signature files, with no shared edit, and must appear in all derived catalogues. Tests also compare original generation/features/reference identity and stable event order. Test-only files live in a unique copied fixture tree under this lane's .qa-dist, are created exclusively and recycled after use; originals are never removed. This prevents concurrent lane suites from observing a transient test course in the actual source catalog. Added-file assertions stay unchanged.

## Changed assertion reasons, before tests

The Preview now obtains course flags from the manifest generator, so assertions of literal course names in the batch file become checks of the actual derived flag list and generator invocation. Registry identity remains the frozen original exported object; public position follows stable array order, independently of legacy authored stage. The replay/world guards derive their narrow roster sizes from actual COURSE/fixture coverage so the card's added test course needs no shared edit; exact missing/duplicate course and per-case/per-scene comparisons remain. No FAC-05 count sweep or tolerance relaxation. Salt's file hash changes scope only to base non-circuit data; every underlying replay, physical and trace value stays exact. Removed monolith presence checks name their real per-course replacements.

Before the Preview test maintenance: the first frozen canonical lane on aa9dec75 passed 308/309 suites, with one failure and zero unrun in 876.61 s. The original Preview check searched the batch text for literal Panorama, while the new launcher obtains it from the manifest generator. The granted replacement parses the actual base PREVIEW_FLAGS, requires the generator command and append, combines the real generator flag list, and still requires every original dev switch. All other 22 Preview checks, including FAC-06 completed-card handling, stay exact. This is a source-aware assertion change, not a missing flag exemption.

The derived Grand Prix export follows manifest release order: Pacific/Woods/Snow/Harbour instead of Pacific/Woods/Harbour/Snow. Actual COURSE positions and Grand Prix membership stay exact. This array-order fact must be retained; the Director accepted it subject to the independent membership-only consumer audit. No order-sensitive assertion failed in the first canonical run.

## Checks

Tests-first RED: four new cases fail on missing registry/fixture-loader API before creating any temporary files. Implementation GREEN: 5/5 course-kit cases, including helper-only discovery and an isolated added-course catalogue fixture (12.95 s). Exact whole-value checks retain all 28 references, all replay input/case/fingerprint values and all 19 world baselines. Production build passed (1.02 s, 355 modules); a Node-only directory URL warning was then fixed with the existing Vite ignore annotation. The granted Preview assertion maintenance passes all 23 checks; the other 22 checks and accepted completed-card branch are unchanged. The final canonical lane/build and one source review remain pending. Integration through 51dd5df1 is synced, including accepted selector and Preview completed-card correction. Daytime checks use existing pure/Node fixtures; browser/frame/balance work belongs to the night shift. Original GP tuning caps and results remain untouched in their retained lane.

## Removed

Replace shared circuit imports, duplicated circuit flags/prices/Grand Prix/Preview lists, monolithic reference data, authored replay rows and inline world signature map with per-course data and discovery. Remove replaced monoliths in the same change; retain base non-circuit replay files and their exact original values. The replaced reference monolith was recycled after its 28 records moved unchanged to 20 event files. Test fixture trees created by this card were recycled after their checks. No model, licensed source, save or current gameplay data is discarded.

## Final merge verdict

Frozen 8cc2d45ac1af6b97b6c1f951f9dba7d32acca9eb: canonical lane
309/309, zero failures or unrun, 791.07 s, jobs 4. Production build passed
in 1.13 s (355 modules). One ordinary source review and its Preview-only
delta are clear. The other 22 Preview checks are byte unchanged.
All 28 reference records, 21 replay cases and 19 world baselines retain
their original values. Authored generation stages and all generators are
unchanged. GP export order follows Woods, Snow, Harbour; consumers use
membership only. No expected fingerprint or signature was regenerated.
Conflict-free integration merge; no post-merge gate, native frame, balance,
browser, release or push claim. FAC-05 takes the registry lock next.
The consumed open-card detail is recycled after its scope and verdict have
been retained here.

## Consumed migration proof (FAC-05)

The passing FAC-04 5/5 focused and 309/309 final lane proved these canonical SHA256 values against the unchanged pre-split data. FAC-05 retires only the aggregate one-time assertions; per-event native reference, replay and world checks remain exact. No value is regenerated.

- Reference records: 26e62174c7b15d8bc2f8134081066aff6d062aab486e1a64df356afa06343a15
- Replay inputs/cases: 81eadfd7e1e3359d5fbc7cdd5ba1bab8209c227a2a3a9f1cfcc57884e81870b6
- Replay fingerprints: c64ca15708357a28b1d4b55a7f1dccf9407a008155b2a8b7d95b58b5cd2ea3ba
- World baselines: c7417f373e57aa5b1a84ead1d00d36778b6eba3c80647ec3e1f1ff7fd9d20241
