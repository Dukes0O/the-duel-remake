---
task: CMB-06
status: lane-complete
kind: test-coverage
flag: wasteland2
player_facing: no
---

# Combat replay coverage

The new combat replay fixture is separate from the 18 older event and mode
fixtures. It runs flagged Wasteland races with three CPU cars at 30, 60 and
144 FPS. Every frame schedule advances the same 120 Hz simulation ticks.

Three short encounters pin the event order and sampled race state for:

- Two simultaneous bolts against different opponents, including one armor
  wreck, owned damage and combo scoring.
- A player rear ram, reciprocal armor hits, a caused wreck and recovery.
- An armor repair crate and a star recharge crate after the player fires star.

The authored fixture records seed, initial cars, armor, tick actions and
expected event counts. The companion fingerprints pin position, armor, wreck
timers, cooldowns, pickups, score and combat events every quarter second.
These encounters keep CPU attack timing out of the fixture so that each
mechanic has a clear cause. A separate CPU-turn encounter will be added after
CMB-05 supplies its staggered attack order.

## Verification

- `node tools/test-combat-replays.mjs`: 9/9 pinned fingerprints pass across
  three encounters and three frame rates. Each encounter also checks its
  expected combat events and key score or pickup outcomes.
- `node tools/test-replays.mjs`: all 162 earlier fingerprints pass unchanged.
- `git diff --check` passes. No older fixture, fingerprint or assertion was
  changed. The new suite is discovered automatically by `run-tests.mjs`.
- No browser or full gate was run in this test-only lane. The release manager
  owns the combined release check.
