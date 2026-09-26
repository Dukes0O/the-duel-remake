---
task: TITAN-01
status: merged
kind: physics
flag: titan-climb
player_facing: yes
---

# Titan mountain climbing (26 September 2026)

## Design

Settled in `docs/MUDDY_HOLLOW.md` section 2 before code. Remove only the
Titan's accumulated-climb tip. The Titan may climb a whole hill while the
local grade stays within its existing `maxGrade`; a steeper grade still tips
it. Grade slows the Titan uphill and speeds it downhill. Rally and ordinary
cars keep their current limits and behavior.

No new menu entry or save data is part of this card. TITAN-01 supports the
later `muddy-hollow` feature. Its physics starts behind the separate
`titan-climb` dev switch; switch-off keeps the exact old 24 m cap and speed.

## Tests first

Independent red acceptance tests were committed before runtime code. The first
focused run had 8 checks and 4 intended failures: the Titan stopped at
23.927 m and tipped before the top of the 60 m climb, and neither the Titan nor
the rally car had a slope speed effect. The over-grade Titan tip, rally climb
cap, ordinary-car isolation and replay fingerprints already passed.

## What changed

- `src/feature-flags.js` adds `titan-climb` in dev.
- `src/offroad-physics.js` exposes a switched Titan capability with an
  infinite accumulated-height cap. The local `maxGrade` and rise-rate checks
  remain unchanged. The switch-off Titan keeps 24 m; the rally keeps 16 m.
- A pure slope-gravity calculation converts the travelled grade into a
  deterministic speed-magnitude change. Only the Titan enables it.
- `src/sim-driving.js` applies that change from the actual shortened and
  re-sampled terrain path, after the existing grade and rise-rate checks.

## Changed assertions

- The first red `tools/test-titan-climb.mjs` draft applied slope gravity to
  both off-road-capable cars. That changed the pinned Ridge Rally replay. The
  corrected contract applies it only to the Titan and explicitly keeps rally
  slope speed unchanged; `docs/board/decisions.md` records the evidence.
- `tools/test-feature-flags.mjs` extends its exact catalog/count assertion from
  five to six switches and its production-off assertion to include
  `titan-climb`. This is the required new dev switch, not a weaker check.
- `tools/test-wasteland-beta.mjs` extends its exact released/development
  switch map with `titan-climb: dev`. The first expanded lane run exposed this
  stale exact map; the correction preserves every prior switch and state.
- No physics assertion changed. `tools/test-offroad-physics.mjs` continues to
  pin the exact switch-off Titan, rally and ordinary behavior.

## Evidence

- `node tools/test-titan-climb.mjs`: 10 checks, 0 failures. This includes the
  60 m / 40 degree climb, over-grade tumble, slope speed, switch-off behavior,
  isolation and the complete recorded replay fingerprint suite.
- `node tools/test-offroad-physics.mjs`: 8,788 switch-off checks passed.
- `node tools/test-feature-flags.mjs`: 22 checks passed.
- The first lane-tier attempt reported 9 passed, 1 failed and 136 not run.
  `tools/test-audio.mjs` could not start the installed FFmpeg decoder inside
  the sandbox. The focused test passed all 460 checks when rerun with the
  required process permission. No source or dependency changed.
- The next expanded lane run reported 137 passed, 1 failed and 8 not run. Its
  only failure was the stale exact switch map in
  `tools/test-wasteland-beta.mjs`; the required `titan-climb: dev` entry was
  added without changing any previous state.
- Independent review found the missing dev switch. After `titan-climb` was
  added and exact switch-off behavior was restored, re-review closed that high
  finding and one change-note wording issue. Final review: clean.
- Mandatory lane gate after the final switch-map correction: 146 suites
  passed, 0 failed and 0 not run in 260.62 seconds. The production build
  passed with 233 modules; its only warning was the existing large-chunk
  advisory. A documentation-only rerun follows this evidence update.

## Removed

The accumulated-climb cap is removed only from the switched Titan capability.
Switch-off Titan, rally and ordinary-car physics paths remain.
