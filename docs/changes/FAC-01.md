---
task: FAC-01
status: ready-to-merge
kind: tool
flag: none
player_facing: false
---

# FAC-01: test picker runs what the change touches

## What changed

- `tools/run-tests.mjs` lane selection (Kyle approved, 12 October 2026,
  `docs/FACTORY.md` decision 1 and AGENTS rule 11):
  - Dependencies are walked breadth-first and keep their distance from the
    suite. A suite runs for a changed file it imports, or a file one step
    further (`LANE_REACH = 2`).
  - Each file contributes the paths it names: `new URL('../x', import.meta.url)`
    including concatenated heads, `join(root, 'a', 'b')`, root-relative
    strings such as `'src/x.js'`, runtime `'assets/...'` strings (mapped to
    `public/assets/...`) and `// test-reads:` lines. Paths named by the suite
    or its direct imports select it.
  - A file reader that names no path at all still runs for any game change
    (one suite today: `test-koenigsegg-ui`).
  - `LANE_GUARDS` (replay fingerprints, combat replays, world composition)
    run in every lane.
  - Only the runner, its test, lockfiles, package files and build configs
    select everything. `src/config.js` is game data and follows its importers.
  - A changed game file no selected suite reaches is printed by name; the
    night full tier and the release full tier cover it.
- `AGENTS.md`: new section "The factory" (rules 11 to 15) and gate wording.
- `docs/FACTORY.md`: production-line graphs, locks and the FAC cards.
- `docs/board/board.yaml`: FAC-01 to FAC-08.

## Measured selection (393 suites)

| Change | Before | After |
|---|---|---|
| `src/circuits/tremblant-snow.js` | 369 | 19 |
| `public/assets/audio/*.ogg` | 393 | 38 |
| `src/arsenal/hazards.js` | 320 | 58 |
| `src/render3d.js` | 155 | 26 |
| `src/screen-hud.css` | 151 | 18 |
| `tools/combat-balance.mjs` | 155 | 14 |
| `src/game.js` | 299 | 203 |
| `src/feature-flags.js` | 370 | 213 |
| `src/config.js` | 393 | 314 |

Plus the six smoke suites and three guards in every lane.

## Behavior and test changes

Changed assertions in `tools/test-test-runner.mjs`, each a deliberate policy
change from Kyle's decision, not a loosened check:

- Unmapped source, unknown asset and unknown CSS paths no longer select every
  suite; the test now checks they select fewer than all.
- `src/config.js` left the "select everything" list; a new check proves it
  follows importers.
- Possible-reader cases: a reader naming no path still runs for any game
  change; an unknown asset or source selects only those readers.
- `docs/OPERATIONS.md` now selects the two suites that read it.

New checks: URL heads, `join` literals, `test-reads` lines, runtime asset
strings, reach two versus three, the unmapped report and the lane guards.

## Evidence

- `node tools/test-test-runner.mjs`: 163 checks pass.
- Lane tier and build: see the merge line in run-log.md.

## Removed

- The blanket "possible reader runs for any source change" rule.
- The "unknown public or CSS path runs everything" fallback and the
  "unmapped src/tools file runs everything" fallback.
