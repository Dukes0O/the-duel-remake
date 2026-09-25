---
task: AUD-10
status: in-progress
kind: refactor
flag: wasteland2
player_facing: yes
---

# Sound bank and mixer

AUD-10 is not ready to merge. The sound-bank migration, compression and mixer
are implemented. A strict new waveform comparison remains unresolved. AUD-11, gatekeeper and AUD-14 are implemented in separate in-progress notes.
AUD-17 produced ten candidates using 400 credits, with none kept.

## Design

Keep the existing synthesis envelopes and engine automation. Cue recipes,
source declarations, routing, priorities and limits live in sound-bank.js.
Unity-gain buses feed the existing master compressor. Engine and vehicle
sounds retain the old perspective and tunnel path; originally dry vehicle
sounds retain a dry branch. Lossless FLAC preserves every decoded runtime
sample and loop boundary. This avoids a lossy-codec change in the foundation
card. Combat ducking and moving-source playback require wasteland2. The new
gatekeeper voice independently permits voice ducking under hidden-road.

The mixer has per-cue limits and a 64-cue total budget, with priority when
full. Retired cues fade. Music and ambience duck for blasts or voice requests.
Moving buffers use HRTF direction, inverse distance and bounded physical
doppler. This card provides moving-source playback; the later weapon and
vehicle cards connect their specific moving entities.

Kyle requested this lane work alone. The bank/mixer, placement, moving-source
and Git-byte tests each failed before their corresponding implementation.
Self-review is recorded here; no independent listening claim is made.

## What changed

- Existing cue definitions and recordings now use the bank and named buses.
- Added mixer tests for overlapping duck requests, release, voice limits,
  priority, source movement, doppler, cleanup and read-only spatial inputs.
- Compressed 14 runtime recordings from 6,108,572 to 3,575,193 bytes. All
  decoded signed-16-bit PCM hashes and sample counts match the original WAVs.
- The audio build tool rebuilds from catalog recipes and the external cache.
  Rebuilding all 14 samples passed the same PCM identity test.
- Freesound downloads and decoded source excerpts moved to
  C:/Users/kyleb/dev/audio-library/legacy/. The catalog keeps their recipes,
  provenance and original checksums. Nothing is fetched during gameplay.
- Preserved the two licensed OpenGameArt originals as lossless FLAC under
  audio-src/library/. Their old credits did not provide verified direct
  download URLs, so they are not discarded as replaceable cache files.
- Added *.flac binary to .gitattributes after a failing regression test proved
  that the repository's text default corrupts staged FLAC bytes. Fixed forward
  in be129b0; history was not rewritten. Runtime and kept-source staged bytes
  now equal the working originals and the source catalog checksums.
- Director approved the extra audio test/build hooks and .gitattributes on
  25 September. The implementation keeps src/sound-mixer.js as approved.

## Evidence

Preliminary lane tier: 254 passed, 0 failed in 397.45 seconds. All 162 replay
fingerprint checks passed. The 48 expansion drives completed and won. This
was before the final integration merge and is not the final lane gate.

Focused audio suite: 459 checks and 598,707 finite automation commands passed.
Compression checks: all 14 decoded PCM hashes and loop lengths unchanged.
Repository placement tests: 101 checks passed, including new raw-audio cases.
Existing analyzer fault tests and weapon-cue tests passed.

Two real-time browser races used private ports, memory-only saves, seed 1989,
841 captured frames, 23 events and seven PCM tracks. Neither had browser
warnings or errors. Both pass all ten existing race-analysis checks:

| Measure | Before | After |
| --- | ---: | ---: |
| Engine/revs correlation | 0.978 | 0.977 |
| Engine tracking lag | 0 ms | 0 ms |
| Peak | -1.740 dBFS | -1.599 dBFS |
| Clipped samples | 0 | 0 |
| Detected clicks / loop gaps | 0 / 0 | 0 / 0 |
| Minimum measured hit/blast over engine | 7.155 dB | 6.940 dB |
| Near/far level difference | 3.371 dB | 3.388 dB |

The moving-source browser scenario passed on private port 26348 with no
warnings or errors. A 440 Hz source measured 483 Hz approaching and 404 Hz
receding. Right/left RMS was 0.106/0.056 approaching on the right; left/right
RMS was 0.103/0.064 receding on the left. Both voices released their budgets.

Commands:

- node tools/test-sound-bank.mjs
- node tools/test-audio.mjs
- node tools/test-audio-compression.mjs
- node tools/test-repo-hygiene-rules.mjs
- node tools/test-audio-analysis.mjs
- node tools/test-weapon-audio.mjs
- node tools/prepare-audio.mjs
- node tools/browser-harness.mjs record-race
- node tools/audio-analysis.mjs <recording-directory>
- node tools/browser-harness.mjs scenario audio-moving
- node tools/browser-harness.mjs scenario audio-baseline
- node tools/run-tests.mjs --tier lane --changed --jobs 8

## Unresolved baseline comparison

The reference is reconstructed from cf72d9c using Git text history. The
comparison schedules identical inputs into native OfflineAudioContext graphs
for a race, wide camera, hood/tunnel, events and gate arrival. It uses the same
noise seed and the lossless decoded runtime assets. No live browser is used.

The new comparator requires peak difference at most 0.000002. It currently
fails: maximum before/after difference is about 0.0000317, with RMS at most
0.000000329 across measured runs. Crucially, two renders of the unchanged old
engine also differ by up to 0.0000317. Serial decoding and prefetching did not
remove that variance. Repeated reads of the same rendered buffer are exact.
The cause is still unresolved; do not call this proof of an unchanged mix.

Automatic approval review rejected changing the comparison tolerance because
it would weaken a failing test. The threshold remains unchanged. Keep this
failure visible. Either resolve render repeatability or obtain Kyle's
explicit approval for a reviewed comparison rule supported by this control.
Human ratings are not available; the round remains flagged for listening.

## Removed

Removed 12 raw source downloads/excerpts and 14 uncompressed runtime WAVs from
public/. Runtime FLACs replace the WAVs. Source recipes remain in tools/audio/;
licensed originals and credits remain. The old inline weapon/interface/music
recipes were removed when the bank entries replaced them. The kept Callum MP3
is unchanged, as Kyle specifically selected those exact bytes.

## Behavior and test changes

No simulation source or real save was changed. The 162 replay checks remain
unchanged. Source-preservation assertions now check exact catalog hashes and
external-cache recipes instead of requiring downloads in public/. Graph
assertions follow named unity buses to the same reflection bus. Existing loop,
headroom, seam, pitch, envelope, missing-file, weapon and analyzer fault targets
are unchanged. FLAC decoding feeds the existing PCM assertions. The new strict
baseline comparison is failing, not skipped or relaxed.

## Handoff

Integration was merged into the audio branch at 7393d07. After the later integration sync at 4f64f9e, the lane tier passed 254/254
in 408.37 seconds and the production build passed. All 162 replay checks
remain unchanged. The committed audio bytes were independently checked at 4f64f9e: 17/17
files are exact, including the selected Callum take. Both licensed source
FLACs also decode to the exact original PCM. Do not merge this card until the baseline finding and remaining gates
are resolved and this note explicitly says ready-to-merge.

AUD-11 and gatekeeper wiring are implemented in their own in-progress notes.
AUD-14 and AUD-17 are next. AUD-12-R1 was independently integrated by the
Director at d355b9a after fake-only validation; no credits were used.

## Baseline follow-up

The stricter comparator now runs reference, candidate and a second reference
in one six-channel OfflineAudioContext with shared decoded buffers. No threshold
changed. Large residuals clustered just after source stops, where asynchronous
onended cleanup could truncate filter tails. Deferring topology cleanup and
onended handlers until rendering completes stabilized four of five cases below
0.000000328 peak difference. The 14-second case still fails: peak difference
0.000016481, RMS 0.0000000882; its reference control is 0.000001774. The issue
is therefore not fully resolved. Do not mark this card ready. A specific
approval question about peak and RMS bounds is pending with Kyle.

The final lane and build pass covers the unchanged production audio source;
the comparator follow-up is a QA-tool change, tested separately and still red.
No claim of human listening or exact mixed-waveform identity is made.

## Limiter diagnostic

The unchanged strict assertions still fail. Adding pre-limiter taps isolates
the residual: every case differs by at most 0.000000239 before the compressor,
including the 14-second race. After that unchanged nonlinear compressor the
race differs by 0.000016481 peak and 0.0000000884 RMS. This points to
compressor sensitivity to floating-point summation differences introduced by
regrouping the buses; it is an inference, not proof of perceptual equivalence.
The reference control differs by at most 0.000000239 before the compressor
and 0.000001774 after it. Diagnostic run: audio-baseline at
2026-09-25T06-24-47-619Z. No threshold or pass condition was changed.

The independent AUD-12-R1 fix is now ready in its own note. Full tier on
9268cb9 passed 254/254 with clean start and end. This does not resolve the
AUD-10 card-specific comparison.

## Final baseline recheck

After the later feature-switch regressions were fixed, the unchanged strict
comparison still fails only the 14-second race: peak .000016466, RMS
.0000000890, reference-control peak .000001788. Pre-limiter peak difference
is .000000179. The other four cases pass below .000000269. This agrees with
the prior diagnostic, not a newly audible mismatch. It still does not meet
the authored strict assertion, so no readiness claim is made.

The Director suggested preserving the exact old summation graph when switches
are off. That remains a possible design change, but it must be reconciled with
the card's named-bus contract before bypassing bus nodes. No graph bypass or
threshold change was applied. Kyle's explicit tolerance decision is pending.
