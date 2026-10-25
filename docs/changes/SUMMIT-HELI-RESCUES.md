# SUMMIT-HELI-RESCUES: rescues at Summit Run

Card: SUMMIT-HELI-RESCUES (Claude, SIM lane, no lock). Design: `docs/HELI_RESCUE.md`
sections 2, 5.4 and 5.5. Built by a helper for Claude. Switches: `rescue` and
`summit-run`, passed to the session as `rescueEnabled` and `summitRunEnabled`.
Summit rescues exist only with both on. With either off every helicopter result
is what it was (proof below). Only `src/heli/heli-session.js` changed in the game
code; no drawing, panel, board or course change.

## What changed (`src/heli/heli-session.js`)

- **Summit Run's rescues are offered.** The session now reads
  `rescueConditions({summitRun})`, so with both switches on avalanche rescues can
  be set at Tremblant Snow or Summit Run, and the supply run is set at Summit Run
  (the engine's own rule: Tremblant Snow's lodge is the supply run only while
  Summit Run is not a destination). A course counts for the supply run when it has
  a hut yard and, at Summit Run, a pickup with three clear crate spots.
- **The flying ceiling (the rule chosen).** Summit Run's ceiling is 300 m above the
  ground under the helicopter, but never lower than the old flat ceiling (300 m
  above the start). The pickup (about 570 m above the start), the hut yard (about
  720 m up) and all 12 avalanche slopes are far above the old flat ceiling; with
  the new rule each is reachable up to 300 m above its own ground. Why this rule
  and not a flat higher ceiling: the view from the air is the same everywhere on
  the mountain, so HELI-VIEW's edge-of-the-world rule still holds, and a flat
  ceiling high enough for the hut would let a pilot climb 1,000 m over the start
  area. H1's thin-air thrust rule is untouched and still decides how high the
  helicopter really climbs. It is carried by a new area field `aboveGround`
  (`courseSite(..., {summitRescue})`, set only for `summit-run` with both
  switches on); `ceilingAt(area, x, z, ground)` and `insideArea(..., ground)` read
  it, and the edge clamp in `step` uses it. Without the field, or without the
  ground argument, the flat ceiling is used exactly as before.
- **The supply run at Summit Run (packet 5.4, as settled by RESCUE-SITES).** The
  three crates (food 300 kg, medicine 200 kg, fuel drums 640 kg, the `summitRun`
  table) are laid at three clear spots beside the pickup, when the helicopter is
  at Summit Run (on arrival by the cruise leg too), not at the home pad. They are
  hooked and set down in the hut yard as before; pay is the engine's (300 a crate,
  1,000 in all, 150 less for a drop from height).
  **Where "the start area" is:** the brief says the pickup is in the start area.
  RESCUE-SITES moved it (packet 5.4 now says so): a clear circle on the open road
  about 3,430 m up, 100 m below where the race's avalanche crosses it, about 5.5
  km from the start line in a straight line and 2.3 km from the yard. The build
  follows that.
- **The truck.** The lodge's fuel truck stands at the pickup. On the ground inside
  the pickup circle during a supply run, `buyFuel` works and sells at the pump's
  price, by the tenth, like the pump. Anywhere else away from the home pad it says
  "The pump is at the home pad." as before. An empty tank on the ground at the
  truck is not "stranded" (the snowcat call is not made), like the home pad.
  `view().rescue.active.sites` for a Summit supply run is `{yard, pickup, truck,
  spots, atTruck}`; the target arrow points at the pickup while no crate is on
  the line. Nothing is drawn yet (RESCUE-VIEW).
- **recoveryGoal guard.** `recoveryGoal` returns nothing while a rescue is in
  hand (`|| live` on its first guard), so in the hold beside a driver the
  autopilot no longer flies off to the recovery job's car on the same slope.
- **Hoist site car id.** `pickSites` for a hoist adds `carId` to the site's car:
  `wreckFor({seed})` of the rescue's own seed, the same pick the engine saves as
  the wreck and the recovery job offers. The view already uses it when present.

## The switch-off proof

`tools/test-heli-summit-rescues.mjs` pins two fingerprints taken from the code
**before this card's change**:

- 1293191622: rescue on, Summit Run off (not passed, `false`, and `'yes'`): a hiker,
  an avalanche, a hoist and a supply rescue answered and flown eight seconds
  (events, saved record, view, fingerprint), the flying areas of the three
  courses, and a climb to the ceiling at the home pad. The hoist site's car id is
  left out of the hash: it is this card's one new field for a rescue that exists
  with either switch.
- 274976626: Summit Run on, rescue off: Summit Run's site and flying area, and a
  climb to its ceiling from its start.

Both are unchanged. The other courses' sites are also asserted equal with the
Summit switches on and off.

## Tests

- `tools/test-heli-summit-rescues.mjs` (new, 113 checks, about 60 s): the two
  pins; the ceiling (the area carries the new field only for Summit Run with both
  switches on; the pickup, the crate spots, the hut yard and all 12 slopes are out
  of reach under the old ceiling and reachable now; 300 m above the ground is the
  top; no other course's site moves); the climb to the pickup by script, held
  under the old ceiling with rescues off and free with them on; sixteen winter
  players with both on, Summit Run off, and rescue off (Summit Run gets supply and
  avalanche calls only with both on; the supply run is no longer at Tremblant Snow
  then); the whole supply run flown by script (the truck sells nothing in the
  air or at the start, sells in the pickup circle, three crates hooked and set
  down in the yard, 300 each, 1,000 in all, the save counts one supply run);
  the home pad answer, the cruise leg, and the crates laid at the pickup on
  arrival; an avalanche at Summit Run flown up to its slope 40 m over the
  obstacles, past the old ceiling; the hoist site's car equals the wreck's and
  the recovery job's; and the recovery-goal guard (fails without the guard,
  checked by taking it out once).
- Existing suites (autopilot-rescue 169, rescue-session 442, mode 176, jobs 612,
  missions 45 groups, hooks 291, fire-session, search, save, skins) pass
  unchanged. See the gate numbers below.

## Changed assertions

None.

## Removed

Nothing replaced.

## Open for Claude

- **The clocks are tight at Summit Run.** A supply run flown by script (a steady
  pilot at 24 m/s, flying the climb first) took about 1,380 s of its 1,500 s from
  the start area, and from the home pad the cruise leg adds about 200 s. An
  avalanche from the home pad ran out of its 720 s at the slope. A human pilot
  will be slower. Raise Summit's clocks or shorten the legs? The clock table
  (`RESCUE_CLOCKS`, `heli-missions.js`) is not named by this card, so it is
  unchanged.
- **The autopilot cannot fly up Summit Run.** It flies a straight line at the
  goal's height and hits the mountain on the way (an avalanche goal at Summit
  Run crashed it into the ridge at about 1,400 m from the pad). Climbing is the
  pilot's today. Terrain-following is in `heli-autopilot.js`, not this card.
- **The board and panel need the truck.** `heli-ui.js` shows the pump button only
  at the home pad (`view.zone` and `HOME_COURSE`). `buyFuel` works at the truck
  and `view().rescue.active.sites.atTruck` says when; the button and the drawn
  truck are RESCUE-VIEW's.
- **First tank free.** The truck uses the same `buyFuel`, so a pilot who has
  never bought fuel (`refuels` 0) would get a free tank there. Rare; say if it
  should always be paid.
- **The truck's spot** (`sites.truck`) is a point 9 m east of the pickup centre
  (0.75 of its radius), inside the circle. The drawing may move it.
- **A Summit call stored, then the Summit switch turned off** (a dev case) would
  be answerable but at a course nobody can reach. The engine shows a rescue call
  whatever its course; a fix belongs in `heli-missions.js`.
- **The ceiling field name** is `aboveGround` on the area, and `ceilingAt` is
  exported; `view().area` therefore has the extra field at Summit Run with both
  switches on.

## Gates

Owned suites: `test-heli-summit-rescues` (113). Lane tier and build: see below.

- 24 October 2026, after merging `integration/wasteland` (clean, no conflicts),
  run from PowerShell in the lane folder:
  `node tools/run-tests.mjs --tier lane --changed --jobs 4`: 140 passed, 0 failed
  (897 s), including `test-heli-summit-rescues` (113 checks, found by the
  runner's automatic discovery, no registration needed), `test-heli-rescue-session`
  (442) and `test-heli-rescue-view`. `npm run build`: pass.
  No design decision was needed beyond the ones recorded above.
