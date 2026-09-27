---
task: CRASH-04
status: ready-to-merge
kind: feature
flag: crash-physics
player_facing: yes
---

# Mad Max Duel crash physics (27 September 2026)

Kyle: "crash physics are good in the duel, however, there are none in mad max
where they most certainly should be built out." Design in
`docs/CRASH_PHYSICS.md` section 6.

## Cause

Ordinary Mad Max rams already went through the solver (a headless rear-end
moved the rival identically in both modes). Three older rules took over at
the moments that matter: a wreck (armor at zero) stopped the car dead on the
spot; traffic hit above half the attacker's top speed vanished in a scripted
burst; and ram damage used closing speed only, so mass did not count and the
armored player almost never spun.

## Changes

- `src/combat-armor.js`: under crash physics on the road, a wreck keeps its
  motion (`startWreckSlide`); ram damage from each car's own Δv (`ram-dv`);
  armor follows the car's own mass, not kit plating; recovery clears a knock.
- `src/vehicle-knock.js`: `crashStyle` (Mad Max launch, tumble and slide),
  `startWreckSlide`, `stepWreckSlide` (a driverless skid that stops at
  solids); wrecks and launched traffic use the Mad Max style.
- `src/vehicle-collision.js`: `CRASH_TUNING.madMax`; `impactSeverity` takes
  the launch threshold.
- `src/sim-contacts.js`: Mad Max roadside traffic is decided by the solver
  (smash or launch explodes, lighter hits shove); Δv ram damage; the player's
  armored spin bar is 45 mph on the road and stays 70 in the arena; kit
  plating adds mass in `_vehicleSpec`.
- `src/sim-rival.js`: a wrecked computer car slides to rest and recovers
  where it stopped. `src/sim-crash.js`: the player's Mad Max wreck skids a
  quarter further.
- `src/armor-kits.js`: `massKg` per kit and `armorKitMass`.
  `src/wasteland-tuning.js`: `ramDvThresholdMph` 8, `ramDamagePerDvMph` 1.
- `tools/combat-balance.mjs`: accepts `--flags crash-physics`, so balance
  runs no longer need an in-memory loader.

## Tests

- New `tools/test-madmax-crash.mjs` (11 tests; the first nine were run red
  first, eight failing for the intended reasons): exploding hulk slides at least 40 m and
  ends off the road with no dead stop; explosions start at a smash; a light
  shove still just knocks; a launch rolls more than in Rival Duel but under
  1.25 turns; a wrecked rival slides at least 15 m and recovers where it
  stopped; the player's wreck skids on; Δv damage (Titan into Falcone over
  five times the reverse; an equal-mass 60 mph rear-end without spikes 25 to
  45 armor); spikes
  multiply Δv damage by 1.5; the armored player spins at about 50 mph of Δv
  but not at a 40 mph bump; kit plating adds mass; switch off unchanged.
- Related suites pass: crash slide, knock integration, collision, knock-away,
  armored impact, ramming, armor kits, combat balance.

## Changed assertions

- `tools/test-armored-vehicle-impact.mjs`: the 105 mph closing Banshee rear
  ram (about 63 mph of Δv) now spins the armored player (was: no knock below
  70). Still no crash or penalty.
- `tools/test-combat-knockaway.mjs`: the shoulder test uses a shove speed
  (15% of top speed) so it still tests a shove; the hard-hit test now expects
  a sliding physical hulk instead of a vanished car; the hard-hit and oncoming
  tests start the cars just touching (the old 3 m overlap gave the solver a
  false side contact). Switch-off tests are unchanged.
- `tools/test-combat-ramming.mjs`: the three spike-bonus tests run with crash
  physics off, where the closing-speed rule still applies; the Δv spike bonus
  is tested in the new suite.
- `tools/test-crash-slide.mjs`: the Mad Max shove uses 25 mph of closing speed;
  55 mph is now a smash that explodes.

## Race fingerprints

`tools/replays/combat-fingerprints.json` re-recorded (crash physics on):
`rear-ram-wreck-recovery` (the wreck slides; damage by Δv) and
`three-opponent-bolt-order` (includes car-to-car contact). The other two
encounters are unchanged, and all 12 frame-rate checks match at 30, 60 and
144 FPS. Race replays without combat are unchanged.

## Balance

`node tools/combat-balance.mjs --check` passed with `crash-physics` alone and
with `wasteland2,crash-physics`, with every target met. Wins by
Easy/Medium/Hard: 9/5/2 and 8/5/2 (before CRASH-04: 9/5/2 and 8/5/3; the
Hard sample lost one win to harder rams, inside its band). Traffic wrecks
with wasteland2 rose from 5/17/7 to 16/20/11 across the difficulty samples,
the intended extra carnage. A first pass at 1 armor per mph gave an
equal-mass hit only 22 armor, barely above the old 19, so the rate is 1.25.

## Removed

- The scripted vanishing burst for Mad Max traffic under crash physics (kept
  only with the switch off, until CRASH-RELEASE turns the switch fully on and
  removes the switch-off path).
- The in-memory module loader workaround for balance runs.
