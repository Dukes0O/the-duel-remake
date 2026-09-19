# Audio credits

## Recorded V8 revs and idle

**v8 engine rev.wav**, by **overmedium**, 25 September 2022. Primary source: [Freesound recording page](https://freesound.org/people/overmedium/sounds/651534/). Licence: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), verified on the recording page. The author describes a V8 throttle-blip and idle recording made with binaural microphones, with a high-pass filter and fades already applied by the author. The car model is not identified.

Downloaded the public [HQ MP3 preview](https://cdn.freesound.org/previews/651/651534_2396512-hq.mp3) as `v8-rev-source.mp3`. This is the publicly served compressed preview, not the account-only original WAV. Decoded with FFmpeg 7.1 to mono 44.1 kHz/16-bit `v8-rev-source.wav`. Both source files are retained. No account, payment or additional runtime codec is required.

Derived files: `engine-idle.wav`, `engine-coast.wav`, `engine-throttle.wav`, `engine-lift.wav`, `engine-shift.wav`. Changes: time selections specified in `tools/prepare-audio.mjs`, DC removal, 38 Hz high-pass filtering, peak and RMS level matching, 120 ms loop crossfades or short start/end fades. The mixer changes their pitch, gain and low-pass filter with engine revs and throttle. These are artistic load textures, **not measured RPM bands from the game's fictional cars**. The rev-blip recording is not used for sustained high-speed playback.

## Recorded acceleration

**Acceleration Car**, by **Fabrizio84**, 1 February 2019. Primary source: [Freesound recording page](https://freesound.org/people/Fabrizio84/sounds/457958/). Licence: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), verified on the recording page. The author identifies it as acceleration recorded from inside a vehicle and places the sound in the public domain.

Downloaded the public [HQ MP3 preview](https://cdn.freesound.org/previews/457/457958_2841496-hq.mp3) as `acceleration-source.mp3`. This is the publicly served compressed preview, not the account-only original WAV. Decoded with FFmpeg 7.1 to mono 44.1 kHz/16-bit `acceleration-source.wav`. Both source files are retained.

Derived files: `engine-load-low.wav`, `engine-load-mid.wav`. Changes: time selections, DC removal, 38 Hz high-pass filtering, peak and RMS level matching, 120 ms loop crossfades. Playback blends adjacent engine textures using equal-power curves, with moderate pitch shifts and throttle-dependent filtering. No endorsement by either recording author is implied.

## Steady engine loop and fallback

**Racing car engine sound loops**, by **domasx2**. Source: [OpenGameArt](https://opengameart.org/content/racing-car-engine-sound-loops). Licence: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).

Original file: `engine-source.wav` (`loop_0.wav` from the source). The author describes a public-domain recording edited into a loop. Runtime files: `engine-loop.wav` (fallback) and `engine-load-high.wav` (sustained high-speed playback). Changes: DC removal, loop crossfade, peak normalization. The high-speed version also applies a 38 Hz high-pass filter, 90 ms circular RMS leveling and level matching. At high revs it plays as a single engine voice with moderate pitch changes; the old fallback and synthetic engine do not play over it.

## Recorded tires

**Car tire squeal skid loop**, by **audible-edge / Tom Haigh**, loop edit by **qubodup**. Source: [OpenGameArt](https://opengameart.org/content/car-tire-squeal-skid-loop). Licence: [Creative Commons Attribution 3.0 Unported](https://creativecommons.org/licenses/by/3.0/).

Original file: `tire-squeal.wav` (`tires_squal_loop.wav` from the source). Runtime file: `tire-loop.wav`. Changes: 96 kHz/24-bit mono resampled to 44.1 kHz/16-bit mono with a windowed-sinc filter, DC removal, short loop crossfade, peak normalization. Runtime pitch and volume follow sliding and braking. No endorsement by the authors is implied.

## Original sound

`catastrophic-blast.wav` is an original synthesized pressure wave, noise burst and debris tail created for this game by `tools/prepare-audio.mjs`. Engine underlay, wind, gravel, siren, boost, impact, chicken-flock wing flutter, bonus chime and the musical sequence are original synthesis in `src/audio.js`.

Downloaded and processed 19 September 2026. Keep this attribution file and the in-game Audio Credits link when distributing the audio. Rebuild processed WAVs with `npm run assets:audio`.
