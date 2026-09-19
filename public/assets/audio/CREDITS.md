# Audio credits

## Recorded engine

**Racing car engine sound loops**, by **domasx2**. Source: [OpenGameArt](https://opengameart.org/content/racing-car-engine-sound-loops). Licence: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).

Original file: `engine-source.wav` (`loop_0.wav` from the source). The author describes a public-domain recording edited into a loop. Runtime file: `engine-loop.wav`. Changes: DC removal, loop crossfade, peak normalization. Runtime pitch and filtering follow engine RPM and throttle. This is a processed recording, not a recording of either fictional car or a full set of measured RPM bands.

## Recorded tires

**Car tire squeal skid loop**, by **audible-edge / Tom Haigh**, loop edit by **qubodup**. Source: [OpenGameArt](https://opengameart.org/content/car-tire-squeal-skid-loop). Licence: [Creative Commons Attribution 3.0 Unported](https://creativecommons.org/licenses/by/3.0/).

Original file: `tire-squeal.wav` (`tires_squal_loop.wav` from the source). Runtime file: `tire-loop.wav`. Changes: 96 kHz/24-bit mono resampled to 44.1 kHz/16-bit mono with a windowed-sinc filter, DC removal, short loop crossfade, peak normalization. Runtime pitch and volume follow sliding and braking. No endorsement by the authors is implied.

## Original sound

`catastrophic-blast.wav` is an original synthesized pressure wave, noise burst and debris tail created for this game by `tools/prepare-audio.mjs`. Engine underlay, wind, gravel, siren, boost, impact and the musical sequence are original synthesis in `src/audio.js`.

Downloaded and processed 19 September 2026. Keep this attribution file and the in-game Audio Credits link when distributing the audio. Rebuild processed WAVs with `npm run assets:audio`.
