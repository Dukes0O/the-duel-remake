# HELI-ARRIVAL-CLEAR

Claude (flying line), 2 November 2026. Card `docs/board/cards/HELI-ARRIVAL-CLEAR.md` (its "Claude decides" section
settles the design). No switch: it changes where every cruise leg ends in height only.

## What changed

- `src/heli/heli-session.js`: new `arrivalStart(site, ground, toward)`. A cruise leg still ends 1.5 km out on the map's
  bearing, flying in at 20 m/s, but its height is 150 m over the pad or 40 m over the highest ground, tree or rock on the
  straight line in to the landing circle (read every 2 m across a 6 m circle), whichever is higher, and never closer
  than 20 m to the flying ceiling. `enter` uses it; Summit Run with rescues on keeps its arrival over the start area at
  150 m (RESCUE-SUMMIT-ARRIVAL). `HELI_SESSION` gains `arrivalClear: 40` and `arrivalUnder: 20`.
- With every map option on, 55 of the 420 arrivals now start higher (Ridge Rally, Timberline Rush, Alpine Serpent and
  Panorama Ridge have most of them); the highest is Panorama Ridge from Summit Run at 259 m over the pad, 40 m under
  the ceiling. The other arrivals keep 150 m exactly.

## Removed

- Nothing replaced; the fixed 150 m in `enter` became the call to `arrivalStart`.

## Checks

- New `tools/test-heli-arrival-clear.mjs` (2,572 checks, about 30 s): every arrival with the pilot's map, Summit Run,
  the Table and Kogane Pass on, with Summit Run alone, and with the first three places: the point is 40 m over the
  ground, the level line in clears the ground, trees and rocks under it by 40 m (read every metre), it is under the
  ceiling, never under 150 m, no higher than 40 m over the highest thing within 6 m of the line, and exactly 150 m
  where an 8 m wide reading of the line already cleared. Then a session
  flies the cruise leg from Summit Run to Panorama Ridge and a pilot flies straight at the pad at the arrival height:
  no crash, over the landing circle. On the old height it fails at "Panorama Ridge from Summit Run: the line in clears
  the ground by 40 m (-61.2 m)", and the straight-in flight crashes.
- No pin moved: the suites that pin arrivals (`test-heli-summit-arrival`, `test-heli-autopilot-rescue`,
  `test-heli-summit-tune`, `test-map-destinations`, `test-heli-mode`, `test-heli-skin-session`) pass unchanged. Their
  flights arrive on lines that already cleared by 40 m (home to Tremblant Snow, Panorama Ridge, Summit Run, Pacific
  Canyon, Harbor & Highlands), and the flying area is unchanged since the arrival points did not move.
- Lane tier from PowerShell (`--changed --jobs 4 --keep-going`, on integration c6d4245d): 53 passed, 1 failed:
  `test-board`, the card in progress without a `claimed_by`; the card is done in this lane, and `test-board` (271) and
  `test-repo-hygiene` pass. `npm run build` passes.
- One independent review: no code faults. Its four notes are fixed: the card's figures (2 m reading, 259 m, 40 m under
  the ceiling), a new "no higher than it needs" check, a tolerance on the 150 m comparison, and `test-heli-mode` named.

## Changed assertions

None. No test's assertions changed; one suite added.
