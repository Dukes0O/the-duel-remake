# Audio iteration

The game uses recorded engines, tires, ambience, voice, and combat effects alongside synthesis. `src/sound-bank.js` declares cues, layers, variations, bus, priority, voice limit, distance, doppler, and ducking. The eight buses are engine, vehicle, weapons, impacts, ambience, music, voice, and interface. Sound never changes race state or saves.

## Sources, builds, and credit

Only sounds the game loads belong in `public/assets/audio/`. Runtime loops are FLAC and one-shots use compressed Vorbis where appropriate; the selected Callum gatekeeper line remains its original MP3. Raw Freesound previews, decoded WAV excerpts, stems, and rejected takes do **not** ship in `public/`. `tools/audio/catalog.json` records source IDs and URLs, authors, licenses, checksums, cuts, processing, and runtime outputs. `public/assets/audio/CREDITS.md` and in-game credits retain attribution.

Legacy Freesound downloads are cached outside Git in `C:/Users/kyleb/dev/audio-library/legacy/`; newly selected sources use `C:/Users/kyleb/dev/audio-library/freesound/`. Two licensed originals without a verified direct URL are retained as FLAC in `audio-src/library/`. Rebuild original engine, tire, and ambience assets with `npm run assets:audio`; rebuild new combat assets with `node tools/audio/build-combat.mjs`. Those audio-processing recipes need installed FFmpeg and their verified source inputs. `node tools/audio/build-gatekeeper.mjs` only hash-checks and copies the kept MP3; it does not need FFmpeg. A normal local rebuild makes no network request, but a clean checkout without the external source cache cannot rebuild every selected sound. Fourteen converted runtime files, including one-shot accents, shrank from 6,108,572 WAV bytes to 3,575,193 FLAC bytes without changing decoded signed-16 PCM or loop sample counts.

Engine sources include [V8 rev by overmedium](https://freesound.org/people/overmedium/sounds/651534/) and [Acceleration Car by Fabrizio84](https://freesound.org/people/Fabrizio84/sounds/457958/), both CC0 previews. The older [racing loop](https://opengameart.org/content/racing-car-engine-sound-loops) is CC0; the [tire squeal](https://opengameart.org/content/car-tire-squeal-skid-loop) is CC BY 3.0. Ambience uses CC0 [Pacific waves](https://freesound.org/people/felix.blume/sounds/500171/), [forest](https://freesound.org/people/deadrobotmusic/sounds/609952/), and [crowd](https://freesound.org/people/stomachache/sounds/274516/). Exact selections and hashes live in the catalog. These recordings are not studio captures of the fictional cars.

## Engine, tires, and environment

Four engine textures blend across revs with equal-power curves. At settled high revs, only the leveled steady recording plays; the older loop and synthesized harmonic stay silent when recordings load. Recorded playback is bounded to 0.65–1.4 times speed and filter cutoff to 3 kHz. Throttle blends load and quieter filtered coast. Shifts unload main, exhaust, and intake paths over 180 ms and add a recorded accent. A failed asset request retains the previous recording or synthesized fallback. The shared recordings receive conservative voicing: Falcone base, Stuttgart softer/lower, Aurora smoother, Dusthawk sharper, Banshee heavier exhaust, Viper brighter, and Titan deepest. This is not seven new recording sessions.

The main engine recording also feeds filtered exhaust-body and intake paths. Hood view emphasizes intake, chase view balances them, and wide view reduces and darkens the vehicle bus. A quiet speed-sensitive tire bed precedes slip. Asphalt slip brings in recorded squeal; loose surfaces use filtered gravel. Both stop while airborne. A scored landing adds a low thump. Chicken-flock nitro adds flutter and chime. Loss and timeout use the descending result cue.

Loop leveling reduced 100 ms envelope swings: idle 16.13→5.62 dB, low load 8.83→1.38 dB, mid load 6.40→1.11 dB, and coast 9.88→3.15 dB. The high-speed loop is about 1.07 dB. A six-second seven-car PCM comparison measured a worst adjacent-band swing of 5.99 dB. These are signal checks, not listening scores.

Police use a two-voice synthesized wail driven by physical distance when available, with longitudinal-gap fallback. Real tunnels add two quiet filtered engine/tire reflections at 71 and 131 ms without feedback. Siren, music, reward chime, and exterior ambience bypass them. Coast, forest, and crowd loops select by actual course section, event, and day/night setting; forest birds are suppressed at night. Section changes fade over 0.65 seconds. Loading is shared, failures are independent of engine/tire playback, and pause, mute, and menu exit fade or stop the appropriate voices. The in-race sequencer sits behind vehicle sounds.

Arena junk-car crushes reuse the collision-noise source at 0.72 playback speed, for at most 260 ms, with a quiet metal accent. Only the player's crush event triggers this close impact; it is not a new crash recording or a fatal cue.

## Routing and strict baseline

When new audio switches are off, old sound leaves still feed buses for meters, but audible bus outputs are disconnected; leaves reconnect directly to their original endpoints. Enabled cues route through the buses. Switching off/on/off reuses sources without duplicates or reopening a fading cue. `hidden-road` alone enables gatekeeper voice and ducking; the newer combat and moving-source path requires `wasteland2`. A 64-voice total cap and per-cue limits favor higher-priority sounds and fade evicted voices. Overlapping duck requests release independently. Listener and source position, heading, and velocity are read from the game.

The strict disabled-route comparison uses old/current/old-control captures on the same clock. Its peak error limit stayed at 0.000002; the corrected comparison's worst peak was about 0.000000269. A native-rate recorded race measured -17.75 LUFS and -1.52 dB true peak; ten race gates passed on a 23-event, seven-track fixture. This validates technical routing, not taste.

The analyzer uses installed FFmpeg EBU R128 for integrated loudness and oversampled true peak, and compares loop seams with ordinary adjacent waveform steps. Capture at the browser's native audio sample rate before making a true-peak claim; resampling a synthetic fixture is not equivalent. Missing evidence is marked unavailable. Run `node tools/audio-analysis.mjs RECORDING_DIRECTORY --check` on a captured race.

## Listening booth

The local booth plays the real renderer's engine and ambience beds with near/far and A/B/C choices. A listener can save a named 1–5 rating and note as unique JSON under `docs/board/listening/`. The booth records heard settings and rejects stale asynchronous A/B loads. It uses a private local port and memory-only QA. Run `node tools/audio/booth-server.mjs [private-port]` for saved notes; focused checks are `node tools/test-audio-listening.mjs` and `node tools/test-audio-analysis.mjs`. Browser checks are `node tools/browser-harness.mjs scenario audio-listening` and `node tools/browser-harness.mjs record-race`. Static playback cannot save a rating. A fixture is not a human verdict; headphone and speaker review, including shift clarity, remains necessary.

## Kept gatekeeper voice

Kyle kept the Callum invitation take. It plays once at hidden-road opening or gate arrival, with the invitation subtitle. It works with `hidden-road` alone and ducks the engine through the voice bus. An early trigger waits for stage load; pausing before playback defers it, while pausing after playback stops it without replay. Mute, navigation, or journey replacement clears it. The subtitle still appears if audio fails, including automatic arrival. Race timing does not change.

Source and runtime are the same 66,499-byte MP3, SHA-256 `5772399d1112b33edc845e5253417afd4d55ca1898fcb54f8901899a4eb96106`; it was not regenerated or transcoded. The decoded browser line lasts about 4.087 seconds. Measured full-throttle speech contrast was 13.06 dB above engine; the mix was -15.5 LUFS and -2.8 dB true peak. Credit and free-plan non-commercial terms remain in the catalog and credits. Kyle's selected take is not proof of complete human mix review.

## Combat cues and moving sources

Selected sources include blasts 523089/397691, crash 592388, rockets 854476/854473, and crossbow snap 384905/394180. Crossbow combines a brief snap, a 3000→700 Hz pew, and a moving 2000→1500 Hz whistle. Hit confirmation combines a low thunk and high tink. Car weapons use bright arcade signatures. Fixed three-variant rotation consumes no simulation randomness. Deterministic processing compressed 36 runtime variants to 453,141 bytes; two rebuilds had identical compressed and decoded PCM outputs, with true peaks at or below -1.43 dBTP.

Recorded layers replace older synthesis only when `wasteland2` is on and buffers are ready. Flag-off or missing-buffer playback keeps legacy cues. Blasts and crashes use event positions and distance attenuation; crash strength retains the existing gain. Projectiles retain stable audio identity and update source position. Pause, mute, stage exit, and expiry clear voices. In measured A/B/C comparisons, 27 cues exceeded the engine by at least 6.06 dB; a dense train measured -12.82 LUFS and -1.51 dBTP. That loud mix still needs human listening.

Flight sounds are **finite one-shots**: about 1.15 seconds for crossbow and 1.6 seconds for RPG before doppler. A projectile can live longer, so later flight can be silent. A naturally ended or priority-stolen voice keeps its identity until expiry and does not restart on every position update. This avoids repeated attacks and pool churn; stealing fades in about 40 ms. Continuous sound for the full flight is not promised. Legacy assets remain until their switches are retired.

## Verification boundary

Focused tests cover source hashes, decoded signals, bus routing, flag-off equality, voice limits, ducking, moving-source cleanup, pause/mute, booth behavior, and browser playback. Automated measurement cannot replace human headphone/speaker listening. Keep pending listening scores and later voice casting separate from implemented sound.
