# HELI-FINISH

Claude's finishing pass on the helicopter's first slice (docs/HELICOPTER.md
section 11). The release is prepared but not made: it waits for Codex's
Kestrel One model (HELI-ART-SRC) and for Kyle's word.

## Flown

`tools/scenarios/heli-first-flight.mjs` and the new
`tools/scenarios/heli-finish.mjs` fly the whole slice in a real browser
with memory-only saves:

- A new pilot: HELIPAD on the main menu, the opening on the radio, the
  instructor's board with Skip, the free first tank, lesson 1 from its
  button. (All four lessons are also flown headless in
  `tools/test-heli-lessons.mjs`.)
- A trained pilot: hook the Falcone F42 beside the pad, climb, choose
  Panorama Ridge, the autopilot flies out of the area, Enter to cruise,
  arrive 1.5 km out at 150 m, the autopilot stops over the zone, let the
  car down, H to let go, "Delivered", Race here, and the race starts at
  Panorama Ridge with the F42. 0 browser errors.
- Each destination from 150 m, the four camera views and the pause
  screen (earlier cards), all still working together.

## Frame check (rule 8)

150 m over Panorama Ridge with the car delivered, hovering on the
autopilot, 120 frames each, with no other gate, build or browser check
running: High p50 16.7 ms, p95 16.8 ms; Performance p50 16.7 ms, p95
16.8 ms; no frame over 33 ms (limit 18.5 ms). Measured with the plain
stand-in helicopter; one more check is needed once the real model (at most
20,000 triangles) goes in. The laptop's own screen was not switched off
for this run, so it is reported, not a release figure.

## Fixed in this pass

- Stop pressed during the 3 seconds after a crash in a lesson now cancels
  the lesson's restart (the HELI-LESSONS review's last note).

## What Kyle should try (Preview, with the helicopter switch)

1. Main menu: HELIPAD. Listen to the opening; try lesson 1 or Skip.
2. Lessons 2 to 4: hover in the circle, land on the H, carry the crate.
3. Fill up at the pump (the first tank is free), take a job on the
   dispatch board, or "Fly my car".
4. Hook your car with H (hover with the hook at its roof), press P with
   Panorama Ridge chosen, Enter when the cruise prompt shows, let the car
   down in the yellow ring, H, then Race here.
5. Try Real mode later (the collective stays where you leave it).
6. Listen to the rotor, wind, engine start and stop, and the radio voice.

## Before the release (not done; waits for Kyle)

- Done in the second turn: Kestrel One replaces the stand-in. Still from
  HELI-ART-SRC: the cargo hook, helipad and fuel pump models (the pad's H
  and the hook are drawn simply until then).
- Kyle hears the radio voice and the library sounds (Claude's round-one
  verdict was by measurement only).
- The switch `helicopter` goes from `dev` to `on` only at Kyle's "go
  live", by the Release Manager, with the full tier on the exact release
  commit (AGENTS.md, Gates).

## Checks

- `node tools/test-heli-lessons.mjs`: 63 checks (the Stop fix added three).
- Review (rule 17): CONFIRMED (the Stop fix, and the playthrough
  scenario cannot reach real saves or the live port: memory storage, a
  fresh browser profile, a private port). Its one note, check that the
  second crash really happened, is added.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`
  (PowerShell): 131 passed, 0 failed, 0 not run in 868.90 s before that
  last test line; rerun after it: 131 passed, 0 failed, 0 not run in
  1557.48 s.
- `npm run build`: passed in 998 ms.

## Changed assertions

None.

## Removed

Nothing was replaced. Picture evidence deleted after review; the verdict
is above.

## Kestrel One wired in (14 October, second turn)

The main design session built an original Kestrel One
(`tools/blender/kestrel-one.py`, `public/assets/heli/kestrel-one.glb`,
12,580 triangles, 539 KB) to the HELI-ART-SRC contract. This turn puts it
in the game:

- `src/heli/heli-scene.js` loads the model on the first helicopter frame
  (nothing is downloaded by a player who never flies or has the switch
  off),
  spins `main_rotor` about +Y and `tail_rotor` about its X as before, and
  hangs the cable from `cable_hook`. The stand-in code is removed in this
  same change. While the model loads (a moment) the helicopter is not
  drawn; a failed load is reported (`modelStatus`, `modelError`) and never
  replaced with a stand-in.
- `src/heli/heli-camera.js`: the cockpit view sits at `pilot_eye`
  (`PILOT_EYE`, the right-hand seat), turned with the helicopter's full
  attitude (`heliToWorld`: roll, pitch, heading), and looks ahead nearly
  level (about 4 degrees down instead of 9), so the panel stays along the
  bottom. The whole helicopter (cable and rings too) shows only once the
  model is in.
- `tools/test-heli-view.mjs` (98 checks): every named node in the model,
  the eye at `pilot_eye`, the rotor pivot at 2.85 m, at most 20,000
  triangles; the real file loaded through the scene, rotors spinning, the
  cable starting at `cable_hook` and the cockpit camera at `pilot_eye` with
  the helicopter banked and pitched, no download before the first
  helicopter frame, no stand-in, and a failed load reported.
- Browser: the whole playthrough again with the model, 0 errors; the four
  views checked by eye.
- Frame check with the model, 150 m over Panorama Ridge: High p95 16.8 ms,
  Performance p95 16.8 ms, no frame over 33 ms. One other team's lane
  gate was running during it, so this is reported as indicative; the full
  check repeats it.

What is off in the model (sent to the design session): `pilot_eye` sits
about level with the top of the instrument panel's glare shield, so in the
cockpit view the dark shield still fills the lower left of the screen.
Raising `pilot_eye` about 0.2 m, or lowering the shield, would clear the
view. Everything else matches the contract: node names, the mast pivot at
2.85 m, the tail rotor hub, the hook under the mast, metres, +Y up and the
nose toward +Z. The simulation's rotor height for strikes stays 2.6 m (the
model's 2.85 m pivot is 0.25 m higher; no change needed for H1).

Review (rule 17): one independent reviewer found one real fault, the
cockpit eye ignored pitch and roll (in a 20 degree bank it sat outside the
hull), and recommended loading the model only when flying. Both fixed with
tests; the reviewer confirmed. Lane tier (PowerShell): 33 passed, 0 failed,
0 not run in 125.54 s; build passed in 844 ms; the browser playthrough
passed again with 0 errors.

Removed: the stand-in helicopter (boxes and cylinders) from
`src/heli/heli-scene.js`.

