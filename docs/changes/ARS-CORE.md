# ARS-CORE: shared systems, Oil Slick and Smoke Screen

The shared core is implemented in the Arsenal lane. Arsenal remains a dev
switch; discovery admits it and AUD-ARSENAL-W1 supplies sounds before release.

## What changed

- Hazards are bounded to 24, apply once per car and hazard, respect owner
  grace, expire deterministically and clear at event or stage end.
- Timed car effects use one reading API and expire without stacking. Oil
  and Smoke keep the settled placement, duration, counters and computer rules.
  Upgrades shorten their recharge only; control effects never scale.
- All existing CPU aim, homing and RPG locks use targetFor. Numeric callers
  retain their settled ranges, including CPU Crossbow acquisition at 180 m.
  Smoke blocks the current ray; locks keep their real target identity unless
  a qualifying decoy draws aim.
- Crossbow flight keeps immutable resultant horizontal launch speed times
  remaining lifetime. The approved rangeForTarget callback evaluates each
  launch candidate's own physical reach. Both use the native lead calculation
  and full car velocity, including reverse and sideways carry. Physical flight,
  collision, expiry, projectile fields and flight RNG stay unchanged.
- Rank, purchase, free reward, upgrade and four-slot rules preserve earned
  and future ownership. Normalization never grants a new weapon.
- Claude's settled CPU rule keeps the seeded shuffle, guarantees a front
  damage weapon and limits defensive/control weapons to two. Future built
  wave weapons declare their CPU role in the catalog.
- Native App transactions preserve unknown fields and named players. Failed
  writes retry against the durable registry; unreadable and future registries
  refuse writes while local session ownership and paint remain available.

## Tests and review

Tests came first. The CPU selection slice reproduced three intended failures,
including the real rank-six all-control opponent; all thirteen focused selection
and native launch cases now pass. Existing assertions and targets are unchanged.
The combined native core, save and runtime regression passes 381 of 381 cases.
Native combat-balance recipe tests pass 29 of 29 checks.

Independent review cleared the CPU delta: four distinct slots, role limits,
unchanged shuffle draw count, isolated traffic RNG and no save mutation.
Earlier Save Guardian and launch reviews remain applicable. The retained
released-consumer comparison passes 772 checks. Ordinary road replays pass
162 checks and native combat replays pass twelve; no fingerprint changed.

The calibrated check with wasteland2 and arsenal on now passes. Across thirty
seeds per difficulty, Easy wins 26, Medium eighteen and Hard eight. CPU hits
average 2.67, 6.87 and 5.33. The Crossbow probe hits 46 percent; own-bomb speed
loss is 4.53 percent; the largest mean UFO gain is 1.72 seconds. Computers
actually use Oil three times and Smoke once. Medium moved from eighty to sixty
percent using only the approved loadout rule; no gameplay number was tuned.
The first twelve races take 45.74 seconds. Total time is advisory because a
later headless wreck-rate report ran concurrently; seeded outcomes are exact.

The native memory-only browser scenario passes in High and Performance with
eight matched captures and no console or request failures. It shows real Armory
transactions, Oil counters, Smoke occlusion/expiry and render purity. A crowded
phone HUD is inherited. The three emitted cue names may stay silent while dev.
Lane and build evidence is retained with the measurements under the ignored
.evidence/2026-10-01/ARS-CORE/evening folder.

## Removed

Removed the shared CPU acquisition cap from active player Crossbow launch and
flight, the duplicated native launch calculation, and unrestricted all-control
CPU selection. Superseded checking transcripts are folded into this note.
No existing assertion, replay pin, asset or legacy numeric interface was removed.
No live game, Preview, real save or release changed.
