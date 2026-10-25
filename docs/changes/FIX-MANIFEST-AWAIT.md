---
task: FIX-MANIFEST-AWAIT
status: review
kind: fix
flag: none
player_facing: no
---

# Remove the top-level awaits that hung browser scenario bundles (25 October 2026)

Card `docs/board/cards/FIX-MANIFEST-AWAIT.md`. Two browser scenarios (the four Ardennes sisters through
`p4-panorama.mjs`, and the yeti) hung because `src/circuit-manifests.js` ended in a top-level `await`, which made
`config.js` and everything after it wait, while `combat-weapons.js` and the arsenal pieces imported each other. In a
single-chunk helper bundle each side then waited for the other forever. The real game loaded only because of its import
order. Nothing a player sees or plays changes.

## What changed

- `src/circuit-manifests.js`: the list is built from `import.meta.glob` (eager) when the game's build runs, so it is ready
  when the module is evaluated and a bundle holds no top-level `await` there: Vite replaces `import.meta.env` with a
  constant and the Node branch (a dynamic `import()` of each course file, awaited) is dropped from the bundle. Node (tests
  and tools) keeps that waiting branch, as before. A first version of this fix read the folder and `require`d each file
  so Node would not wait either; Node 22.14 (the laptop) refuses that for a course file that is already part of the
  importing graph (`ERR_REQUIRE_CYCLE_MODULE`, as `test-course-kit` does), so it was dropped (the laptop found it).
- `src/reference-laps.js`: the same pattern and the same cause (a second top-level `await` over the bundled lap files, in a
  module `track-analysis.js` pulls into most of the game): `recordsFromFiles()` is synchronous the same way.
- `src/combat-actors.js` (new): `point`, `aimPoint`, `velocity`, `predictedPoint` and `burst`, moved out of
  `combat-weapons.js` unchanged (with the `fuelCarrierFighter` helper they need). Every arsenal weapon imports them from
  there instead of from `combat-weapons.js`, which imports every arsenal weapon: the cycle is gone. `combat-weapons.js`
  re-exports the five, so the other twenty-odd importers are untouched.
- `tools/scenarios/p4-panorama.mjs`: the `panorama-synchronous-circuits` plugin (and its comment) is deleted.
  `tools/scenarios/yeti.mjs`: the transform that stubbed the line driver's `import { App }` is deleted. Replace means remove.

## Test first

`tools/test-manifest-await.mjs` (491 checks) builds single-chunk bundles with Vite exactly as the scenarios' helpers do, runs
each in Node under a 30 s limit, and also checks by reading the source that no file under `src/` has a top-level `await`
(`src/main.js`, the page's entry that nothing imports, and `src/circuit-manifests.js`, whose wait is in its Node-only branch, are named; no bundle holds that branch, checked) and that no file under `src/arsenal/` imports
`combat-weapons.js`. Bundles: the whole game (`src/game.js`), `config.js` + `combat-weapons.js` + `arsenal/oil.js`, oil first,
and the line driver (the whole game plus the driver). Each of the 13 course files is also loaded first in a fresh Node process, alone, after `course.js` and before it (the order that crashed `test-course-kit` on Node 22.14). Before the change the source check failed on
`src/circuit-manifests.js` and the `src/game.js` bundle hung (15 s timeout in a scratch run; the revert of
`circuit-manifests.js` alone brings the hang back, the revert of `reference-laps.js` alone does not hang in Node, but its
`await` is the same fault and the source check catches it).

## Unchanged

Replays, world signatures and combat balance. No test assertion changed; no test was loosened.

## Checks

Run once in the cloud (Linux, no graphics) on the branch from the current `integration/wasteland`:

- `npm run build`: passes.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`: the replay and world-signature guards
  (`test-replays`, `test-combat-replays` and the rest of the smoke set) pass with the fingerprints unchanged; the only
  failures are the laptop-only or already-failing suites: `test-course-kit` (asserts `win32`; its other seven tests pass,
  and they exercise the course registry this change touched), `test-earned-cars-ui`, `test-drive-through`,
  `test-full-check`, `test-medals`, `test-salt-flats`, `test-salt-flats-art`, `test-p4-kits`, `test-tanker-valve-source`,
  `test-vesper-art`, `test-compact-binaries` and `test-lab-radio` (same on a clean `integration/wasteland`).
- `node tools/combat-balance.mjs --check`: exit 0 (current rules).
- `test-manifest-await`: 491 checks; also run with Node 22.14.0 (the laptop's version, installed in a scratch folder), where it fails on the first version of this fix and passes on this one; `test-course-kit` under Node 22.14.0 passes except its `win32` assertion.
- Not run: the Ardennes-sister and yeti browser scenarios, frame checks, the full tier.

## Not done here

The Ardennes-sister scenarios and the yeti scenario run on the laptop after merge (they need a real browser); only their
helper bundles' loading is checked here.

## Removed

The two scenario workarounds named above.
