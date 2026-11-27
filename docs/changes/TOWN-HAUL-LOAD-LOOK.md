# TOWN-HAUL-LOAD-LOOK: the haul's load drawn as real salvage

**Changed.** New `src/town/view/haul-load-look.js` draws the haul's ten kinds of piece in code, with drawn wear, and packs the
load as a heap on the flatbed's real deck. `src/town/view/work-vehicle-view.js` uses it: a piece comes down onto the heap as it
is lifted on; a piece thrown off turns through the air and lies beside the road on the drawn ground, a burst bundle spread out.
View only: the job's state is read and nothing is written.

**Looks.** Five rounds, sheets and verdicts in `docs/board/looks/town-haul-load-look/`; round 5 passes, for the Director's look.
New scenario `look-haul-load`, with its own row in `tools/run-browser-scenarios.mjs`. No frame check (rule 9).

**Checks, on the working tree over `dcce6df98`.** Rule 23's set, 17 suites passed: core, the three guards, test-town-haul-job,
test-town-vehicles, test-town-goods, test-town-view-life, test-machine-haul, test-water-cannon, test-browser-scenarios,
test-full-check, test-repo-hygiene, test-board. No assertion changed; no fingerprint moved. `npm run build` is run once for
this branch, with TOWN-FIRE-STREAM-LOOK on it, and is recorded in that card's note.

**Learned.** Six entries in `docs/ART_LINE.md`, "Loads and loose pieces".

**Removed.** The grey boxes: `PIECE_COLOURS`, `PIECE_DENSITY`, `pieceSize` and the box meshes in `work-vehicle-view.js`.
