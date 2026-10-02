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

Independent AudioQA found two pre-capture blockers: a browser import pointed
at an unavailable unbundled Source URL, and repeated slips had no variation.
The corrected recipe captures the genuine Oil event.hazard, places the real
victim and advances native fixed steps. No fake producer or App export is used.
Three actual campaign repetitions exercise the existing cue-buffer indices;
each cue must play once per repetition, use different decoded ABC recordings,
stay within six voices and leave race state unchanged. Old assertions remain.
Full-throttle engine/weapons/final-output Float32 capture runs in both qualities.
AudioQA at 3813a74 reached the genuine native/ABC checks but stopped on the
unchanged full-throttle assertion before writing WAVs: real App loading blocks
input until the renderer presents the new campaign. The recipe now waits at
most 15 seconds per cycle for actual visualReady on that same state/course,
then stops and places the fixtures. After changing countdown to racing, it
runs the actual presentation and waits for real readiness and car context
before dispatching native W keydown and restarting the measured clock/App.
This avoids a presentation context transition clearing a prematurely held key.
It never forces readiness or input. A failed throttle check reports its first
bad frame with readiness, status, pause, actual context, held key, matching
gate and native control-lock diagnostics. All prior assertions remain exact.
This readiness/context fix is unrun. Recognition, onset, stereo placement, mixed peaks,
pause cleanup and human listening still need AudioQA; no ratings are invented.
No broad gate, build or protected-audio job ran for these fixes.

Automatic approval review rejected an optional preservation JSON as an
unreviewed fingerprint baseline. It was never created or retried by this
Source owner. Existing replay fixtures and inline sound-data checks supply the
usable preservation controls without changing any replay pin.

## Removed

None. These cues replace no recording, voice, recipe or old event path.
