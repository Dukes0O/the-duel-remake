# ARS-CORE: shared systems, Oil Slick and Smoke Screen

Work remains in the Arsenal lane. This is a partial implementation, not a
whole-card merge or release pass.

## What changed

- Shared hazards are bounded to 24, apply once per car and hazard, support
  owner grace, expire deterministically and clear at event or stage end.
- Timed car effects have one reading API and expire without stacking.
- Oil and Smoke use the settled placement, duration, counters and CPU rules
  in docs/ARSENAL.md. Their upgrades shorten recharge only; control effects
  never scale. Damage weapons gain 15 percent damage per level.
- Existing CPU aim, homing and RPG lock paths use targetFor. Numeric callers
  retain their weapon ranges, including 180 metres for CPU acquisition.
  Smoke blocks the actual current ray; locks keep their real target identity
  unless a qualifying decoy draws aim.
- The native Crossbow producer captures resultant horizontal launch speed.
  Flight uses that immutable speed times remaining lifetime at its current
  origin. Car/profile changes cannot alter reach. Physical flight, velocity,
  steering, collision, expiry, projectile fields and RNG remain unchanged.
- The approved pure context.rangeForTarget(actor) checks each launch candidate
  against its own resultant horizontal velocity times bolt lifetime. Range
  checking and production share the native lead and direction calculation;
  full car velocity, including reverse and sideways carry, is retained.
  Numeric callers and the CPU's 180-metre acquisition range are unchanged.
- Arsenal is a dev switch and requires gate discovery. Earned weapons retain
  rank, purchase, reward, upgrade and four-slot rules without adding starters
  or granting ownership during normalization. CPU loadouts keep the seeded
  shuffle, guarantee a front damage weapon and allow at most two controls,
  as Claude settled. Later wave weapons declare their role in the catalog.
- Native App transactions preserve unknown fields, future IDs and named
  player isolation. A failed-write retry merges the durable other-player
  update once; future or unreadable durable registries refuse writes while
  local session paint and ownership remain available.

## Tests and independent reviews

Tests came before each implementation slice. Existing assertions remain
unchanged. The focused range run first reproduced thirteen intended failures:
ten player-launch cases and three new candidate-range cases. The new CPU
selection tests first reproduced three failures, including the native all-control
loadout; all thirteen focused selection and native launch cases now pass.

All 378 combined native core, save and runtime cases passed after the fix.
They include diagonal, reverse and lateral car carry, actual decoy launch
bearings, immutable flight reach, numeric CPU acquisition and smoke blocking.
The source callback never changes race state during selection.

Save Guardian independently cleared the native retry/save slice, including
old and future saves. Independent flight review cleared the immutable-speed
slice. Thirty-eight related native suites and the scoped build passed.
A retained released-consumer comparison covered twelve real launches and
thirty flight steps each, with whole bolt objects and serialized race state
unchanged when Arsenal is off. Its 772 checks passed.

Ordinary replay fingerprints remain unchanged, including the existing 162
road replay checks. No fingerprint was regenerated. Prior evidence and
receipts remain under integration .evidence/2026-10-01/ARS-CORE/.

## Still required

High and Performance passed the native browser scenario with memory-only saves,
eight matched screenshots and no console or request failures. The real Armory,
Oil contact, shield and grace counters, Smoke occlusion and expiry, and render
purity passed. Extra phone captures show an existing crowded HUD.

The required thirty-seed check completed with both switches on. Easy won
27 of 30 and Hard 11 of 30; hit bands and other targets passed. Medium won
24 of 30, above its 45 to 65 percent band, so merge is held. Computers used
Oil five times and Smoke five times. The inherited enemy-hit count includes
raider fire; it is not a count of car shots alone.

A matched native seed kept course, traffic, car, driver, armor, rank and
purchases exact. The Arsenal-off control lost; Arsenal won with the CPU
loadout UFO, Oil, Smoke and Star, which made no weapon use. Independent
analysis isolates loadout pressure on that seed; it does not prove the
whole Medium gap. Claude approved a guaranteed front attack and at most two
control slots, now implemented. The full balance rerun, independent source
review and lane/build gates remain. No target or gameplay number changes.

The three settled cue names may be emitted without sound while Arsenal is
in development. AUD-ARSENAL-W1 supplies sounds before release. Protected
external audio files remain outside this lane. Actual Dustmonger reward
settlement awaits its built fight and receipt path; no placeholder is used.

## Removed

Removed the shared CPU acquisition cap from active Crossbow flight and player
launch. Removed the duplicated native launch-direction calculation and folded
superseded change-note transcripts into these current facts.
No game rule, asset, existing assertion, replay pin or legacy numeric target
interface was removed. No live game, Preview, real save or release changed.
