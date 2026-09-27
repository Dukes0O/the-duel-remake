---
task: COMBAT-AUDIO-SCENARIO
status: merged
kind: fix
flag: wasteland2
player_facing: no
---

# Combat audio browser fixture enters the Wasteland (26 September 2026)

The `combat-audio` browser scenario failed with `No owned flight voice` after
the Wasteland became a discovered easter egg in commit `359d185`.

## Cause

The scenario requested Wasteland mode for a fresh memory-only player whose
gate was still undiscovered. Since `359d185`, race feature flags apply
Wasteland rules only when that player had found the gate before the race
started. The crossbow projectile still launched, but audio correctly treated
the race as pre-Wasteland and did not create a flight voice. Runtime audio was
not broken.

## Changes

- `tools/scenarios/combat-audio.mjs`: mark the isolated QA player's gate as
  discovered and save that profile before starting the Wasteland race.
- `tools/test-combat-audio.mjs`: the red test from commit `7abdc88` remains
  unchanged and guards the setup order.

## Tests

- Red before the fix: the focused browser-fixture check failed.
- `node --test --test-name-pattern="browser fixture" tools/test-combat-audio.mjs`:
  1 passed, 0 failed.
- `node tools/browser-harness.mjs scenario combat-audio`: passed on private
  port 8287 with memory-only storage, 0 warnings and 0 errors. The real bolt
  kept one owned voice while moving, then pause cleared all owned and mixer
  voices. Peak was 0.843, all 27 combat samples cleared the 6 dB engine
  contrast check, and spatial distance and Doppler checks passed.
- Final lane tier at `3c987737`: 289 passed, 0 failed, 0 not run. Replay
  fingerprints passed. Two unrelated Rustwall Blender tests timed out during
  the prior attempt, passed alone, then passed in this exact rerun.
- Production build passed at the same commit.

## Changed assertions

None. The ownership, movement, cleanup and flight-audio assertions are
unchanged.

## Race fingerprints

Not applicable. The fix changes only browser scenario setup.

## Removed

Nothing.
