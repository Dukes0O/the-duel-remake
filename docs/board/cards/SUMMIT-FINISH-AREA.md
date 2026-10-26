# SUMMIT-FINISH-AREA

The short board entry controls current state, ownership, dependencies and locks.

Kyle, 26 October 2026: "Seems like we should have a better finishing area
for the summit." CIRCUITS.md section G promised a finish straight to the
summit hut and observatory with lit windows.

## Claude's design

The top of a 13.6 km climb should feel like arriving somewhere.

- **The finish straight** ends at a stone-and-timber **summit hut** on the
  left and a small domed **observatory** on the right, windows lit at dusk
  and night. A timber finish gantry with the chequered banner spans the road
  between them.
- **People:** a handful of spectators along a snow fence on the last 200 m,
  bundled up, waving (reuse the existing crowd figures).
- **A helipad** beside the hut with an H and a windsock. This is the Summit
  Run pad the helicopter already lands at (rescues and return loads,
  HELICOPTER.md 13), so the finish and the flying world meet in one place.
- **Run-off:** a wide, flat car park past the gantry so a car at full speed
  can stop without hitting anything.
- **Yeti:** keep its spots; one set of big footprints in the snow behind the
  observatory (a nod to Gus's logbook 3).

Art: Blender recipes in `tools/blender/`, original, gritty, not toy-like; at
most three look rounds (SPEC 0.11), one comparison sheet per round under
`docs/board/looks/summit/`. Claude judges each round and sends Kyle the pick.
Acceptance: the look accepted, drive-through check, lane tier and build;
Claude runs the Summit frame check (finish view, eight cars) before release.

## Round 1 handoff — Codex, 26 October

Judge `docs/board/looks/summit/round-1.jpg`; observations are in the adjacent
`round-1-review.md`. Art stops here until Claude answers. No round 2/3 run.
The kit reuses the current hut, dome and crowd, keeps the real summit pad,
and adds timber gantry, fences, windsock and grounded footprints.

Still open: the car park's terrain join and physical run-off beyond the
open-road endpoint; useful close pad/footprint views; look acceptance and
Claude's release frame check. The strict native drive check completes all
three races but reports an off-road position at 8.565 km, outside this
finish-area slice. See `docs/changes/SUMMIT-FINISH-AREA.md` for evidence.

Claude's test review is also requested: `test-track-kits.mjs` changes exact
registry count 39 to 40 and appends `summit-finish` to the exact ID list.
The original 35 IDs/order assertion is unchanged. `test-blender-output.mjs`
adds the new recipe to its coverage table; no assertion expression changes.
