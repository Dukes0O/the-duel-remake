# FIRE-HOOKS: H2 wired into the game

Card: FIRE-HOOKS (Claude, holds `busy-game-files`). Design: `docs/HELI_FIRE.md`
sections 3, 4.2, 7, 8.1, 8.3, 9 and 13; settled answers on
`docs/board/cards/FIRE-HOOKS.md`.

Needs: FIRE-MISSIONS, FIRE-SPREAD, FIRE-BUCKET, FIRE-RADIO and FIRE-CLOSE.
This lane merged all five while the last three were still in their gates;
it merges after them. The H1 dependency is met by HELI-FINISH's code at
64198f94 (the main design session ruled the pending H1 release is not a
build dependency).

## What changed

- `src/heli/heli-fire-run.js` (new): the visit's fire rules, driven by the
  session: arming after lesson 4, the call clock and its 20 s answer window,
  answer now or later, the wind and reminder lines, engine time saved every
  10 s in whole chunks (fire steps every 90 s, the quiet spell), cruise legs
  by fuel, water applied a whole drop at a time, half out, out (one save
  step: pay, scar, count, badge) and lost (the course burns today), the
  board and instrument picture (call, course, share out, wind, the hot
  edge's bearing and distance), and `fireOnNewDay` for a new play day.
- `src/heli/heli-session.js`: `fireEnabled`, `playerName` and
  `loadFireCourse` options; the bucket on the cable (fitted 6 m to the
  helicopter's right, pours while H is held, its hits dent it and charge
  nothing, never drawn as a car); `pressRadio`, `fitBucket`, `takeOffBucket`,
  `repairBucket`, `bucketRepairCost`; the view's `bucket` (water, words,
  damage, parcels, the aim ring worked out 20 times a second with the lock
  tick) and `fire`; the autopilot's fire goals; the autopilot's hang allows
  for the bucket.
- `src/heli/heli-board.js`: the Radio box (a waiting call with Answer, or
  "Fire at Tremblant Woods: 40% out, wind north-west 7 m/s") and the Bucket
  box on the home pad's ground (fit, take off, repair with its price).
- `src/heli/heli-audio.js`: `fireBeds({crackle, scoop, pour})` for the three
  loops, using the rotor's loop helpers.
- `src/app.js` (`busy-game-files`): the play day noted when a flying player
  becomes active; the closed course refused in `startCampaign` (single
  races, Grand Prix events and qualifying all start there) with "Tremblant
  Woods is closed after a forest fire."; `buyBackCourse`; the session's fire
  options; `heli-radio`; cue and hiss events; the fire loops each frame; a
  side course model at seed 1989 for fire grids; `forestFireEnabled()`.
- `src/input-contexts.js`: KeyR `heli-radio`; gamepad button 5 (Y is the H1
  camera); `pour` while H or the hook button is held (absent otherwise, so
  H1 control objects are unchanged).
- `src/screen-router.js`: passes `forestFire` to the course screen.
- `src/render3d.js` is not edited: the burnt look's one call moves to
  FIRE-VIEW, which writes `src/burnt-look.js`.

## Tests

- `node tools/test-heli-fire-session.mjs` (new), 57 checks: a mission flown
  by script on the real Tremblant Woods (the call mid-air after lift-off,
  alert then call, the fire starts, R answers, landing, the bucket fitted,
  scoops at the lake, drops aimed with the ring until the fire is out, 1,500
  credits and the badge, the scar, the quiet spell, Roger's and Sarah's and
  Brian's lines, the hiss, the bucket never drawn as a car), flown twice
  with the same save and fingerprint; answer later and the board's Radio
  box; the autopilot to the lake with an empty bucket, hovering 25 m above
  the water; switch off: no call, no fire, no bucket, nothing in the view;
  neglect: a fire left alone lost on its third to sixth play day, the course
  closed for 10,000; the app: a closed course refuses the race with its
  reason, buyback on play day 3 for 7,000 then the race starts, switch off
  closes nothing, a new date is a play day once, a player who never flew
  gains nothing. The repeat run flies two drops and compares the save then.
  About 100 s with other gates running.
- H1 suites unchanged and passing: `test-heli-mode` (150), `test-heli-jobs`
  (554), `test-heli-lessons` (63), `test-heli-hooks` (178), `test-heli-view`
  (98), `test-heli-cable`, `test-heli-flight`; also `test-input-contexts`,
  `test-course-access-ui`, `test-app-lifecycle`, `test-fire-close`,
  `test-heli-missions`, `test-heli-fire`, `test-heli-bucket`.
- Lane tier (PowerShell, `--tier lane --changed --jobs 4 --keep-going`)
  after merging integration: 168 passed, 0 failed, 0 not run in 974 s.
  Again after merging integration on 15 October (one conflict in
  `src/screen-router.js`, both changes kept: the leaderboard and the
  forest fire switch): 171 passed, 0 failed, 0 not run in 607 s; build
  passed.
  Once more after EARN-SCREEN merged (one conflict in
  `tools/test-heli-mode.mjs`'s import allow-list, both entries kept): 172
  passed, 0 failed, 0 not run in 842 s; build passed.
  `npm run build`: passed.

## Review (rule 17)

One independent reviewer read the hooks files. Fixed: a dent from dragging
the bucket through the water was not saved (now it is, so the repair
button shows); "Race here" was still offered on a closed course and ended
the visit before the refusal (no offer now, and the app refuses before
leaving); the session saved every 10 s even when nothing changed, and
wrote an empty mission record for a pilot not yet armed (now only real
changes are saved); the autopilot's fire goal stopped after a cruise leg
home (home as the destination now counts as none) and kept its old target
when the fire went out (now it falls back); the first lift-off of every
visit built the fire grid (about 0.2 to 0.3 s) even with no call possible
(the cheap checks now come first); half out and Brian's bucket lines
repeated on later visits (half out is remembered from the fire, the bucket
lines play only until the first fire is out); a drop's pending water was
not cleared on a course change or applied on leaving; the engine-time lost
event named no course; the test's repeat run flew a whole second mission.
Kept: the board's Radio box shows in flight too, and after a crash the
bucket must be fitted again (its damage stays saved).

## Changed assertions

- `tools/test-heli-mode.mjs`: the import guard approves
  `src/app.js -> heli/heli-fire-run.js` (the app's new-play-day fire steps).

## Removed

Nothing.
