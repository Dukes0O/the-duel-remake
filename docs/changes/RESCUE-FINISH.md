# RESCUE-FINISH, part 1: the leftovers from the rescue drawings

Card: RESCUE-FINISH (Claude's design; part 1 built in the `rescue-finish` lane, branch `claude/rescue-finish`).
Notes it works from: "Notes from RESCUE-VIEW" on the card, `docs/changes/RESCUE-VIEW.md`. Drawing only; with the `rescue`
switch off nothing new is created, loaded or drawn (the session gives no `rescue` view, as before).

## What changed

- **Avalanche debris model removed.** `debris.glb` is out of `tools/blender/rescue-props.py` (its builder, name, budget,
  render framing and its two snow materials) and of `tools/test-blender-output.mjs`, and the file is deleted.
  Nothing loaded it (RESCUE-VIEW builds the chunks in code).
- **The rescuer's pose** (`tools/blender/rescue-people.py`, GLBs rebuilt from the recipe and replaced):
  `rescuer-hanging.glb`: arms reaching out ahead, hands open, legs hanging, chest ring with a carabiner, two
  shoulder straps to a steel hook and swivel above his head. `rescuer-casualty-hanging.glb`: the two face to face
  and chest to chest, his arms round the casualty, the casualty turned about in an orange strop with his own straps
  to the same hook, head to one side, arms limp. Both files are centred under the hook (the cable's end) with the
  lowest point at 0 (they were centred under the feet); the `harness` empty is still the chest ring, 1.36 m up. The
  pair is 5,971 triangles, the single 4,269 (limit 6,000). The recipe also gained a side view in its review renders.
- **The stranded driver's car** (`src/heli/heli-rescue-view.js`): drawn beside the driver at the hoist site, tilted to
  the slope, with the game's own car models. The session does not name the car, so the view makes a seeded pick from
  `JOB_CARS` (the customer cars Kestrel One can lift, the list `wreckFor` draws from), the same for the same site;
  if the site ever carries a `carId` that is used instead. It stays while the driver is carried away and goes when the
  rescue ends. Nothing is asked for unless a hoist rescue is shown.
- **A crate set down in the yard stays drawn.** Each crate the session counts down is remembered where it rests, and
  drawn while the helicopter is over that course in the same run (and after the run ends, until the course changes or
  another rescue begins).
- The cable end default for the rescuer is 2.49 m (the hook), read from the file once it loads as before.
- `tools/scenarios/rescue-view.mjs` (not on the card's list, the recipe for job 4): `RESCUE_VIEW_FINISH=1` adds the
  rescuer alone and with the skier, the car at the hoist site and a crate set down in the yard, and keeps only those
  on the round 3 sheet.

## Changed assertions (for Claude's review)

`tools/test-heli-rescue-view.mjs`, one check: "the cable ends at his raised hand" (expected the old model's 2.22 m top,
tolerance 0.05) became "the cable ends at the hook above his head", expected from the loaded file's own top and chest
ring (tolerance unchanged), plus a check that the hook hangs more than 1 m above the ring. Reason: the pose changed, the
cable now ends at the hook. Nothing loosened.

## Tests

- `test-heli-rescue-view` 209 checks (was 176 plus 1 more in the changed check); new: hook over the middle of each file,
  boots at the floor, arms out ahead, the pair face to face; the car (named, seeded pick stable and varied, lies on the
  slope, stays while carried, gone after, real models draw, nothing asked unless a hoist rescue); crates remembered
  (first seen at rest, other course, run end, new rescue, leaving the view, a hooked crate is not remembered).
- `test-fire-view` 50, `test-heli-view` 98, `test-heli-mode` 176, `test-heli-rescue-session` 442, `test-heli-fire-session` 79,
  `test-heli-missions`, `test-heli-hooks` 291, `test-heli-autopilot-rescue` 169, `test-blender-output` 71: pass.
- Browser look check, headless, High, memory-only: passed; round 3 sheet in `docs/board/looks/heli-rescue-view/`.
  No frame timing.
- Gates: see the end.

## Removed

`public/assets/heli/rescue/debris.glb` and its recipe part (above). The old `rescuer-hanging.glb` and
`rescuer-casualty-hanging.glb` are replaced in place.

## Open for Claude

- The session's `view().rescue.active.sites.car` has no car id. For the car shown to be the one the recovery job later
  offers, `heli-session.js` (not owned here) would add `carId: wreckFor({seed: live.seed, courseId: live.courseId, x: 0, z: 0, day: 0}).carId`
  to the hoist `sites`; the view already uses `site.car.carId` when present.
- `heli-scene.js` makes the rescue view without passing its `vehicleAssets`, so the view keeps its own set (a second
  load of the licensed model if that car is picked). A one-line pass-through there would share it.
- The casualty on the pair is always the driver model.
- Part 2 (the frame check over the avalanche, `rescue` switch on) is Claude's.

## Review fixes (Claude)

The review found two small real faults, both fixed: the stranded car is freed when the rescue view is disposed, and the scene passes its own vehicle assets to the rescue view so the car models load once.
