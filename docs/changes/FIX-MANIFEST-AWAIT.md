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

- `src/circuit-manifests.js`: `modulesFromFiles()` is synchronous. The game's build still finds the course files at build
  time (`import.meta.glob`, eager); Node (tests and tools) reads `src/circuits/` with `readdirSync` and loads each file at
  once with `createRequire` (an ES module required synchronously: Node 22.12 or later, which `README.md` already asks for;
  `process.getBuiltinModule` gives the built-ins without an import, so the game's bundle holds no Node import). Same files,
  same sorted order, same registry.
- `src/reference-laps.js`: the same pattern and the same cause (a second top-level `await` over the bundled lap files, in a
  module `track-analysis.js` pulls into most of the game): `recordsFromFiles()` is synchronous the same way.
- `src/combat-actors.js` (new): `point`, `aimPoint`, `velocity`, `predictedPoint` and `burst`, moved out of
  `combat-weapons.js` unchanged (with the `fuelCarrierFighter` helper they need). Every arsenal weapon imports them from
  there instead of from `combat-weapons.js`, which imports every arsenal weapon: the cycle is gone. `combat-weapons.js`
  re-exports the five, so the other twenty-odd importers are untouched.
- `tools/scenarios/p4-panorama.mjs`: the `panorama-synchronous-circuits` plugin (and its comment) is deleted.
  `tools/scenarios/yeti.mjs`: the transform that stubbed the line driver's `import { App }` is deleted. Replace means remove.

## Test first

`tools/test-manifest-await.mjs` (446 checks) builds single-chunk bundles with Vite exactly as the scenarios' helpers do, runs
each in Node under a 30 s limit, and also checks by reading the source that no file under `src/` has a top-level `await`
(`src/main.js`, the page's entry that nothing imports, is the one exception) and that no file under `src/arsenal/` imports
`combat-weapons.js`. Bundles: the whole game (`src/game.js`), `config.js` + `combat-weapons.js` + `arsenal/oil.js`, oil first,
and the line driver (the whole game plus the driver). Before the change the source check failed on
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
- `test-manifest-await`: 446 checks.
- Not run: the Ardennes-sister and yeti browser scenarios, frame checks, the full tier.

## Not done here

The Ardennes-sister scenarios and the yeti scenario run on the laptop after merge (they need a real browser); only their
helper bundles' loading is checked here.

## Removed

The two scenario workarounds named above.
