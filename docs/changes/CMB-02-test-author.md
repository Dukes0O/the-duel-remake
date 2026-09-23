---
task: CMB-02
status: red-tests
kind: independent-test-author
flag: wasteland2
---

# CMB-02 independent ramming tests

## Contract

The tests use the Director's agreed event and bumper contract. In flagged
Wasteland, `combatBumperSpikes=false` disables that actor's otherwise equipped
front spikes. Each accepted victim direction emits `combatRamHit: true` with
`attacker` and `victim` (`player` or `rival`), indexes (`-1` for player or
`0..2` for CPU), actual `armorRemoved`, `closingKph`, `spiked`, and a finite
`hitPosition`. A head-on front/front collision can emit two events. A star may
make one event's armor loss zero while physical separation still happens.

## Coverage

`tools/test-combat-ramming.mjs` drives the real `_vehicleContact` path with
fixed poses and velocities. It checks the strict 40 km/h threshold, mph to
km/h conversion, 1.5 front-spike bonus, disabled bumper, rear/side faces,
two front faces, player against each CPU, CPU against player, CPU against CPU,
star protection with physical shove, equal-speed 300 km/h shoveling, mass
launch, overkill event delta, local wreck/recovery, and bounded armor.

A held overlap tests that time alone cannot repeat impulse, armor, or events.
The same pair must leave the clearance envelope and re-enter before it may
hit again at the same coordinates. A scripted two-contact trace compares
event order and armor at 30, 60, and 144 FPS. Pinned short contact digests
cover ordinary races with either switch value and flag-off Wasteland. A
traffic control checks ordinary solid cars and flag-off Wasteland traffic
wrecks. These baselines were captured before implementation at `fc6cbc7`.

## Baseline and handoff

Focused baseline: `node --test tools/test-combat-ramming.mjs` ran 12 tests:
four controls passed and eight new-behavior tests failed as expected.
The first front-hit failure expected 28.968192 armor loss but observed
19.312128 without the spike bonus. The front/front CPU fixture expected
77.248512 loss but observed 51.499008. The implementation also has no
`combatRamHit` event or incident latch yet. `node --check` passed.

No existing assertion or fingerprint was changed. No source, build, browser,
or heavy gate was run in this test-author lane. The builder should cherry-pick
the test commit and implement the behavior in its owned files; the Director
will run merge and full gates after integration.
