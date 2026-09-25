---
task: AUD-11
status: in-progress
kind: tooling
flag: none
player_facing: no
---

# Listening booth and measurements

## Design

Build the QA tools on the implemented AUD-10 foundation. AUD-10's strict
mixed-waveform comparison remains unresolved; neither card is ready while
that finding is pending. This preparation does not change that gate.

Use the installed FFmpeg EBU R128 measurement for integrated LUFS and
oversampled true peak. Keep the existing race checks. Record at the browser's
native rate so high-frequency peaks are not discarded by decimation. Loop
seams compare the boundary jump with ordinary adjacent-sample differences.
Repetition reports repeated cue/variant runs and similar event waveforms.
The specification's loudness targets are advisory, and missing evidence must
be reported as unavailable rather than a pass.

The local-only booth plays the actual cue renderer with engine and ambience
beds, near/far positions, and A/B/C options. Explicit human ratings (1-5),
listener name and notes are saved as small JSON verdicts under
`docs/board/listening/`. No ratings are invented. Unrated measured rounds
are flagged for human listening. The booth uses memory-only storage and a
private port, never the live game or its saves. No runtime dependencies or
external requests are added.

Tests come first: loudness gain steps and silence; inter-sample peaks;
clean and broken seams; repeated and varied sequences; invalid verdict
fields and path traversal; and private browser playback and save behavior.

## Evidence

Implemented the booth, local verdict writer, full-rate recorder and measurements.
Zero service calls or credits. Director approved the
analyzer, native-rate recorder, root test and browser-scenario hooks.
AUD-11 cannot be ready or merged before AUD-10.

## Removed

Removed the recorder's decimation; its native-rate replacement passes the
unchanged race checks. No production sound is replaced
by this card.

## Validation and self-review

Eight new tests pass. They cover known LUFS gain changes and silence,
inter-sample true peaks, clean and broken seams, repeated and varied takes,
verdict validation/persistence, same-origin local writes, and audio-only
octave tracking. Tests failed before their corresponding implementation.
All six existing analyzer fault tests still pass with unchanged assertions.

The full-rate capture exposed a greedy octave-lock defect: one ambiguous
reading forced later pitches an octave low. A bounded trend from the prior
two audio readings fixes it without using rev telemetry. The same failed
recording now passes all ten existing gates: correlation 0.974, lag 0 ms,
no clicks, gaps or clipped samples, minimum weapon/engine contrast 6.435 dB.
Both retained legacy recordings also pass with correlations 0.977 and 0.978.
No gate threshold, assertion or confidence cutoff was changed.

The 48 kHz capture measures -17.92 LUFS and -1.58 dBTP. All 10 runtime loop
seams pass. Nine blast events use three variants with maximum run length 1.
The committed round verdict flags missing human listening; no ratings were
invented. These measurements are advisory, as required by SPEC 0.9.

Private browser scenario passed on port 11898 with memory-only storage and
no warnings or errors. It proves actual audio output, stop/suspend, three
comparison slots, a review snapshot of the heard settings, and native-rate
race capture. Visual inspection found the desktop booth clear and unclipped.
The fixture rating stayed in ignored QA evidence and was never submitted
as a real human verdict. HTTP tests write only to unique temporary folders.

Lane/build gates and the dependency on AUD-10 still prevent readiness.

## Commands

- node tools/audio/booth-server.mjs [private-port]
- node tools/test-audio-listening.mjs
- node tools/test-audio-analysis.mjs
- node tools/browser-harness.mjs scenario audio-listening
- node tools/browser-harness.mjs record-race
- node tools/audio-analysis.mjs RECORDING_DIRECTORY --check

The booth server prints its local address and saves explicit human verdicts
under docs/board/listening/. A static QA preview supports playback; saving
requires the local booth server. No game runtime or production build input
was added. Raw capture evidence remains ignored until its verdict is reviewed.

## Integration gate finding

After integration sync 1bbe1d4, lane tier stopped with 235 passed, 1 failed
and 23 not run in 353.23 seconds. The failing new Rustwall test required
art-build/rustwall-p2/wall-relief-source.png, an absent scratch artifact in
this clean lane. The Director reproduced it and opened FIX-RUSTWALL-CLEAN.
No art assertion was changed and no old scratch file was copied into place.
Production build passed separately in 346 ms. All 162 replay fingerprints
were unchanged, and all 48 expansion drives completed and won. Rerun the
lane gate after the integration-owned fix; this is not a passing lane gate.

## Booth source fidelity follow-up

A new browser regression found that the siren preview was only a representative
single tone. The booth now routes the actual game's two siren oscillators into
the audition position and lets the production update drive their wail. Quiet
bed selection preserves the requested siren; stop restores the normal route.
The new real-wail check failed first, then the complete booth scenario passed
with no warnings/errors. Runtime siren behavior and existing assertions are
unchanged. Replaced and removed the representative tone preview.

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
