# Engine response expansion

The engine now gives a clearer signal of revs, pedal load and gear changes. This pass uses the existing credited recordings. No recording was downloaded, and no gameplay, vehicle handling or input mapping changed.

## What changed

- **Rev rise and fall:** one continuous exponential pitch contour spans 18.6 semitones from idle to redline. It follows `state.revs`, not road speed. Adjacent recorded textures use the same tonal target. Steady high revs still use one loaded recording, without a synthesized engine overlay or time-based pitch wobble.
- **High-rev recording:** PCM analysis found a strong 43 Hz drone beneath the 86 Hz harmonic used to tune the old mix. The drone had about 32 times the harmonic's power in a one-second spectrum. This could make the high-band transition sound lower, despite rising game revs. The preparation script now reduces that narrow drone with a 43 Hz, Q 3.5 notch. It retains 14% dry signal for exhaust weight and stable crossfades. Both the high loop and its fallback are level-matched; original recordings are untouched.
- **Throttle load:** pressing the pedal brightens the engine and raises the loaded texture. Lifting gives a quieter, darker coast texture, whose measured 63.5 Hz fundamental now follows the same rev target. Quick pedal jabs can trigger their lift accent without the attack cooldown swallowing it.
- **Gear changes:** the existing 180 ms load cut remains. Recorded pitch follows the new gear with a 24 ms response, versus 55 ms normally. The recorded shift accent is capped at 160 ms; attack and lift accents are capped at 320 and 280 ms. They cannot mask the next gear with a long recorded rev movement. Rapid shifts replace the previous accent.
- **Car character:** existing per-car pitch, brightness, exhaust and intake balances remain. The two Falcones share the same engine voice. Banshee and Titan keep deeper exhaust weight; Viper and Dusthawk retain brighter intake detail. These are fictional voices based on shared sources, not recordings of eight different engines.
- **Lifecycle:** duplicate engine-load calls reuse their promise, decoded buffers and looping sources. Pause, mute, menu exit and stage restart stop old engine accents. Restart clears load and shift history, including while muted, without rebuilding the audio graph. Reverse keeps the existing pedal mapping.

Loaded engine rates are bounded to 0.48–2.2. The lower-pitched coast source uses 0.48–3.0 to reach the same tone at extreme revs. Loaded filters remain capped at 3.4 kHz. Missing assets retain the recorded or procedural fallback.

## Measured checks

`node tools/test-audio.mjs` passes **438 checks**, including **536,302 finite audio-automation commands**. The test uses actual decoded WAV samples for signal checks and a mocked Web Audio graph for routing and scheduling.

| Check | Result |
| --- | --- |
| Measured idle-to-redline PCM rise, five representative voices | 18.57–18.81 semitones |
| Dry recorded-engine level reduction on lift at 70% revs | 9.84–10.00 dB |
| Same-rev load/coast tonal difference | Under 1.5 semitones |
| Representative upshift, 96% to 65% revs | More than 5 semitones down; downshift reverses the direction |
| High-loop 100 ms loudness swing | 0.73 dB, previously 1.07 dB |
| Fallback-loop 100 ms loudness swing | 1.30 dB, previously 3.01 dB |
| Worst six-second adjacent-band mix across all eight cars | 6.68 dB, within the existing 7 dB limit |
| Loop clipping and boundary checks | Pass |
| Gain cut after integrating the actual exponential response | Deeper than 6 dB, then above 98% within 200 ms of its end |

The first full-notch experiment produced an 8.10 dB crossfade swing on Titan. Keeping some dry low body reduced that to the accepted 6.68 dB maximum. The pitch-only experiment also exposed the old octave mismatch rather than treating target parameter values as proof of the sound's pitch.

The PCM test isolates the dry main recorded layers. It does not model the complete browser filter, compressor, reflection, music and speaker chain. **No human listening review is claimed.** A final headphone/speaker check should compare a full acceleration, an upshift, a downshift, a short pedal jab, a long lift and a steady high-speed hold in both Falcones, Banshee and Titan.

## Rebuild and source integrity

Run `node tools/prepare-audio.mjs`, then `node tools/test-audio.mjs`. A repeated build produced identical bytes for all 21 WAVs. All six retained engine/tire source files matched the repository baseline. Only these two derived WAVs changed:

- `engine-load-high.wav`: SHA-256 `a5d6c7fcc3854d05ff8e7b1a7db06b1993d0eb252aee7c69ac30509f720339a0`
- `engine-loop.wav`: SHA-256 `ed08eb8329fc7ef72d1793cbafae70d49a1bf19f78b2b438020644f761b8e7ba`

Each is still 70,964 bytes. Credits and licences remain in `public/assets/audio/CREDITS.md`. This document supersedes the older pitch and filter limits in `docs/AUDIO_ITERATION.md`; that file remains the historical record of earlier passes.
