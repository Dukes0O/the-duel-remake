---
task: AUD-14
status: ready-to-merge
kind: feature
flag: wasteland2
player_facing: yes
---

# Approved combat sounds

The requested blasts, crash, rocket launches, crossbow E pew whistle and hit
confirmation are rebuilt from AUD-12 recipes. Three measured rounds, real
combat checks and focused tests pass. Human scores remain pending. AUD-10,
AUD-11 and the gatekeeper wiring precede this card in the series.

## Design and implementation

Catalog-checked sources: blasts 523089/397691, crash 592388, rockets
854476/854473, and crossbow snap 384905 plus 394180. Crossbow E combines the
first 90 ms snap, a 3000-to-700 Hz .14-second pew, and a 2000-to-1500 Hz
moving whistle. Hit confirmation uses an 800 Hz low-passed thunk and 3200 Hz
tink. Car weapons use bright arcade signatures, not realistic gunfire.

A fixed three-variant rotation avoids immediate repeats without consuming
simulation randomness. Build with scripted trimming/conditioning, deterministic
layers, loudness matching and codec headroom, then Vorbis compression.
Thirty-six runtime variants total 453,141 bytes. Two rebuilds produced identical
compressed bytes; all decoded PCM outputs match the measured assets. All
variants measure at or below -1.43 dBTP. OGG files are marked binary.

Loaded recordings replace the cue's layers only with wasteland2 enabled.
Flag-off and missing-buffer paths preserve legacy Wasteland sounds. Blasts and
crashes use actual event geometry, distance attenuation and softer far spectra.
Crash strength retains its existing gain scale. App's named audio hook supplies
world listener position, heading and velocity without mutating race state.
Projectiles retain stable voice identity and update moving-source position.

## Tests first and three measured rounds

Ten focused tests cover provenance, compressed placement, variants, flag-off
fallback, lifecycle, deterministic synthesis, true peak, finite tails and
capacity stealing. Earlier code changes had failing tests first. The two final
policy tests document existing behavior without changing runtime code.

Round 1 found weak legacy signatures and marginal crash/confirm levels.
Round 2 rebuilt quiet cues and conditioned recordings. Round 3 corrected final
gains. Actual-event follow-up caught stereo routing loss omitted by direct bank
previews; the same 6 dB gate failed before the gain fix and passed afterward.
No threshold or assertion was relaxed. All 27 final ABC checks pass, minimum
6.06 dB above engine; actual blasts >=7.02 dB, typical crashes >=6.51 dB.

Dense 54-second cue train: -12.82 LUFS/-1.51 dBTP. Its loudness exceeds the
advisory race target and is flagged for human listening. Three measured rounds
do not imply three human approvals. Verdicts live under docs/board/listening/
combat. Mild crashes intentionally remain quieter through their strength scale.

The actual App fires a bolt, follows the same voice across five movement steps,
leaves race state untouched and releases every voice on pause. Whistle doppler:
2148 Hz approaching, 1564 Hz receding; stereo direction ratios exceed 1.5.
Near/far blast RMS .2341/.1544 with a softer far spectrum. Final combat browser
run: private port 45870, memory-only storage, zero warnings/errors.

## Flight lifetime and capacity policy

Flight cues are finite one-shots: crossbow 1.15 seconds and RPG 1.6 seconds
before doppler adjustment. Projectiles can live up to 2.5/4 seconds, so their
remaining flight can be silent. Retained projectile identity deliberately
suppresses reacquisition after natural end or stealing. Repeated attacks and
voice-pool churn would obscure other cues. A stolen cue fades once over 40 ms.
Expiry removes the identity; pause/mute/stage cleanup clears all ownership.

Independent review found no blocking lifecycle/identity defect and requested
this explicit policy. Two tests use actual EngineAudio/SoundMixer with fake
Web Audio nodes: natural completion and 17 bolts against the 16-voice limit.
Both run 120 more updates without reacquisition, then verify spatial cleanup
and empty ownership/voice pools. Continuous full-lifetime sound is not promised.

## Removed

Replaced active wasteland2 cue placeholders with approved recorded variants.
Legacy assets remain required by flag-off and missing-buffer fallbacks. Remove
them when the switch is retired in its own reviewed card. No approved source
or kept take was discarded. Director approved the test/scenario and binary hooks.

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
