# BUG-07: retain enemy aim error

Final candidate: separate raider cones of 10 degrees / 10 degrees / `.03`
radians, retained CPU/raider shot bias and reviewed split-budget steering.
Focused checks pass 23/23 and combat replays 12/12. The final balance report
has one remaining failure: Easy enemy hits 6 against a maximum of 3. Wins are
9/5/3, with all other report targets passing. This remains development work;
BUG-07 and its CPU UFO slice stay open. The history below records the measured
candidate and the reverted Easy regression.

## Initial rule correction

This slice makes flagged raider accuracy depend on difficulty and keeps CPU and
raider aim error during crossbow guidance. It does not finish BUG-07 or qualify
the expansion for release. CPU UFO use and remaining balance targets stay open.

- Raider shots initially used the existing CPU difficulty spreads. A separate `makeRng`
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

## Authorized raider-only numeric candidate

The Director approved one wider raider spread after reviewing the owner split:
Easy `Math.PI / 9` (20 degrees), Medium `Math.PI / 18` (10 degrees), and Hard
`.03` radians. It lives in `COMBAT_TUNING.raider.aimError`; `CPU_COMBAT` remains
10 degrees / `.055` / `.03` radians. No damage, attack cadence, homing cone,
projectile speed or balance target changes are part of this candidate.

The independent author added an exact configuration and launch-spread test.
The only existing assertion changed by the builder is the old requirement
that raider samples fit inside the CPU spread. It now checks the explicit
raider spread. That change reflects the approved separate tuning; sign,
RMS ordering, seed isolation, guidance, control hashes and every other
assertion remain unchanged.

The first focused run with this numeric candidate passed 21/22. The existing
common-time check exposed wider-bias steering lag: `.172697377` selected
radians became `.182726215` measured radians at 30 FPS. The assertion remains
intact; the full balance report is held pending independent review of a
bounded integration correction.

Two short production-policy owner probes (2.58 s total) measured:

| Difficulty | CPU / raider hits before | Wider spread candidate | Result |
| --- | --- | --- | --- |
| Easy | 1 / 5 | 1 / 4 | Win in 105.21 s, no player wreck |
| Medium | 6 / 4 | 3 / 1 | Loss in 108.08 s versus 106.78 s, no player wreck |

The earlier owner trace is retained as
`.qa-dist/enemy-aim-owner-traces-before-tuning.json`; the numeric candidate's
trace is `.qa-dist/enemy-aim-owner-traces.json`. These fixed-step probes
diagnose the candidate; they do not substitute for the pending cross-frame
check or complete balance matrix.

### Reviewed integration correction and complete candidate report

The independent reviewer found that replacing midpoint prediction with an
endpoint sample alone repaired angular error but broke the position tolerance.
The reviewed correction instead splits the turn allowance around the existing
single position advance: steer toward the midpoint with half the turn budget,
move once, then update velocity from the actual endpoint with the other half.
This preserves the full-step angular limit while making stored velocity an
endpoint direction. Only flagged enemy crossbows carrying an aim bias use this
path. Player and flag-off paths, RPG steering and collision sweeps are unchanged.

All 22 existing focused checks passed after this correction. The two production
owner probes repeated their exact numeric-candidate outcomes above. The
intermediate midpoint-only owner evidence is retained as
`.qa-dist/enemy-aim-owner-traces-wide-midpoint.json`. The reviewer separately
owns additive turn-cap tests and any reviewed replay hash update.

The one complete report for this numeric candidate used
`node tools/combat-balance.mjs --flags wasteland2 --check`, taking 71.62 s wall
time (tool 71.47 s, first twelve 13.30 s). Exit 1. Evidence:
`.qa-dist/enemy-aim-wide-balance.log`.

| Measure | Initial retained-bias rule E/M/H | Wider raider candidate E/M/H |
| --- | --- | --- |
| Wins, ten no-weapon seeds each | 9/5/3 | 10/5/3 |
| Seed-1989 enemy hits on player | 6/10/6 | 5/4/6 |
| Player wrecks, sixteen races each | 0/8/5 | 0/2/4 |
| Opponent wrecks, same sample | 0/0/1 | 0/0/1 |
| Traffic wrecks, same sample | 2/12/7 | 2/17/7 |
| Stock UFO gain, seconds | 0.29/-5.66/1.20 | 0.28/-0.73/1.20 |
| Max UFO gain, seconds | 0.55/-3.15/-5.85 | 0.55/2.72/3.31 |

Crossbow remains 12/26 (46%); own-bomb maximum speed loss remains 4.53%.
Sixteen-race enemy-hit totals are 71/104/110. Medium's hit target now passes,
but Easy still has five hits against its maximum of three, and its ten wins
exceed the 95% upper limit. Thus there are two remaining failures, including
an Easy win-rate regression. No second numeric candidate or parameter grid
was tried. This measured candidate remains subject to the Director's decision;
it is not a claim that balance passes.

### Final selection and independent review

The wide numeric candidate is preserved at `d61a2d3`. Its measured Easy win
regression led the Director to revert only the Easy spread to the previously
reviewed `Math.PI / 18`. Medium retains `Math.PI / 18`; Hard retains `.03`.
The split-budget integration correction remains. This reverses a measured
regression; no additional guessed tuning value was introduced.

The independent reviewer committed tests and replay updates as `f84975f`:

- Focused aim checks: 23/23 pass. The builder repeated this focused run before
  the final full report, also 23/23 pass.
- Added 18 source/difficulty/frame-rate combinations for CPU and raider bolts
  at 30/60/144 FPS, exercising both turn directions and cone edges. Each step
  respects its turn cap, launch cone and speed. A mutation that doubled the
  budget fails the new check.
- The exact cone assertion now records 10 degrees / 10 degrees / `.03`
  radians. The prior strict Easy-greater-than-Medium RMS assertion is replaced
  with equality within `1e-12`: these modes now share the same cone and the
  same deterministic samples. Medium remains strictly wider than Hard; sign
  and all other spread, seed and guidance assertions remain.
- The split-steering replay hash is
  `7a29abd5bad52b659d8d9e53263f9fcaeb30cc7b5af3565ad9970b270d65b4e7`
  at all three frame rates. Only the same 28 bolt X/Z samples change; events,
  actor/progress state, semantic assertions and other encounter hashes are
  unchanged. Combat replay checks pass 12/12. Only the affected three hash
  entries changed; no matching metadata hash exists in `combat-inputs.json`.

Independent evidence is `.qa-dist/enemy-aim-split-review.json`.

### Final complete balance report

The Director authorized one final complete report after the Easy revert,
because the reviewed steering integration had also changed since the original
10-degree report. No further numeric tuning followed.

Command: `node tools/combat-balance.mjs --flags wasteland2 --check`.
Wall time 71.69 s; tool time 71.56 s; first twelve races 13.83 s. Exit 1.
Evidence: `.qa-dist/enemy-aim-final-balance.log`.

| Measure | Final E/M/H |
| --- | --- |
| Wins, ten no-weapon seeds each | 9/5/3 |
| Enemy hits on player, no-weapon seed 1989 | 6/4/6 |
| Player wrecks, sixteen policy/seed races each | 0/2/4 |
| Opponent wrecks, same sample | 0/0/1 |
| Traffic wrecks, same sample | 2/17/7 |
| Stock UFO gain, seconds | 0.29/-0.73/1.20 |
| Max UFO gain, seconds | 0.55/2.72/3.31 |

Player crossbow accuracy is 12/26 (46%); own-bomb maximum speed loss is 4.53%.
Sixteen-race enemy-hit totals are 88/104/110; player hits on rivals are 2/4/11.
Easy win rate is restored to its band. Medium/Hard hit bands, all win bands,
UFO gain limits and weapon probes pass. Only Easy's six enemy hits exceed the
0-3 target. The Director retains this useful development improvement with the
full BUG-07 card open; release balance is not claimed. Required lane/build
checks remain for the Director's serialized merge gate.

## Final independent review and merge gate

Reviewed and tested source commit:
`fceff635838b831a974f0846a32a3de62b1281ff`.
The lane was clean before and after both commands, and HEAD stayed unchanged.

- `node tools/run-tests.mjs --tier lane --changed --jobs 8`: 169 passed,
  0 failed, 0 not run in 276.75 s (278.38 s measured process wall time).
  All eight campaign shards passed; `DUEL_SKIP_CAMPAIGNS` was unset.
- `npm run build`: passed in 1.25 s process wall time, with Vite reporting
  640 ms. The existing large-chunk warning remains; there was no build error.
- Logs: `.qa-dist/final-lane.log` and `.qa-dist/final-build.log`.
- Independent source review found no remaining defect in this bounded slice.
  Signed bias, independent seeded raider samples, split steering budgets and
  unchanged player/legacy behavior match the reviewed contract. No save,
  reward, storage, dependency, network, renderer or HUD code changed.
- No additional browser check or balance matrix was run for this gate.
  Easy enemy hits and CPU UFO functionality remain open on BUG-07. This is
  development integration evidence, not release approval.

This section was added after the gate in a documentation-only evidence commit;
it does not claim that a later commit inherited the tested commit's exact gate.
