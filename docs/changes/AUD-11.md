---
task: AUD-11
status: ready-to-merge
kind: tooling
flag: none
player_facing: no
---

# Listening booth and measurements

The booth, measurements, private browser checks and independent review pass.
Human listening scores remain pending; automated fixtures are not ratings.
AUD-10 is ready and must precede this card in the integration series.

## Design and implementation

Use installed FFmpeg EBU R128 for LUFS and oversampled true peak. Record at
the browser's native rate so high-frequency peaks are retained. Loop seams
compare wrap jumps with ordinary adjacent-sample differences. Repetition
checks cue/variant runs alongside existing waveform checks. Missing evidence
is unavailable; loudness and true-peak targets remain advisory.

The local-only booth plays the actual renderer with engine/ambience beds,
near/far positions and A/B/C choices. Explicit 1-5 ratings, listener names and
notes save to unique JSON verdicts under docs/board/listening/. A verdict takes
its cue/settings from the sound heard, not later control edits. Voice lines
play in full. Siren previews use the production pair of oscillators and wail.
Storage is memory-only; ports are private. No runtime dependencies or external
requests were added. Director approved the test, analyzer and scenario hooks.

## Tests first and independent review

Ten tests pass: known gain steps/silence, inter-sample peaks, clean/broken
seams, repeated/varied takes, validation and safe persistence, same-origin
HTTP writes, octave tracking, rapid selection and Stop during file loading.
All six original analyzer fault tests pass with unchanged assertions.

Full-rate capture exposed greedy octave locking. A bounded audio-only trend
through an ambiguous reading fixes it without rev telemetry. The original
pitch-correlation threshold and all numerical gates remain unchanged. Earlier
recordings still pass. No assertion was weakened.

Both deferred-load regressions execute the real booth module. Before the fix,
rapid A/B played two takes and Stop allowed a later start. Request generations
now invalidate old starts after suspend/load/resume and guard old timers.
The Director independently reproduced both failures, reran the fixed module,
and cleared the cancellation logic at 17ecf62.

## Measured verdicts and browser evidence

Fresh 48 kHz race: -17.75 LUFS, -1.52 dBTP, all ten loop seams pass. Nine blasts
use three variants with maximum run length one. All ten original race gates
pass, including pitch correlation .980, zero lag and no clips/clicks/gaps.
Committed listening verdicts flag pending human scores; no ratings were invented.

The final booth browser run on private port 47771 has zero warnings/errors.
Rapid A/B leaves exactly one B voice, normal play/stop works, three slots and
heard-setting snapshots persist, the actual siren wails, and race capture
retains native rate. Memory-only storage is unchanged. Desktop visual review
found no clipping. Fixture ratings remain only in ignored QA evidence; HTTP
tests write unique temporary folders, never actual human verdict files.

## Commands

- node tools/audio/booth-server.mjs [private-port]
- node tools/test-audio-listening.mjs
- node tools/test-audio-analysis.mjs
- node tools/browser-harness.mjs scenario audio-listening
- node tools/browser-harness.mjs record-race
- node tools/audio-analysis.mjs RECORDING_DIRECTORY --check

The server prints its local address. Static QA playback does not save verdicts;
saving requires the local booth server. No production build input was added.

## Removed

Removed recorder decimation, the representative single-tone siren preview,
and unconditional pending-start behavior. The replacements retain source
fidelity and explicit cancellation. No production sound is replaced here.

## Handoff gate

Integration/wasteland was merged at 9a11eab (integration parent 0b1af27)
before readiness. On that frozen source, lane tier with --changed --jobs 8
passed 262/262, zero failures or skipped suites, in 361.08 seconds. Production
build passed in 392 ms with the existing large-chunk advisory. All 162 replay
fingerprints are unchanged; all 48 expansion drives completed and won.
No assertion was relaxed. No simulation or save-format change is included.

Gate logs live in .evidence/2026-09-25/audio-ready/. The session-ending
`node tools/run-tests.mjs --tier full --jobs 8 --keep-going` runs on the final
ready-note commit; full.log and full-tier.json record that exact commit and
result. The Director merges the series; this lane never merges into integration,
pushes, edits live files, or updates board/status/run-log files directly.
