---
task: FND-07
status: review
kind: tooling
flag: none
player_facing: no
---

## What changed

Added one recorded input trace, 18 replay cases, and expected SHA-256
fingerprints. The cases load all 16 current events, including duel, time trial,
Mad Max, chase, drift, checkpoint rush, stunt and practice. Each case runs with
the same 120 Hz simulation steps delivered in 30, 60 and 144 FPS frames.
The test compares ten one-second state samples and checks three independent
runs at every frame rate.

## Evidence

- `node tools/test-replays.mjs`: 162 fingerprint checks passed (18 cases ×
  3 frame rates × 3 runs). Every frame rate matched its recorded baseline and
  the other frame rates.
- The test verifies the 16-event roster, category-specific state and that the
  recorded inputs move every car past 20 metres.
- A disposable copy with only `DRIVE.mphToWorld` changed from `0.44704` to
  `0.45` failed on the first case at 30 FPS with
  `physics fingerprint changed`. The disposable copy was removed. The lane
  source was never changed for this probe.
- No browser or player save was opened. Replays construct `Duel` directly in
  Node and use fixed seeds and inputs.

## Behavior and test changes

No game behavior changed. The fingerprints pin early race behavior over ten
seconds, including launch, steering, boost, braking and combat input. Longer
race outcomes remain covered by the existing campaign and event suites.
Re-record fingerprints with `node tools/test-replays.mjs --record` only after
a reviewed, intentional behavior change.
