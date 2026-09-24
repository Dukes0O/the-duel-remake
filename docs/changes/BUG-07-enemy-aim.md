# BUG-07: retain enemy aim error

## Scope

This slice makes flagged raider accuracy depend on difficulty and keeps CPU and
raider aim error during crossbow guidance. It does not finish BUG-07 or qualify
the expansion for release. CPU UFO use and remaining balance targets stay open.

- Raider shots use the existing CPU difficulty spreads. A separate `makeRng`
  sample hashes course seed, stage, lap and raider identity. Camp and member
  order do not change the sample, and firing consumes no shared random stream.
- CPU crossbows retain their existing sampled signed error. Both enemy launch
  paths store it on the projectile; guidance adds it to the moving target's
  lead bearing rather than gradually steering the error away.
- Biased enemy guidance samples the projectile position halfway through the
  step. The initial implementation sampled the old position and left a
  0.06162-radian error after a close-range 30 FPS step for a 0.05442-radian
  sample. Midpoint sampling removes that excess frame lag and passes the
  independent 30/60/144 comparison without changing its assertion.
- Player guidance, flag-off launch and steering, actual body contact bounds,
  damage, firing intervals, camp limits, target selection and tuning numbers
  are unchanged.

## Focused checks

Independent red tests were committed as `baae11e`: 21 checks, 8 controls passed
and 13 aim requirements failed before implementation.

- `node tools/test-enemy-aim.mjs`: 21/21 pass, including exact player/legacy
  trajectory controls, seed identity independence, damage and attack cadence.
- `node tools/test-combat-projectiles.mjs`: 35/35 pass.
- `node tools/test-combat-projectile-order.mjs`: pass.
- `node tools/test-raiders.mjs`: 6/6 pass.
- `node tools/test-cpu-combat.mjs`: pass; flag-off arena hits 1/5/10 and
  Pacific hits 1/3/7 for Easy/Medium/Hard.
- `node tools/test-cpu-pickups.mjs`: pass.
- `node tools/test-combat-replays.mjs`: expected fingerprint failure in the
  flagged `staggered-cpu-attack-turns` encounter. No assertion or stored
  fingerprint was changed by this implementation.

No browser check or broad lane/build gate has run for this candidate. This is
simulation-only work. The Director must complete review and the required merge
gate after the fingerprint decision.

## Replay evidence for independent review

An uncommitted diagnostic harness imports the production replay setup, retains
its semantic assertions, and returns its trace before hashing. It compared the
pre-change source pinned to `baae11e` with this candidate without modifying tests.
Evidence is retained under `.qa-dist/`:

- `trace-enemy-aim.mjs`
- `enemy-aim-before-traces.json`
- `enemy-aim-after-traces.json`

All three unaffected encounter hashes remain exact at 30/60/144 FPS:

| Encounter | SHA-256 |
| --- | --- |
| three-opponent-bolt-order | `e5df3bbb963058aa303929bec8a3d681a8f3ea575222d99cab7abc2e6bd1a95b` |
| rear-ram-wreck-recovery | `698fd519951a67973e0c491d1e9b6ab9c1614baaf4b82d2bc778acbe4b1e53b6` |
| armor-and-weapon-crates | `411886f3bfe12c70a96e7a983b72e0a80b923965a374d7da906ca907be186aec` |

The staggered CPU hash changes at all three frame rates:

- Before: `0ded9e86dafade32a8dd973b3e6ac0f161b844e98d5fe3085797046c540a4938`
- After: `e5c7389125132f76365e69460920d78358aac90a71ad9daafcddf18dce75ae45`

Every actor/progress sample and every event remains identical. The three shots
still occur at ticks 200, 401 and 602 from shooters 0, 1 and 2. The bomb hit
at tick 368 is still the only hit; neither crossbow hits. Only the live guided
bolts' X/Z samples change. For example, the first changed sample at tick 420
moves from X/Z -453.16509/370.80428 to -453.14957/370.84398, with Y 30.55194
and age 0.15833 unchanged. At tick 720 the remaining bolt moves from
-474.22805/406.10358 to -474.48614/405.29078, with Y 34.70068 and age 0.98333
unchanged. These are the intended retained-bias steering differences.

## One complete flagged balance measurement

Command: `node tools/combat-balance.mjs --flags wasteland2 --check`.
Wall time 73.68 s; tool elapsed 73.55 s; first 12 races 13.35 s. Exit 1.
Full diagnostic output: `.qa-dist/enemy-aim-balance.log`.

| Measure | Body-contact baseline E/M/H | This candidate E/M/H |
| --- | --- | --- |
| Wins, ten no-weapon seeds each | 5/4/3 | 9/5/3 |
| Enemy hits on player, no-weapon seed 1989 | 10/11/4 | 6/10/6 |
| Player wrecks, sixteen policy/seed races each | 6/6/3 | 0/8/5 |
| Opponent wrecks, same sample | 0/1/2 | 0/0/1 |
| Traffic wrecks, same sample | 6/15/6 | 2/12/7 |
| Stock UFO gain, seconds | 6.93/7.55/1.11 | 0.29/-5.66/1.20 |
| Max UFO gain, seconds | 2.50/8.55/1.29 | 0.55/-3.15/-5.85 |

Player crossbow probe remains 12/26 (46%); own-bomb maximum speed loss remains
4.53%. Across the sixteen races, enemy hits total 88/140/110 and player hits
on rivals total 2/5/13. Enemy-hit rows include raiders as well as CPU cars.

The two remaining check failures are Easy enemy hits 6 (target 0-3) and Medium
enemy hits 10 (target 2-6). The report's win, Hard hit, weapon probe and UFO
gain checks pass for this sample. No target was relaxed and no further tuning
experiment was run. Negative UFO gains reflect whole-race outcomes, not a
claim that the jump moved backward. CPU UFO functionality remains absent and
needs its separate slice even though these player-UFO balance rows pass.

## Owner diagnosis and replay review

After the full report, the Director authorized two short no-weapon traces at
seed 1989. They call the report's exported `run` function and observe events
without changing state; the pair took 2.67 s. Evidence:
`.qa-dist/trace-enemy-aim-owners.mjs` and
`.qa-dist/enemy-aim-owner-traces.json`.

| Difficulty | CPU hits on player | Raider hits on player | Result |
| --- | --- | --- | --- |
| Easy | 1 | 5 | Win in 105.47 s, no wreck |
| Medium | 6 | 4 | Loss in 109.28 s versus 108.83 s, no wreck |

Each race has 18 raider shots. Their targets are player/opponent 15/3 on Easy
and 10/8 on Medium. CPU attacks are seven crossbows and one bomb on Easy,
six crossbows and nine bombs on Medium. The remaining combined hit excess is
roadside pressure in this sample: CPU hits alone remain within their bands.
This identifies a next investigation; no tuning numbers were changed.

The independent reviewer reproduced the affected CPU replay in 0.51 s and
approved only its three frame-rate hash replacements. All semantic assertions,
hit and shot counts, shooter order and other encounter hashes must stay exact.
The implementation author did not change those fixtures.
