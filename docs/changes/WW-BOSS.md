---
task: WW-BOSS
status: done
flag: story-everburn
player_facing: no
---

# WW-BOSS: Old Smoke's furnace chase

Built from "Settled design (Claude, 9 November 2026)" in `docs/board/cards/WW-BOSS.md`. The switch `story-everburn` stays
`dev`, so nothing here reaches a player yet. No other switch changed, and no new switch was added. Job 6's second step is the only
place the new rules run.

## What changed

- **The furnace now follows the design.** `src/world/jobs/old-smoke.js` holds every rule as plain numbers with no drawing and no
  sound: three legs with one door each (left on the open flats, right in the Boneyard, rear on the run back to the well), the
  stoke, glow and slam rhythm, cinders, the shoulder shove, stagger and speed-up, the roll into the well, and the Hard escape. It
  uses no random numbers, so the same inputs always give the same chase.
- **The path.** About 3,153 m from the well across the flats, past the planes (11 to 17 m clear of the plane block), round the Boneyard and
  back along the run to the well. At the base pace of 14 m/s that is 225 seconds, a little under four minutes. Leg 1 is the first
  1,690 m, leg 2 the next 1,234 m, and leg 3 the last 229 m. The path and the legs are data in `src/world/jobs/everburn.js`.
- **Rhythm.** The stoke lasts 4 seconds, the door then glows for 6 (Easy), 4.5 (Medium) or 3.5 (Hard) seconds, then slams and the
  rhythm starts again after 3 seconds. A hit on the glowing door ends the leg. A hit on a shut door, the wrong side or the wrong
  leg's door counts for nothing. Any weapon counts, and so does ramming the open door with the car.
- **After a hit.** It staggers for 2 seconds (at a quarter of its pace), a plate falls off, the smoke turns blacker and the vent's
  story line plays. On Medium and Hard it then runs a tenth faster. Its fastest pace (16.9 m/s) is less than a third of the slowest
  car's top speed.
- **The end.** The third hit turns the furnace for the well. It rolls in over exactly 5 seconds. The job ends when it falls in. A
  car within 30 m of the well then loses armour (15 Medium, 20 Hard, none on Easy) but never below 1, so nothing after the third hit
  can lose the job.
- **Losing.** Only a wrecked car loses: the furnace waits while the car is wrecked, then the chase starts again from the well. The
  three waves are not played again. On Hard the furnace also escapes if it finishes the whole path with a door unbroken; the chase
  then starts again. On Easy and Medium it turns round at the well and drives straight back to the start of the leg whose door is
  still unbroken, so a miss never loses.
- **Easy.** Longer glow, a door 2.0 m wide to hit (1.2 m on Medium and Hard), no speed-up, cinders that only slow the car (it
  cannot go more than 14 mph faster than the furnace while in them), shoves half as costly (10 armour, not 20), and an arrow
  in the HUD's call-out line when a door starts to stoke ("<< LEFT DOOR OPENING", "RIGHT DOOR OPENING >>", "REAR DOOR OPENING
  (BEHIND HIM)").
- **Cinders.** A burning patch every 6 m, 5 m behind the furnace, each lasting 5 seconds. On Medium they cost 5 armour a second and
  on Hard 8.
- **The shoulder.** A car beside the furnace (within 5 m along it, 2.5 to 9 m out) for 3 seconds while no door glows gets the
  horn for 1.2 seconds, then a sideways shove that costs 20 armour (10 on Easy). Dropping back, crossing over or a door opening
  cancels it. After a shove there is a 3-second rest.
- **Hooks in `src/arena/modes/world-job.js`.** The job loop now steps the furnace each tick, routes weapon hits on a door to the
  furnace's rules (the combat code reports any touched door with damage 1; the furnace decides whether it counts), offers only the
  glowing door as a hit target, applies armour, speed cap and shove to the player's car, and plays the cues. It also now turns a
  story line id such as `story.ember.cinder.18` into its words (`captionFor`), where before the raw id was shown.
- **Look.** The scene (`src/world/scablands-scene.js`) lights the open door's vents (left door: the left flank vents, right door: the
  right flank vents, rear door: the three rear vents), turns the smoke from grey to orange through the stoke and blacker after each
  hit, and hides two of the six armour plates with each hit. This reads job state only.
- **Art notes.** The furnace is already drawn half again as large with the game's smoke and fire (WW-BOSS follow-up of 5 November).
  The remaining Round 3 fault, that the furnace shares Big Bess's cab, needs a Blender model change, so it is not done here.

## Decided while building (the design did not say)

- **Door order and ground.** A door can open only on its own leg's ground and only after the earlier legs' doors are broken, so
  the doors always fall left, right, rear. A door that is not broken when the furnace leaves its ground simply waits for the next lap.
- **Opening delay.** The first stoke starts 4.5 seconds after the furnace appears, so the two opening lines (Old Smoke, then Cinder)
  finish before the Easy arrow needs the call-out line.
- **Where the doors are.** Left and right doors sit 2.4 m out from the furnace's centre and 1 m behind it; the rear door sits 4.2 m
  behind. A car rams a door when its centre is within the door's width plus 1.6 m of the door and on that side of the furnace
  (lateral 1.6 m or more for left and right, 2.5 m or more behind for the rear). Any speed counts.
- **Roll-in.** A straight glide to the well in exactly 5 seconds, from wherever the third hit landed. Because leg 3 is only 229 m
  long, the dash is at most 46 m/s, still slower than the slowest car's top speed.
- **Job ends at the fall.** The furnace's health stays at 1 after the third hit and drops to 0 when it falls in, because the chase
  step ends on health 0 (`src/world/jobs/steps/chase.js` is not changed). The chase step's data now has `contactRadius: 0` and
  `leashDistance: Infinity`, so touching the furnace or falling behind never ends or restarts it.
- **Wreck.** The furnace freezes while the car is wrecked, and the chase restarts when the car is back in play. Cinders and the fall
  use the same armour call as the Magnus clang (`applyArmorDamage`, 'fixed'); cinder armour is taken in chunks of 2.
- **Shove.** The shove keeps the car's own speed and adds 5.6 m/s sideways (the same strength as Magnus's clang), using the same
  knock the arena already has.
- **Lines.** The chase step now starts with `story.ember.old-smoke.2` then `story.ember.cinder.17` and ends with
  `story.ember.cinder.20`. Hits play `story.ember.cinder.18`, `story.ember.old-smoke.3` and `story.ember.cinder.19`. The wording of
  every line is unchanged.
- **Hit height.** The furnace's height comes from the Scablands ground (`scablandsSurfaceHeightAt`), not from the path's zero.
- **Unused Easy data.** `easy.ventRadius` in the job's own data (never read by any code) said 10 and now says 2, matching the design.

## Cues (existing sounds only, played through the arena tell event)

| Event | Cue |
| --- | --- |
| Stoke (bellows rise) | `arena.tell` |
| Door open | `gate.latch` |
| Door slam | `vehicle.landing` |
| Hit on a door | `combat.hit-confirm` |
| Shove warning (the horn) | `arena.toll-gate` |
| The shove itself | the ordinary `combatHit` event (`combat.hit`) |
| The fall into the well | `combat.explosion` |

No audio file was added.

## Changed assertions (for Claude's review)

Nothing was loosened. Each removed assertion tested the stub's three vents that took turns every 3 seconds, which the design replaces.

- `tools/test-old-smoke.mjs`: replaced as a whole. Removed: `oldSmokeGlowingVent` returns 0, 1, 2 and repeats every 3 seconds (the
  function is gone); three vent targets with damage `[0, 1, 0]` and glowing flags (now only the open door is a target); vent positions
  1 m apart (doors are now on the flanks and rear); `worldJobHitTargets` shows `[0, 1, 0]` (now one target or none); three timed
  hits finishing through `stepChase` health (the chase now ends at the fall).
- `tools/test-scablands-scene.mjs`: the model stand-in now has the three rear vents and three vents on each flank, as the real model
  does. "The visible first vent matches the first chase vent" (`[2.8, .15, .15]`) became "the open left door lights the left vents,
  the others stay dark". "The glow advances with the simulation clock" (`[.15, 2.8, .15]` at 3 seconds) became "the glow follows the
  furnace's open door" for left, right, rear and the stoke. The lit-vent position check uses a left flank vent. Added: smoke colour
  and plate checks. The furnace position, heading, scale, fire and smoke assertions are unchanged.
- `tools/test-everburn-easy.mjs`: the 8 in 10 threshold is unchanged. Its driver for the furnace used to steer at the furnace and
  win by coming within 10 m; contact no longer ends the chase, so the driver now waits beside the next door and rams it (same plan
  as the young driver in `test-old-smoke.mjs`), still firing the loaned weapon. All nine jobs finish 10 in 10.

## Checks

- `node tools/test-old-smoke.mjs`: 280 checks passed (24 s). It covers: the legs and doors in order; rhythm times for each difficulty;
  only the open door is a target and its size; a shut door, the wrong side and the wrong leg count for nothing; three hits end it; the
  stagger, plate and speed-up; the furnace slower than half the slowest car after every speed-up; a miss never loses on any
  difficulty (twenty minutes without a hit); the Hard escape; the roll-in and the fall; cinders; the shoulder, the horn and the shove;
  ramming each of the three doors; the same inputs giving the same chase twice (rules alone and in a real Duel); the world-job
  hooks (shut door, wrong side and open door by real weapon reports); a wreck restarting the chase without the waves; nothing able to
  lose after the third hit; the cues; and a scripted young driver on Easy who only rams winning 10 chases in 10 over ten seeds
  (the test needs 8).
- `node tools/test-scablands-scene.mjs`: passed. `node tools/test-everburn-easy.mjs`: all nine jobs 10/10, The Everburn included.
- Real weapons (not in the test): in a scratch run the flamethrower, crossbow and bomb each broke a glowing door from 9 m.
- Scratch play with the same driver (not committed): Medium 10 of 10 (armour about 46 of 121 left at the end); Hard 10 of 10 (one
  wreck and restart, finishing about 386 seconds in).
- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4`, from PowerShell): 61 passed, 0 failed, 0 not run (475 s). The
  replay fingerprints were unchanged (297 checks across 33 cases). It ran before the last, presentation-only addition (the falling
  plates in the scene and their checks); `test-scablands-scene.mjs`, `test-old-smoke.mjs` and the build were run again after it and
  pass. The `salt-flats.py` tracebacks in the lane output belong to the Salt Flats test's own negative cases; that suite passed.
- `npm run build`: passes.

## Not checked or not done

- Browser play of the chase on Easy and Medium, and the look of the doors, smoke and plates in the browser: Claude runs these.
- The Easy arrow is the HUD call-out line with an arrow in its text, not a drawn arrow; a drawn arrow needs the HUD code, which is
  outside this card's files.
- The camera trembling within 30 m, the door rattling in the stoke, and the flame rising to the mast at the fall are not done. The
  first needs the camera code; none is race state. The mast flame belongs to the story's finished state.
- The furnace model still shares Big Bess's cab (needs Blender).
- Hard has only been played by a scripted driver; its glow of 3.5 seconds and cinders at 8 armour a second are for Claude's play to judge.

## Removed

- The stub's three vents that took turns every 3 seconds (`glowSeconds`, `ventOffsets`, `oldSmokeGlowingVent` and the old
  `oldSmokeVentTargets(actor, elapsed)`), and the use of the job clock (`startedAtSec`) to drive them in the scene and the job loop.
- The chase ending by coming within 10 m of the furnace, and the 180 m leash that restarted it.
- The short route of three points (well, furnace-run, furnace-return).
- The scene's vent-by-number glow, replaced by the door glow.
