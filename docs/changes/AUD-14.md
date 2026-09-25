---
task: AUD-14
status: in-progress
kind: feature
flag: wasteland2
player_facing: yes
---

# Approved combat sounds

## Design

Rebuild the two approved blasts, crash, two rocket launches and crossbow E
from checked catalog sources, never from the listening outputs. Use a fixed
three-variant rotation: it avoids immediate repeats and consumes no simulation
randomness. Normalize authored one-shots around -12 LUFS with codec headroom;
ship Vorbis. Keep the exact existing sound path when wasteland2 is off.

Crossbow E uses the first 90 ms snap of A (384905 plus 394180), a 3000 to
700 Hz pew lasting .14 seconds, and a 2000 to 1500 Hz whistle which follows
the bolt through the moving-source mixer. Hits add an 800 Hz low-passed thunk
and 3200 Hz tink. Preserve event timing and read projectile state only.

Use the approved launch recordings for RPG, bright tonal accents for the
other car weapons, distance attenuation and softer far impacts. Missing new
buffers retain the current fallback. Pause, mute, stage changes, expired
projectiles and menus must release voices. Three measured rounds will compare
full-throttle masking, headroom, distance and repetition. Human ratings remain
explicitly pending until Kyle or his son supplies them.

## Tests and evidence

Tests written before implementation. Top-level test and browser scenario hooks
requested from the Director; tests begin inside owned tools/audio/ meanwhile.
AUD-10 comparison remains unresolved, so this card cannot be ready yet.

## Removed

Legacy assets remain required by wasteland2 off and missing-file fallbacks.
Remove those old recipes/assets only when the switch is retired in its own
reviewed card. No approved source or kept take is discarded.

## Three measured refinements

Round 1 found weak legacy signatures and marginal crash/confirm levels.
Round 2 rebuilt the quiet cues and conditioned the recordings; three cues
needed final gain adjustments. Round 3 passes all 27 ABC contrasts at 6.06 dB
or greater, true peak -1.41 dBTP. The dense cue train is -12.79 LUFS, above
the advisory race target; human ratings remain pending. Verdicts retain those
findings under docs/board/listening/combat. No threshold was changed.

Six tests pass after failing first. Review caught a flag-off silence bug:
modern Wasteland mode predates wasteland2, so explicit legacy-layer playback
must remain when the switch is off. The new regression proves this even with
new buffers loaded; no existing assertion was relaxed. All previous 459
PCM checks passed before the final variants. Further browser/gate validation
is pending. Director approved the test/scenario hooks and *.ogg binary line.

## Event-path and rebuild verification

A stronger browser check fires an actual bolt through App, proves audio does
not mutate race state, follows the same owned voice across movement, and
releases every voice on pause. The rebuilt whistle measures 2148 Hz approaching
and 1564 Hz receding; left/right level ratios exceed 1.5. The far blast RMS is
.1544 versus .2341 nearby, with a softer spectrum. All checks pass privately,
with memory-only storage and no browser warnings/errors.

Actual crash/blast event routing exposed stereo gain absent from direct bank
previews. The unchanged 6 dB event check first failed, then passed after bank
gain correction: blast minimum 7.02 dB, typical crash 6.51 dB. All 27 final
near-context checks pass; the dense mix is -12.82 LUFS, -1.51 dBTP. Mild crashes
are intentionally quieter through their existing strength scale.

All 36 variants have decoded true peak at or below -1.43 dBTP. Two scripted
rebuilds produce identical compressed bytes; all 36 decoded outputs match the
prior measured assets exactly. Total added audio is 453,141 bytes. Git marks
OGG files binary. Eight focused tests now cover recipe provenance, flags,
variants, lifecycle, deterministic synthesis and decoded headroom. Existing
assertions and simulation state were not changed.

## Final integration-synced lane gate

Merged integration/wasteland at 568f2dc. On that clean checkout, lane tier
passed 262/262 with no failures or skipped suites in 361.68 seconds; production
build passed in 363 ms. All 162 replay fingerprints remain unchanged, and all
48 expansion drives completed and won. The build retains the existing large
chunk advisory. No assertion was relaxed to obtain this gate.

The session-ending full command is
`node tools/run-tests.mjs --tier full --jobs 8 --keep-going`. Its log and exact
commit verdict are retained under .evidence/2026-09-25/audio-final/ as full.log
and full-tier.json. Those are review evidence, not generated files to commit.
No board, status or run-log file is edited directly by this lane.

Status remains in-progress. Passing general suites does not waive AUD-10's
strict waveform comparison or turn pending human ratings into approvals.
