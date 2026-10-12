# FAC-04: course files register themselves

Status: building. Scope and design are settled before tests or code. No release, new course admission, price change, save-shape change or fixture regeneration.

## Owned files and granted hooks

Own the original card: circuits/index.js, feature-flags.js, course-access.js, race-field.js, start-preview.bat, generated reference data, reference publisher, replays folder, world-composition guard and this note. Director additionally grants manifest exports in the four current course files; circuit-manifests.js; reference-laps.js and generated/reference-laps/; preview-flags.mjs; fixtures/world-signatures/; replay consumer; narrow salt-flats/arena-pit hash consumers; Blender file-presence hook; circuit-layout/Snow/preview/reference tests; new test-course-kit.mjs and pure course-fixtures.mjs JSON directory loader. Course.js has exactly two RNG hooks for generation identity; no other Course behavior change. No shared board/inbox/status edit, count sweep, dependency or scenario change. FAC-06 owns the separate Preview completed-card assertion; preserve that accepted correction on sync and change only FAC-04 flag/registry assertions here.

## Design before code

Each course module adds an immutable manifest with id, flag, state, price, grandPrix, releaseOrder and driver. Current order remains Woods, Snow, Harbour, Panorama; current states remain on/on/on/dev, prices 1600/1800/1800/1600, and Panorama stays outside Grand Prix until its own admission. Driver metadata describes the current reference recipe: Stuttgart 959S, club driver, racing-line controller at .95. It does not change existing driving. Optional generationStage keeps the authored generation identity.

A discovery module independent of feature-flags loads current course files with Vite eager glob or Node directory/import, validates unique ids/flags/release positions, and sorts by declared releaseOrder. Index builds frozen views without mutating prior authored exports or global imports. The enabled view derives public stage from the stable base16 plus enabled order; manifests derive flags, prices, Grand Prix membership and Preview course flags. Existing non-circuit data stays exact. Unknown/malformed manifests fail clearly rather than silently dropping a course.

Important identity: current authored stage values are Woods18, Snow19, Harbour17, Panorama16, although released array indices are16/17/18. Course.js currently uses those values for RNG at two sites. Frozen registry views retain generationStage from each original authored value; only those two RNG expressions use generationStage ?? stage. Public stages may follow COURSE indices while old physical/world/reference fingerprints stay exact. Legacy definitions without generationStage stay byte-for-value exact.

Split the existing reference rows into one file per event under generated/reference-laps/ and discover them in the runtime loader. Preserve all 27 records and their measured values, policy, clocks, traces and fingerprints; do not rebuild them. Publisher writes complete per-event records atomically. Route-filtered partial probes cannot publish.

Keep original non-circuit replay envelope, inputs and fingerprints in the existing base files. Move authored replay cases and their unchanged fingerprint maps to replays/courses/<id>.json; the reader merges only enabled course data and preserves exact original case order and fingerprint values. Salt controls pin only the unchanged non-circuit fingerprint file, as Claude settled. Physical and native eight-second trace pins remain exact. No --record or signature capture is used.

Move world baseline values into fixtures/world-signatures/<id>.json and discover them on read. Keep every current hash, resource count and assertion. A new test course adds only its course file and own reference/replay/signature files, with no shared edit, and must appear in all derived catalogues. Tests also compare original generation/features/reference identity and stable event order. Test-only files are uniquely owned, created exclusively and recycled after use; originals are never removed.

## Changed assertion reasons, before tests

The Preview now obtains course flags from the manifest generator, so assertions of literal course names in the batch file become checks of the actual derived flag list and generator invocation. Registry identity follows immutable views; compare stable ids/order and preserved authored exports rather than assuming the registry object is the exported object. The replay/world guards derive their narrow roster sizes from actual COURSE/fixture coverage so the card's added test course needs no shared edit; exact missing/duplicate course and per-case/per-scene comparisons remain. No FAC-05 count sweep or tolerance relaxation. Salt's file hash changes scope only to base non-circuit data; every underlying replay, physical and trace value stays exact. Removed monolith presence checks name their real per-course replacements.

## Checks

Tests-first RED: four new cases fail on missing registry/fixture-loader API before creating any temporary files. Pending implementation, exact identity guards, canonical targeted lane/build and one review. Daytime checks use existing pure/Node fixtures; browser/frame/balance work belongs to the night shift. Original GP tuning caps and results remain untouched in their retained lane.

## Removed

Replace shared circuit imports, duplicated circuit flags/prices/Grand Prix/Preview lists, monolithic reference data, authored replay rows and inline world signature map with per-course data and discovery. Remove replaced monoliths in the same change; retain base non-circuit replay files and their exact original values. No model, licensed source, save or current gameplay data is discarded.
