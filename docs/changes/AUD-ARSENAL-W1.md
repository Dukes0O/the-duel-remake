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
  envelopes and distinct bright swept accents. It verifies source hashes,
  writes mono 48 kHz Vorbis q5 and measures codec headroom. Recordings remain
  the main texture. Rebuilding in ignored scratch produces identical bytes.
- Runtime files are arsenal-core/oil-deploy.ogg (10,799 bytes), oil-slip.ogg
  (11,647 bytes) and smoke-deploy.ogg (9,029 bytes), 31,475 bytes total.
- Native EngineAudio.event accepts only these three real arsenalCue values in
  discovered Wasteland audio with wasteland2 and arsenal enabled. It uses the
  actual hazard/contact position and the weapons bus. Spatial connections are
  released when playback ends; other event mappings retain their old paths.

## Tests and measurements

Independent tests first at 30103b4: 14 checks, 5 PASS and 9 genuine RED. Real
Duel launches and a real rival body touching native Oil already emitted each
cue once. Missing bank entries, catalog recipes and actual EngineAudio
consumption caused the failures. No Source or assertions changed in that step.

After Source: the same 14 checks pass. They decode only the three new clips,
use actual EngineAudio and SoundMixer, prove state purity and pin every old
sound-bank entry, other bank export and catalog record. No existing assertion,
replay fingerprint or world signature changed.

Decoded clip measurements from FFmpeg EBU R128:

| Cue | Duration | LUFS | True peak dBTP |
| --- | ---: | ---: | ---: |
| Oil deploy | 0.70 s | -17.46 | -2.71 |
| Oil slip | 0.80 s | -16.34 | -5.11 |
| Smoke deploy | 0.52 s | -16.21 | -5.15 |

Syntax checks for audio, bank, builder and scenario and git diff --check pass.
No broad gate, build, browser or protected-audio job ran in this Source step.

The private arsenal-core-audio browser recipe observes actual App to Duel to
EngineAudio calls, full-throttle engine/weapons/final-output Float32 recordings
in both qualities, actual cue positions, once-only playback and state purity.
It captures pause cleanup and preserves unclipped sample peaks for review.
It is unrun. Audible recognition, onset, stereo placement, final mixed peaks,
cleanup and human listening remain unproved; no ratings are invented.

Automatic approval review rejected an optional preservation JSON as an
unreviewed fingerprint baseline. It was never created or retried by this
Source owner. Existing replay fixtures and inline sound-data checks supply the
usable preservation controls without changing any replay pin.

## Removed

None. These cues replace no recording, voice, recipe or old event path.
