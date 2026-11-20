# BOWL-TRICKS-ALL

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Astra** (physics and graphics: every vehicle doing the tricks, and drawn doing them). Kyle, 20 November 2026: graphics and physics go to Astra, the rest to Sol.

The trick set for every vehicle, and on the Titan Monster Arena. Design: [BOWL-SHOW-2](BOWL-SHOW-2.md), section 2, "Every
vehicle". Kyle, 20 November 2026: "the freestyle mechanics should be enabled for all vehicles that can play in the
Monster Arena."

**What is true today:** any unlocked car can enter the Monster Arena (`src/screen-menu.js`: "Any unlocked car can enter";
the Titan is recommended because lighter cars cannot crush wrecks). The Bowl's air control answers only to the show's
truck on the Bowl.

## What to build

1. **Every vehicle.** The trick rules of BOWL-TRICKS work for whichever vehicle is driving. The keys, the turning speeds,
   the landings and the points are the same for all. A vehicle's own weight and power decide its air, and a car too
   light to crush still cannot crush (that rule is unchanged). Which vehicles: every one the menu lets a driver start the
   Monster Arena in, by that rule and not by a list, so that a new vehicle has the tricks on the day it is added.
2. **On the Titan Monster Arena** (`titan-arena`), whenever it is played: the course's own data says tricks are on
   (`tricks: true`), as the Bowl's does. In a race there the tricks are a show beside the race: they are named, scored and
   cheered, and they do not change who wins. The trick score is shown at the finish beside the result.
3. **The driver sees it:** BOWL-HUD's pop-ups and its trick card (H, paused) work there, with the crowd meter. The race's
   own screen is otherwise unchanged.
4. **Each vehicle drawn doing it:** the view tips, rolls and turns whichever vehicle is driving from the same pose the
   rules keep. Say in the change note which vehicles were looked at, and list any whose model draws wrongly on its back
   wheels or upside down, for Claude.
5. **Behind a switch of its own,** `arena-tricks` (dev) in `src/feature-flags.js`, because the Monster Arena is a released
   course and the Bowl is not. With the switch off, a race at the Monster Arena is exactly as it is today.
6. **The roof:** on a course where a roof landing wrecks a car today, a Slam with tricks on rights the vehicle in 1.5
   seconds as on the Bowl. Say in the change note what a roof landing did at the Monster Arena before.

Not in this card: the Titan Stunt Trial and the Freestyle Playground. Kyle named the Monster Arena; either can take the
same line of course data later.

## Files and locks

`src/bowl/bowl-tricks.js`, the Monster Arena's course data in `src/config.js` (one field), `src/feature-flags.js` (one
line), the trick call in `src/sim-driving.js`, the vehicle's pose where a car is drawn (`src/bowl/bowl-view.js` hands it
over to the game's own car view; one hook), `src/bowl/bowl-hud.js`, `tools/test-bowl-tricks.mjs`,
`tools/test-feature-flags.mjs`. Locks: `bowl-night`, `replay-fixtures`. If the hook for the pose must be in
`src/render3d.js`, take `busy-game-files` too and say so.

## Checks

1. `tools/test-bowl-tricks.mjs`: on the Monster Arena with the switch on, a light road car, the rally car and the Titan
   each land a wheelie, a donut, a spin and a backflip by scripted keys, named with the table's points; a race's winner
   and times are the same with and without tricks done by a driver who loses no speed to them.
2. With the switch off, the replay fingerprints of `titan-arena` are unchanged. With it on, any pinned replay that moves
   is re-recorded with a one-line reason each in the change note (W and S in the air now tip the vehicle and do not
   change its speed).
3. Laptop only, Claude runs: a race at the Monster Arena by hand in three vehicles, with a look at each one's wheelie and
   flip.

## Sound cues

None new: the events are BOWL-TRICKS's (`bowl.trick.land`, `bowl.trick.new`, `bowl.trick.slam`, `bowl.trick.wheelie`,
`bowl.trick.cyclone`), played at the Monster Arena as on the Bowl, with `bowl.crowd.rise` for its crowd.

Builder's checks, then the lane tier and `npm run build`, recorded in `docs/changes/BOWL-TRICKS-ALL.md` with a Removed
line. Before CARD DONE, search `tools/` for `titan-arena` and `SHOW_TRUCK` and bring each older suite and scenario that
names them up to date. No Chrome under `codex exec`: any browser scenario is "Claude runs". Memory-only saves. No new
dependency, network request or key. Clean up nothing outside this lane.

## Result screen hook for Claude

The Monster Arena race uses the ordinary result card in `src/screen-results.js`. Its result metrics are assembled there. Please grant a read-only hook in `createResultsScreen` to show the trick score alongside the time and finishing position when arena tricks are active. The ordinary race result still decides the winner and the payout. This card is queued behind BOWL-HUD.

## Claude answers, the result screen hook (20 November 2026)

**Granted:** a read-only hook in `createResultsScreen` (`src/screen-results.js`) that shows the trick score beside the time
and the finishing place when arena tricks are on. The ordinary race result still decides the winner and the pay; with the
switch off the card is exactly as before. Build it after BOWL-HUD merges, as queued.
