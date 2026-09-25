# Audio credits

## Recorded V8 revs and idle

**v8 engine rev.wav**, by **overmedium**, 25 September 2022. Primary source: [Freesound recording page](https://freesound.org/people/overmedium/sounds/651534/). Licence: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), verified on the recording page. The author describes a V8 throttle-blip and idle recording made with binaural microphones, with a high-pass filter and fades already applied by the author. The car model is not identified.

Downloaded the public [HQ MP3 preview](https://cdn.freesound.org/previews/651/651534_2396512-hq.mp3) as `v8-rev-source.mp3`. This is the publicly served compressed preview, not the account-only original WAV. Decoded with FFmpeg 7.1 to mono 44.1 kHz/16-bit `v8-rev-source.wav`. The download and decoded excerpt are cached outside the repository; tools/audio/catalog.json keeps the exact recipe. No account, payment or additional runtime codec is required.

Derived files: `engine-idle.wav`, `engine-coast.wav`, `engine-throttle.wav`, `engine-lift.wav`, `engine-shift.wav`. Changes: time selections specified in `tools/prepare-audio.mjs`, DC removal, 38 Hz high-pass filtering, peak and RMS level matching, 120 ms loop crossfades or short start/end fades. The mixer changes their pitch, gain and low-pass filter with engine revs and throttle. These are artistic load textures, **not measured RPM bands from the game's fictional cars**. The rev-blip recording is not used for sustained high-speed playback.

## Recorded acceleration

**Acceleration Car**, by **Fabrizio84**, 1 February 2019. Primary source: [Freesound recording page](https://freesound.org/people/Fabrizio84/sounds/457958/). Licence: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), verified on the recording page. The author identifies it as acceleration recorded from inside a vehicle and places the sound in the public domain.

Downloaded the public [HQ MP3 preview](https://cdn.freesound.org/previews/457/457958_2841496-hq.mp3) as `acceleration-source.mp3`. This is the publicly served compressed preview, not the account-only original WAV. Decoded with FFmpeg 7.1 to mono 44.1 kHz/16-bit `acceleration-source.wav`. The download and decoded excerpt are cached outside the repository; tools/audio/catalog.json keeps the exact recipe.

Derived files: `engine-load-low.wav`, `engine-load-mid.wav`. Changes: time selections, DC removal, 38 Hz high-pass filtering, peak and RMS level matching, 120 ms loop crossfades. Playback blends adjacent engine textures using equal-power curves, with moderate pitch shifts and throttle-dependent filtering. No endorsement by either recording author is implied.

## Steady engine loop and fallback

**Racing car engine sound loops**, by **domasx2**. Source: [OpenGameArt](https://opengameart.org/content/racing-car-engine-sound-loops). Licence: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).

Original file: `engine-source.wav` (`loop_0.wav` from the source). The author describes a public-domain recording edited into a loop. Runtime files: `engine-loop.wav` (fallback) and `engine-load-high.wav` (sustained high-speed playback). Changes: DC removal, loop crossfade, peak normalization. The high-speed version also applies a 38 Hz high-pass filter, 90 ms circular RMS leveling and level matching. At high revs it plays as a single engine voice with moderate pitch changes; the old fallback and synthetic engine do not play over it.

## Recorded tires

**Car tire squeal skid loop**, by **audible-edge / Tom Haigh**, loop edit by **qubodup**. Source: [OpenGameArt](https://opengameart.org/content/car-tire-squeal-skid-loop). Licence: [Creative Commons Attribution 3.0 Unported](https://creativecommons.org/licenses/by/3.0/).

Original file: `tire-squeal.wav` (`tires_squal_loop.wav` from the source). Runtime file: `tire-loop.wav`. Changes: 96 kHz/24-bit mono resampled to 44.1 kHz/16-bit mono with a windowed-sinc filter, DC removal, short loop crossfade, peak normalization. Runtime pitch and volume follow sliding and braking. No endorsement by the authors is implied.

## Recorded landscape ambience

Three real field recordings are used under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Each licence was verified on its primary Freesound page on 19 September 2026:

- [Sea waves on the beach, some seagulls in background](https://freesound.org/people/felix.blume/sounds/500171/), by **felix.blume**, 26 December 2019. The author identifies Caleta Portales near Valparaíso, Chile, and a Schoeps CCM41/CCM8 microphone setup. The 20–44 second selection becomes `ambience-coast.wav`.
- [Sunny Forest Ambience 1](https://freesound.org/people/deadrobotmusic/sounds/609952/), by **deadrobotmusic**, 30 November 2021. The author identifies this as forest field-recorded ambience with birds. The 10–34 second selection becomes `ambience-forest.wav`.
- [Stadium Crowd](https://freesound.org/people/stomachache/sounds/274516/), by **stomachache**, 20 May 2015. The author describes general crowd noise recorded at a sports stadium. The full 8.193-second preview becomes `ambience-stadium.wav`.

The original public HQ MP3 previews are cached outside the repository as `coast-source.mp3`, `forest-source.mp3`, and `stadium-source.mp3`. These are compressed previews, not the account-only original WAV recordings. FFmpeg 7.1 decoded the stated excerpts to mono 44.1 kHz/16-bit PCM `*-source.wav` files. `tools/audio/catalog.json` records exact download URLs, source hashes, time selections and processing. The runtime loops apply DC removal, modest high-pass filtering, peak/RMS ceilings and 1.25-second coast/forest or 0.8-second crowd loop crossfades. Rebuild only these files with `node tools/prepare-audio.mjs --ambience-only`.

The mixer plays one unpitched loop per recording and fades between landscape sections. Coast surf, daytime alpine forest and arena crowd play quietly below vehicle sounds; tunnels and high-speed acceleration reduce them further. Daytime forest birds are omitted on night routes. No author endorsement is implied.

## Original sound design

`catastrophic-blast.wav` is an original synthesized pressure wave, noise burst and debris tail created for this game by `tools/prepare-audio.mjs`. Engine underlay, wind, gravel, siren, boost, impact, chicken-flock wing flutter, bonus chime and the musical sequence are original synthesis in `src/audio.js`.

The seven fictional cars use original pitch, gain and filtering profiles applied to the shared licensed recordings above. These are not recordings of seven separate vehicles. Tunnel reflections use short fixed filtered delays on engine and tire signals. The two-voice proximity siren, gravel layer and landing thump are original synthesis; no additional recording or impulse response was downloaded for them.

Idle, low/mid load and coasting loops also use the same 90 ms circular RMS leveling as the high-speed loop. This reduces repeated source loudness swells without changing the selected recording regions. Idle compensation is capped at 2.5 times; the other loops use the original 1.7 limit. The idle pitch reference was calibrated against its PCM tonal peak. No new source recording was added during this audit.

Downloaded and processed 19 September 2026. Keep this attribution file and the in-game Audio Credits link when distributing the audio. Rebuild compressed FLACs with `npm run assets:audio`.

Harmless arena junk-car crushing reuses the original synthesized collision-noise buffer at a lower playback rate and gain, with a short original metallic tone. It does not use a recorded crash source or the catastrophic explosion sample.

The engine-response expansion also reduces a narrow 43 Hz drone in `engine-load-high.wav` and `engine-loop.wav`, using a Q 3.5 notch blended with 14% of the dry signal. Both loops use level matching and circular RMS leveling. The retained source recording is unchanged. Runtime rev pitch now has a wider, continuous contour; the coast texture is tuned to its measured 63.5 Hz fundamental. No new source or licence is involved. See `docs/AUDIO_EXPANSION.md` for processing and test details.

AUD-10: all fourteen runtime recordings now use lossless FLAC. Their decoded PCM and loop sample counts are unchanged. Raw sources no longer ship in public/. Freesound previews live in the external audio-library cache, with recipes and checksums in tools/audio/catalog.json. The two licensed OpenGameArt originals are preserved losslessly in audio-src/library because the old credits do not record verified direct download URLs. New synthesis recipes live in src/sound-bank.js; state-driven engine automation stays in src/audio.js.

## Gatekeeper voice

Gatekeeper welcome generated with ElevenLabs, using its stock Callum voice.
Kyle selected this exact take on 24 September 2026. The catalog records the
ElevenLabs free-plan non-commercial and attribution terms. The runtime MP3
is a byte-for-byte copy of the kept source; only game mixer gain is applied.
Rebuild it with `node tools/audio/build-gatekeeper.mjs`.
