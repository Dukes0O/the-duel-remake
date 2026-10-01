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
- Claude approved optional pure context.rangeForTarget(actor), evaluated for
  each candidate. Player launch still needs that callback and its native
  producer wiring. A shared scalar range cannot correctly judge a decoy
  whose launch bearing has a different physical reach.
- Arsenal is a dev switch and requires gate discovery. Earned weapons retain
  rank, purchase, reward, upgrade and four-slot rules without adding starters
  or granting ownership during normalization. CPU loadouts use seeded RNG.
- Native App transactions preserve unknown fields, future IDs and named
  player isolation. A failed-write retry merges the durable other-player
  update once; future or unreadable durable registries refuse writes while
  local session paint and ownership remain available.

## Tests and independent reviews

Tests came before each implementation slice. Existing assertions remain
unchanged. Before the new callback tests, all 374 core/save/runtime cases
reached 364 passes and ten held player-launch failures.

Four new candidate-range cases exercise actual native cars and decoy DATA,
resultant launch reach, numeric CPU acquisition, smoke and pure selection.
The focused command is:

`node --test --test-name-pattern="CANDIDATE REACH" tools/test-arsenal-runtime.mjs`

It reaches 141 checks: one case passes and three fail because the callback
is missing. Exact failures are: each candidate is accepted only within its
own resultant horizontal launch reach; the optional candidate reach excludes
the actual real car outside its vector boundary; the optional candidate reach
supplies this attack range while retaining genuine eligibility.

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

Fix the approved player-launch callback path and clear all held launch tests,
then complete native balance with weapon-use counts, High and Performance
memory-only browser counters, independent review, lane tier and build.
No current lane/full-tier, browser, balance or whole-card pass is claimed.

The three settled cue names may be emitted without sound while Arsenal is
in development. AUD-ARSENAL-W1 supplies sounds before release. Protected
external audio files remain outside this lane. Actual Dustmonger reward
settlement awaits its built fight and receipt path; no placeholder is used.

## Removed

Removed the shared CPU acquisition cap from active Crossbow flight. Removed
superseded change-note transcripts after folding their current facts here.
No game rule, asset, existing assertion, replay pin or legacy numeric target
interface was removed. No live game, Preview, real save or release changed.
