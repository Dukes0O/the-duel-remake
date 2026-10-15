# QA-AUDIO-BASELINE-CONTROL

Low priority: the original native audio-baseline on76826758 first fails only the existing repeated legacy compressor control (race repeatPeak0.0000164806842804 > unchanged0.000002); pre-mastering controls and all four shorter cases pass. One same-source rerun passes all5cases, maxrepeat/pre-mastering0.0000002384185791. Runtimeaudio, samples, baselinecf72d9c, case scheduling and limits were unchanged. Cause is unproved; this is an unreliable check under AGENTSrule3 and does not hold feature merges.

Use the existing recipe and native report, at most30minutes per diagnosis. Do not alter mastering, sound, waveform, assertions, tolerances or timeouts, and do not add machinery. Existing note records both actual receipts. Evidence: .evidence/2026-10-14/QA-BROWSER-SWEEP/runtime-76826758/audio-baseline and audio-baseline-rerun. No job starts with this card creation.

## Removed

None. Keep both actual packets for the bounded follow-up.
