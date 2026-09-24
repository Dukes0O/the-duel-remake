---
task: CMB-06
status: integrated
kind: test-coverage
flag: wasteland2
player_facing: no
---

# Combat replay coverage

The new combat replay fixture is separate from the 18 older event and mode
fixtures. It runs flagged Wasteland races with three CPU cars at 30, 60 and
144 FPS. Every frame schedule advances the same 120 Hz simulation ticks.

Four short encounters pin the event order and sampled race state for:

- Two simultaneous bolts against different opponents, including one armor
  wreck, owned damage and combo scoring.
- A player rear ram, reciprocal armor hits, a caused wreck and recovery.
- An armor repair crate and a star recharge crate after the player fires star.
- Three staggered CPU attack turns, fired by opponents 1, 2 and 3 in order,
  with three real projectile hits.

The authored fixture records seed, initial cars, armor, tick actions and
expected event counts. The companion fingerprints pin position, armor, wreck
timers, cooldowns, pickups, score and combat events every quarter second.
The first three encounters suppress autonomous CPU attacks so that each
mechanic has a clear cause. The fourth runs the CMB-05 attack scheduler and
records the shooter order, projectile hits and combat state over six seconds.

## Verification

- Rebased onto the combined CMB-05 and SAVE-01 integration commit `1f0d93a`.
- `node tools/test-combat-replays.mjs`: 12/12 pinned fingerprints pass across
  four encounters and three frame rates. Each encounter also checks its
  expected combat events and key score or pickup outcomes.
- `node tools/test-replays.mjs`: all 162 earlier fingerprints pass unchanged.
- `node tools/test-combat-brain.mjs`: five nearby AI checks pass.
- `git diff --check` passes. No older fixture, fingerprint or assertion was
  changed. The new suite is discovered automatically by `run-tests.mjs`.
- No browser or full gate was run in this test-only lane. The release manager
  owns the combined release check.
