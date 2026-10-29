# KOGANE-PASS-C6

Status: finishing pass done; not merged. Switch `kogane-pass` stays dev. Judge: Claude.
Pictures (1280 x 720, in the course's own light) and the contact sheet are in Claude's scratchpad
as `kogane-c6-<view>.png` and `kogane-c6-sheet.jpg`; the pictures are not committed.

## What was driven

`tools/scenarios/kogane-finish.mjs` (new browser scenario, memory-only saves, no frame timing)
drives the whole road with the test driver on Casual and then on Pro. It takes pictures at the
lakeside start, the start gantry from both sides, each of the four hairpins (entry and apex from
the chase camera), the right-turn curve boards, the stone wall section, the village run, the lower
sodium road and the finish, plus brightened companions (same camera, light and race; only the
exposure is raised) so dark places can be judged. Both laps finished with no crashes and no
boundary resets (about 0.4 s of driving after the last picture, both modes).

## Faults found and fixed

1. **Hairpin barriers and `test-circuits.mjs`.** With the switch on, the road test reported a
   wall standing in the road at s 1024 (Cedar Hairpin) and s 3304 (Sodium Hairpin). No wall stands
   in the road: the walls are the script walls, one metre outside the road edge as on every
   course, and the guardrail follows them. The test's hairpin allowance (the inside probe moves one
   metre closer to the centre line, because the sweep box turns with the bend) was written for bends
   "under 15 m" and these two hairpins are exactly 15 m, so the strict comparison missed them. The
   allowance now covers 15 m and tighter. The other hairpins (14 m Maple, 16 m Tea House) pass as
   before. The road test now also runs a second pass in a child process with every dev circuit
   switched on the way the QA build does it (`DUEL_CIRCUIT_PREVIEWS=1`), so Kogane gets the same
   road checks as the released courses, with the switch on and off in one command.
2. **Trees hanging in the air and buried.** About 300 of the 8,818 trees (and 7 of 72 boulders)
   stood tens of metres above or below the drawn ground: the course's own height formula is far off
   from the drawn ground beside the switchbacks (a cedar floated above the Tea House Hairpin in the
   pictures). New optional scenery setting `onDrawnGround` in `src/track-script-course.js`: it plants
   every tree on the drawn ground and drops a boulder that would not sit on it. Only Kogane sets it,
   so no other course changes (world signatures and replay checks pass).
3. **Curve boards pointed the wrong way on right-hand hairpins.** Maple and Sodium Hairpin (both
   right turns) showed left-pointing arrows. Turning a board round never changes which way its
   arrow points. The `chevron-board` recipe (`tools/blender/kogane/scenery.py`) now carries the
   arrow on both faces, left from the front and right from the back, and the right-hand hairpins
   place the board turned round. Rebuilt with Blender for `chevron-board` only: 28 to 32 triangles
   (caps 200/100), 4,876 to 5,096 bytes, `tools/blender/kogane/scenery.json` updated for that model.
4. **No finish marker.** The race ends at the end of the road and nothing stood there. The same
   gantry as the start now stands 2 m before the end, facing the oncoming cars.

## Checks

- `tools/test-circuit-kogane.mjs` gains: every tree on the drawn ground, no boulder in a slope,
  the curve board arrow follows the turn direction, two gantries with one at the finish.
- Changed assertion: `tools/test-circuits.mjs`, hairpin allowance from "under 15 m" to "15 m or
  tighter", described above. It only shortens the inside probe at bends of exactly 15 m; nothing
  else is loosened. Claude's written review is needed (rule 18).
- Gates are listed at the end of this note.

## Open list (larger, not fixed here)

- The mossy stone wall reads as tiles: every 4 m piece is the same, each block carries the same
  green leaf of moss in a straight grid. Needs another art pass on the stone recipe (a few
  variants, irregular moss), or a second wall piece alternated with it.
- Concrete barrier blocks on the outside of the hairpins leave small wedge gaps on the curve
  (straight 4 m blocks on a 15 m radius). The physical wall behind them is continuous.
- The far wall pieces at a distance (stone retaining wall LOD) read as plain flat slabs.
- Behind the start (before s 0) the terrain ends in a V-shaped notch against the sky; seen only
  when looking back from the grid.
- A few pale thin trunks stand out above the crowns of the tallest cedars in the lamp light.
- The sodium lamp pools read as flat orange ovals on the road at the lower hairpin; the existing
  Harbour setting, left as is.
- At night the hillsides away from the lamps are almost black in the native light (judged on the
  brightened companions; the light path is C5's and unchanged).

## Removed

Nothing replaced. The review pictures are `.evidence` and are deleted with the lane folder's
scratch output; no sheet is committed.

## Gates run (jobs 2, browser one at a time, no frame timing)

- `tools/test-circuit-kogane.mjs`: passed (Casual 108.35 s, Pro 107.71 s, no crashes or resets).
- `tools/test-circuits.mjs`: passed with the switch off (28 events, 208,982 checks) and on (29 events,
  216,698 checks).
- `tools/test-drive-through.mjs`: 7 of 7 passed. `tools/test-world-composition.mjs`: 57 checks passed.
  `tools/test-ground-rows-exact.mjs`: passed (40,696 heights).
- Lane tier `--changed --jobs 2 --keep-going`: 183 passed, 0 failed, 0 not run (1,529 s).
- Build (`node node_modules/vite/bin/vite.js build`): built.
- Browser scenario `kogane-finish`: passed, 40 pictures, 0 warnings, 0 errors.
- Other courses' world signatures and replay fingerprints are unchanged (the lane guards passed).

## Claude's review (28 October 2026, night)

Approved (Claude, look judge on 12 views; independent review). Changed assertion (rule 18): the road check's hairpin allowance now covers bends of 15 m or tighter (was under 15 m), so the two 15 m hairpins get the same 1 m inside probe as the others; nothing else loosened; test-circuits now also runs every dev circuit switched on. Optional onDrawnGround planting for Kogane only. Open for release: the mossy wall repeats like tiles; concrete block gaps on hairpin outsides; low-detail wall slabs.
