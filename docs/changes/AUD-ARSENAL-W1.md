# AUD-ARSENAL-W1: Oil Slick and Smoke Screen sounds

The three released cues now play genuine recorded CC0 sounds through the real
EngineAudio. Arsenal remains dev. Browser capture, independent audio review and
current lane/build gates are still pending; this is a Source candidate.

## Source and provenance

- weapon.oil.deploy: lzmraul, Mud_1.wav, Freesound 389460.
- weapon.oil.slip: barion, car2.WAV, Freesound 462117.
- weapon.smoke.deploy: Sadiquecat, airy weighted-string whistle, Freesound 855733.
- Each cached recording matches its existing catalog SHA-256 and CC0 record.
  Three derivative recipe rows are appended; every old row stays semantically
  exact. No downloaded source, paid generation, key or voice take changed.
- tools/build-arsenal-core-audio.mjs commits the checked cuts, filters, recording
  envelopes, bounded ABC repitch variants and distinct bright swept accents.
  It verifies source hashes,
  writes mono 48 kHz Vorbis q5 and measures codec headroom. Recordings remain
  the main texture. Rebuilding in ignored scratch produces identical bytes.
- Runtime holds three ABC recordings per cue, nine clips and 93,722 bytes
  total. The original A paths and bytes stay exact; B/C are new current files.
  All nine decode to different recordings and rebuild to identical bytes.
- Native EngineAudio.event accepts only these three real arsenalCue values in
  discovered Wasteland audio with wasteland2 and arsenal enabled. It uses the
  actual hazard/contact position and the weapons bus. Spatial connections are
  released when playback ends; other event mappings retain their old paths.

## Tests and measurements

Independent tests first at 30103b4: 14 checks, 5 PASS and 9 genuine RED. Real
Duel launches and a real rival body touching native Oil already emitted each
cue once. Missing bank entries, catalog recipes and actual EngineAudio
consumption caused the failures. No Source or assertions changed in that step.

After Source: the same 14 checks pass. They decode only the nine new clips,
use actual EngineAudio and SoundMixer, prove state purity and pin every old
sound-bank entry, other bank export and catalog record. No existing assertion,
replay fingerprint or world signature changed.

Decoded clip measurements from FFmpeg EBU R128:

| Cue | Duration | ABC LUFS range | Highest true peak dBTP |
| --- | ---: | ---: | ---: |
| Oil deploy | 0.70 s | -17.84 to -16.41 | -2.71 |
| Oil slip | 0.80 s | -16.34 to -16.21 | -4.67 |
| Smoke deploy | 0.52 s | -16.21 to -16.11 | -4.73 |

Syntax checks for audio, bank, builder and scenario and git diff --check pass.
No broad gate, build, browser or protected-audio job ran in this Source step.

The private recorder uses actual App, native Oil hazard/contact events and
native W key input. Each new campaign waits for real visual readiness and car
context, then for genuine fixed steps to produce throttle 1 and positive revs.
Three real campaign repetitions exercise each recorded ABC cue exactly once;
strict full-throttle, variation, state-purity and six-voice bounds stay intact.

Independent AudioQA passed High at 99a0e73: 14.379 seconds of Float32 audio,
-5.61 dBFS sample peak and -5.58 dBTP true peak, with no clipped samples or
adjacent jumps above 0.5. The following recording failed its strict continuity
guard. Fresh 11211b7 passed all genuine native/ABC/full-throttle/purity checks
but exposed a common recorder startup gap: frame 35072 to 37632 instead of
37120, missing 512 samples (10.667 ms), before the measured gameplay window.
Actual pause cleared all voices. This was recorder setup, not a sound tune.

The recipe now establishes one common native sample-frame epoch after real
input and three consecutive post-input chunks have arrived on all three
stems. It slices only pre-epoch setup samples consistently across stems and
rebases event times to that epoch. All samples and gaps at/after the epoch,
including between later campaigns, remain. An epoch-crossing gap also fails;
no silence, sample replacement or measured-gap removal is used.

Partial/completed native events, input frames and recording headers are saved
before validation without PCM/base64 in JSON. Diagnostics retain total and
measured gap counts, the first setup and measured gaps, and actual frame times.
AudioQA at f22e5ff passed both qualities: all native/ABC/full-throttle,
contiguity, state-purity and cleanup checks, cue onset within -3 ms, no clipping,
clicks or measured gaps. Final mix measured -16.54/-16.51 LUFS and -5.38/-5.50
dBTP. The new cues were masked: 120 ms weapon-versus-engine RMS contrasts
were Oil deploy -0.63 to +0.58 dB, slip -2.83 to -1.95 and Smoke -2.68 to
+2.80, below the +6 dB target. Only these cues' volumes now rise from
1.35/1.3/1.35 to 3.375/3.9/3.915. Gain arithmetic predicts improvement,
but actual full-throttle recapture and overlapping-voice headroom remain open.
Engine, limiter, old bank records, recordings, recipes and assertions stay
exact. Human recognition is unclaimed; no broad gate or build ran here.

Automatic approval review rejected an optional preservation JSON as an
unreviewed fingerprint baseline. It was never created or retried by this
Source owner. Existing replay fixtures and inline sound-data checks supply the
usable preservation controls without changing any replay pin.

## Removed

None. These cues replace no recording, voice, recipe or old event path.
