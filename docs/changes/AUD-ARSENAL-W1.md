# AUD-ARSENAL-W1: Oil Slick and Smoke Screen sounds

Three CC0 recorded cues now play through real EngineAudio. Independent runtime
review and native AudioQA pass. Arsenal remains dev; fresh lane/build gates
are pending on this final candidate. No release is claimed.

## Source and provenance

- weapon.oil.deploy: lzmraul, Mud_1.wav, Freesound 389460.
- weapon.oil.slip: barion, car2.WAV, Freesound 462117.
- weapon.smoke.deploy: Sadiquecat, airy weighted-string whistle, Freesound 855733.
- Cached bytes match the existing CC0 records and SHA-256 values. Three recipe
  rows were appended; every previous catalog row, bank entry, other bank export
  and voice record stays exact. No paid generation, key or new take was used.
- tools/build-arsenal-core-audio.mjs rebuilds checked cuts, filters, fades and
  bounded ABC pitch/tonal variants as mono 48 kHz Vorbis q5. Recorded texture
  stays dominant. Nine distinct clips total 93,722 bytes and rebuild exactly.
  Original A paths/bytes stay exact; B/C are additional current recordings.
- Only the three native arsenalCue values play, with wasteland2 and arsenal
  enabled in discovered Wasteland audio. Genuine hazard/contact positions use
  the weapons bus. Six-voice pools and end cleanup use the existing mixer.
- Only these cues' volumes rose to 3.375/3.9/3.915 after measured masking.
  Engine, limiter, old cues and global mixing were not retuned.

## Tests and review

Independent tests first at 30103b4: 14 checks, 5 PASS and 9 genuine RED.
Actual Duel Oil/Smoke launches and body contact already emitted each cue once;
missing recordings, recipes and actual EngineAudio consumption caused RED.

The unchanged 14 native checks now pass. They decode the nine new clips,
observe real EngineAudio/SoundMixer playback, prove state purity and pin all
old sound-bank/catalog data. Syntax and git diff --check pass. No assertion,
replay fingerprint or world signature changed.

Independent review clears runtime correctness, ownership, state purity and
recorder handling at 92aa902. Native AudioQA passes both qualities with 18
actual cue events: real campaign repetitions, ABC variation, full throttle,
actual positions/panning, once-only consumption, pause and voice cleanup.
The recorder waits for real presentation/input and consecutive native stamped
chunks, then uses one common epoch. Only pre-epoch setup samples are sliced;
all measured samples and gaps, including between campaigns, remain checked.
Partial metadata contains native events/input frames and explicit gap counts;
it never contains PCM/base64. No fake event producer or forced input is used.

| Final measured property | Result |
| --- | --- |
| 120 ms weapon-versus-engine contrast, all 18 cues | +6.15 to +8.50 dB |
| Cue onset against native events | -3 to +3 ms |
| Final High / Performance true peak | -2.56 / -2.63 dBTP |
| Clipped samples, clicks, measured gaps | 0 |
| Dense nine-cue mix loudness, High / Performance | -13.08 / -13.12 LUFS |

Dense-mix loudness is advisory under SPEC 0.9. A separate unchanged 14-second
existing-race capture with six stems passed its preservation checks. Human
recognition ratings and a new six-slip overlap stress capture were not done.
The independent reviewer confirmed that new overlap stress is not a merge
blocker for this card; no overlap or human listening result is invented.

Integration d156a59 was merged normally before final gates. Audio Source,
assets, recipe, scenario and tests remain byte-exact from reviewed 92aa902.
This note folds the temporary recorder/masking findings into the final verdict.
Fresh lane/build evidence must be recorded by the Director before merge.

The optional preservation JSON rejected by automatic approval review was never
created. Existing replay fixtures and inline sound-data pins provide controls.

## Removed

None. These cues replace no recording, voice, recipe or old event path.
