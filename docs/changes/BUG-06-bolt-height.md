# BUG-06: crossbow contact uses the real vehicle height

status: merged in 9139575 (body-contact slice only; balance follow-ups remain)

## Change

Flagged Wasteland crossbows now intersect the moving vehicle body from its
ground/air base to its actual roof. The existing relative-motion sweep checks
that horizontal and vertical overlap happen at the same time. Previous and
current air heights remain part of the sweep. Vehicle height comes from
`_vehicleSpec`, including the short Viper and tall Titan.

Legacy crossbows, bombs and RPGs retain their existing hit bands. Guidance,
launch lead, inherited velocity, weapon cadence and tuning are unchanged.

## Fixture corrections for review

The Director approved three fixture geometry corrections. Implementation
commit `8fec17a` changed no assertions or recorded fingerprints. The later
reviewed expectation correction is documented below.

- Fast-bolt test: ground + 2 m becomes ground + half the target's actual height.
  Its purpose is horizontal tunneling through the body; 2 m clears this roof.
- Vertical-crossing test: ground + 3.5 m with upward velocity +60 m/s becomes
  ground + half the body height + 1 m with downward velocity -60 m/s. The bolt
  now crosses the body's centre while its horizontal path crosses the car.
  Hit-count and consumption assertions remain at 30, 60 and 144 FPS.
- Combat replay's injected `bolt` action: ground + 2 m becomes ground + current
  air height + half the body height. This restores the intended direct hit and
  preserves all existing fingerprints for the first three replay encounters.

## Checks

- Independent projectile tests: all 35 pass, including 26 body/control cases.
  The new cases had 12 failures before the fix.
- Projectile ordering passes. Legacy moving-target probe remains 420/792 (53%).
- Ordinary replays: all 162 approved fingerprints pass unchanged.
- Legacy crossbow and modern bomb/RPG control hash remains
  `fa2c7711be34f5eddfeb7ed8273b0169a2e29a71645d1335e80d3443631886a9`.
- Combined focused command: 38/39 groups passed in 86.05 s. The one failure
  was the combat replay fixture. After its approved geometry correction, the
  first three encounters retain their hashes; the fourth initially expected
  the old broad-band CPU hits. Its reviewed correction is documented below.
- No browser, lane tier, build or full tier is claimed here. Independent lane
  and build gates are still required before integration. No real saves used.

## Reviewed CPU replay difference

The flagged `staggered-cpu-attack-turns` replay produces one hit instead of
three. A bounded before/after trace used production modules with in-memory
logging, before source at `ae860fb`, and the same 120 Hz simulation. Results
are identical at the existing 30, 60 and 144 FPS schedules.

| Path | CPU source | Tick | Bolt Y | Body roof Y | Result |
| --- | --- | --- | --- | --- | --- |
| Before | 1 | 429 | 30.974315 | 30.816779 | False hit 0.157536 m above roof |
| Before | 2 | 704 | 30.927752 | 27.789792 | False hit 3.137960 m above roof |
| After | 1 | 429 | 30.974315 | 30.816779 | Miss; remains above through tick 431 |
| After | 2 | 657 | 28.381378 | 25.561259 | Miss; remains above through tick 660 |

The bomb hit at tick 368 remains. All three CPU shots still fire at ticks
200, 401 and 602, in the same order. Removing the first false shove changes
the later encounter time. The independent reviewer reproduced the result
and approved this flagged encounter's hit expectation from 3 to 1 and its
three matching fingerprints only. The Director authorized that exact change.
All CPU shot-count/order assertions and all other encounter expectations and
fingerprints remain unchanged.

The reviewer reproduced the new fingerprint at 30, 60 and 144 FPS:
`0ded9e86dafade32a8dd973b3e6ac0f161b844e98d5fe3085797046c540a4938`.
It replaces `47f70d68c5c2a311e85db494cdca8015df5202a52b20af9925b87594eb130095`
only for `staggered-cpu-attack-turns`, reflecting the removal of the two proven
above-roof false hits. This is a reviewed gameplay correction, not a relaxed
balance target. No bulk fingerprint regeneration was used.

After this precise correction, `node tools/test-combat-replays.mjs` passes
all 12 checks across four encounters in 1.43 s. The balance matrix was not
repeated. Required independent lane and build gates remain pending.

## One complete flagged balance measurement

Command: `node tools/combat-balance.mjs --flags wasteland2 --check`.
One run, including the controlled probe. CPU contention with the graphics
lane gate affected timing: 140.26 s total, 32.21 s for the first 12 races.

| Measure | Easy | Medium | Hard |
| --- | --- | --- | --- |
| No-weapon wins / 10 | 5 | 4 | 3 |
| Enemy hits in the target sample | 10 | 11 | 4 |
| Player wrecks across 16 races | 6 | 6 | 3 |
| Opponent wrecks across 16 races | 0 | 1 | 2 |
| Traffic wrecks across 16 races | 6 | 15 | 6 |
| Stock UFO gain, seconds | 6.93 | 7.55 | 1.11 |
| Maximum UFO gain, seconds | 2.50 | 8.55 | 1.29 |

Crossbow probe: **12/26 (46%)**, within the unchanged 35–60% target, compared
with 18/26 before the fix. Own-bomb maximum slowdown remains 4.53%.

Seven balance failures remain: Easy and Medium wins, Easy and Medium enemy
hits, stock UFO gains on Easy and Medium, and maximum UFO gain on Medium.
This geometric correction does not establish release balance. No tuning or
balance limit changed.

## Additional reviewed direct-hit fixtures

The first independent lane gate stopped with 59 suites passed, 1 failed and
64 not run. The armor suite still injected direct-hit bolts at ground + 2 m,
above the target roof. An independent reviewer approved the same geometry
correction in these exact sites and reproduced all 42 unit tests passing in
memory before the Director expanded file ownership:

- `tools/test-combat-armor.mjs`: `boltAt`, targeting `actor`.
- `tools/test-combat-scoring.mjs`: `bolt`, targeting `actor`, and the scripted
  frame-rate test shot targeting `victim`.
- `tools/test-combat-opponents.mjs`: the later-opponent shot targeting `target`.
- `tools/scenarios/combat-armor-frame-pacing.mjs`: the player wreck injection.
- `tools/scenarios/combat-armor-wreck.mjs`: player and second-opponent injections.
- `tools/scenarios/combat-effects.mjs`: player and later-opponent wreck injections.
- `tools/scenarios/combat-results.mjs`: the results encounter's victim injection.

All ten injection sites now use ground + target air height + half the actual
vehicle height. They intend direct body hits to exercise armor, scoring and
wreck presentation. Every assertion and hash is preserved. The effects muzzle
sample stays at ground + 2 m; legacy-only fixtures and runtime source are
unchanged by this follow-up.

The three repaired unit suites pass **42/42 tests**, with none skipped, in
1.22 s. Only those suites were rerun. The balance matrix was not repeated.
Representative armor-wreck/results browser checks and the final independent
lane/build gate remain pending.

## Final independent gate

Candidate 280b25d1a99d53c8d75652ff0d349830d07d7c7d was clean before and
after verification. Review confirmed exactly the ten authorized fixture
positions and note changed since 24108dd; runtime and assertions stayed fixed.

- Private memory-only armor-wreck: passed in 13.68 s, port 41024, six images.
- Private memory-only combat-results: passed in 16.99 s, port 59057, four images.
- Both browser scenarios reported zero errors and warnings.
- Required lane tier: 216 passed, zero failed or not run, 305.90 s.
  All eight campaign shards passed; DUEL_SKIP_CAMPAIGNS was unset.
- Production build: passed in 0.90 s, with the existing chunk-size warning.

Logs are retained in .qa-dist/bolt-final-{armor-wreck,results,lane,build}.log.
Screenshots are in the combat-armor-wreck-2026-09-24T05-52-58-897Z and
combat-results-2026-09-24T05-53-45-616Z browser-output directories.
The first logging setup held a file during the harness build and caused
EBUSY; correcting log capture allowed both checks to pass without source edits.
The passing gate covers unchanged source; this final note adds evidence only.
