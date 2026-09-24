# Recorded engine audio

The engine blends real idle, revving and acceleration recordings with throttle-dependent coasting and short gear-change effects. Sustained high revs use a leveled steady recording with no extra pitched engine layer. The older unlevelled loop remains as a fallback.

## Sources

- [V8 engine rev](https://freesound.org/people/overmedium/sounds/651534/) by overmedium: real V8 throttle blips and idle, recorded with binaural microphones. CC0, verified on the author's recording page.
- [Acceleration Car](https://freesound.org/people/Fabrizio84/sounds/457958/) by Fabrizio84: acceleration recorded inside a vehicle. CC0, verified on the author's recording page.
- Existing [racing engine loop](https://opengameart.org/content/racing-car-engine-sound-loops) by domasx2, CC0, and [tire squeal](https://opengameart.org/content/car-tire-squeal-skid-loop) by audible-edge / Tom Haigh, loop edit by qubodup, CC BY 3.0, remain credited.

The new sources are Freesound's public HQ MP3 previews. The account-only original WAVs were not downloaded. The public previews retain real recording detail but have lossy compression. Source MP3s and decoded mono WAVs are in `public/assets/audio`; the full source URLs and modifications are in that directory's `CREDITS.md`. No account, payment or new runtime dependency is required.

## Runtime behavior

- Four engine textures blend across the rev range using equal-power curves, with their dominant tones aligned. Above the transition into high revs, only the steady high-speed recording plays. Loaded engine playback rates are capped at 1.4, and the synthetic/older loop overlays are silent when recordings are available.
- Throttle blends the loaded engine with a quieter, filtered coasting layer. Pressing or releasing the throttle adds a short real recording excerpt.
- Shifting briefly reduces the engine level and plays an edited recording accent.
- Tire squeal still follows sliding and braking on asphalt. Dirt uses gravel noise instead.
- The chicken-flock nitro reward plays an original wing-flutter effect and a short rising chime when the game emits `chickenBonus`.
- Muting and pausing fade the master level. Pausing stops active recorded accents. Failed asset requests retain the previous recording and synthesized fallback.

The engine textures are edited field recordings from different vehicles, not measured RPM/load recordings of the fictional cars. A measured studio engine pack would give a closer match across every gear and microphone position. No claim of human listening or a studio audio mix is made for this pass.

## Rebuild and verification

Run `npm run assets:audio`. The committed decoded source WAVs make the rebuild work without FFmpeg, network access or additional libraries. The source MP3-to-WAV conversion used FFmpeg 7.1, mono PCM16 at 44.1 kHz.

The processing script selects source regions, removes DC offset, filters rumble below 38 Hz, matches engine levels and applies 60–120 ms loop crossfades. The high-speed loop also uses 90 ms circular RMS leveling. One-shot selections have short fades. Eight new runtime files total about 760 KB; the browser loads them only after audio is unlocked.

The full-speed correction addresses two concrete issues: the previous V8 rev-blip loop repeated an 8.2 dB loudness swing at steady throttle, and the mixer added a separate loop pitched up to roughly 2.5 times its recorded speed plus oscillators. The replacement steady loop reduces the 50 ms envelope swing to about 3.4 dB (about 1.1 dB over 100 ms). It plays alone at high revs, with a lower filter cutoff and limited pitch range.

Checks performed:

- JavaScript syntax check passed.
- Rebuilt all WAVs successfully. The eight new files are valid, non-silent 44.1 kHz mono PCM16, with no clipped samples. Loop boundary jumps are below 0.009 full scale; absolute mean offsets are below 0.0001.
- A mocked Web Audio scheduling check loaded all 11 runtime WAVs and exercised 1,200 driving frames, RPM and throttle changes, shifts, flock bonus, mute, pause and partial/total download failure. Another 660 full-speed frames confirmed one active engine voice, stable gain and pitch, a playback rate below 1.4 and a filter cutoff below 3 kHz. All 56,579 automation commands were finite, and repeated stop requests did not extend a stopping source's life.

These checks validate the files and scheduling. Browser decoding and listening remain separate checks.

## Seven-car and environment pass

The seven cars now use distinct, conservative voicings of the existing recordings. Falcone keeps the base pitch; Stuttgart is softer and lower; Aurora is smoother; Dusthawk is slightly sharper; Banshee has a lower exhaust tone; Viper is brighter; Titan is deepest. Pitch multipliers range from 0.83 to 1.06, with small gain and filter changes. Loaded loops, coasting and throttle/shift accents use the same car profile. Final engine playback rates stay between 0.65 and 1.4, and engine filter cutoffs stay at or below 3 kHz. This is original sound design using shared source material, not seven new vehicle recording sessions.

The high-speed safeguard remains: after the load transition settles, full throttle plays only the leveled high-speed recording. No extra loaded engine loop or synthesized harmonic plays over it. Car voicing does not modulate pitch or gain with time at a fixed RPM and throttle.

Police now use an original two-voice synthesized wail. It gets louder as the pursuit car gets closer, with a fixed maximum level. No police recording was downloaded. Engine and tire sounds gain two quiet, filtered reflections while inside a real tunnel. The delays are fixed at 71 and 131 ms, have no feedback, and fade at tunnel entrances and exits. Sirens, music and reward chimes stay outside that effect.

Rally, arena and off-road tires use a filtered gravel layer. Recorded asphalt squeal is suppressed on dirt. Both gravel and squeal stop while airborne. A scored landing adds a short original low thump. Loss and timeout results use the descending result cue rather than the victory fanfare.

Run `node tools/test-audio.mjs`. The new mocked Web Audio check reads the 11 existing WAV headers, tests all seven voices at steady full speed, checks bounds throughout RPM/load changes, exercises asphalt/dirt/airborne transitions, tunnel routing, pursuit proximity, landing/shift effects, pause/mute cleanup and partial/total download failures. It also checks App tunnel masks inside and outside a tunnel and on the second lap. **116 checks passed, with 66,363 finite parameter commands.** The App progression integration suite still passes all 59 assertions. These are scheduling and routing checks; this pass does not claim human listening or real browser decoding.

## PCM and interruption audit

The later audit decodes actual PCM samples, rather than stopping at WAV headers. The test's RIFF PCM decoder handles the four committed source WAVs and all 11 runtime WAVs, including the original 96 kHz/24-bit tire source. It validates non-silent sample data, unclipped runtime loops and normal loop-boundary sample steps. No external codec or dependency is needed for these PCM files. It does not decode the original MP3 previews or replace real browser decoding and listening.

The source loops contained repeated volume swells even at fixed game RPM. The existing circular 90 ms RMS leveling now also applies to idle, low/mid load and coasting. Idle gain compensation is limited to 2.5 times; other loops retain the existing 1.7 limit. Source regions, target RMS levels and all one-shot accents stay the same. The high-speed WAV is byte-for-byte unchanged.

| Loop | Previous 100 ms envelope swing | Current swing |
| --- | ---: | ---: |
| Idle | 16.13 dB | 5.62 dB |
| Low load | 8.83 dB | 1.38 dB |
| Mid load | 6.40 dB | 1.11 dB |
| High load | 1.07 dB | 1.07 dB |
| Coasting | 9.88 dB | 3.15 dB |

The idle pitch reference now matches its measured 75.73 Hz tonal peak. A six-second offline PCM mix at each adjacent-band midpoint across seven cars reduced the worst 100 ms envelope swing from 8.53 to 5.99 dB. The same test includes each car at full speed, checks headroom and verifies one loaded engine voice after throttle settles. The rendered comparison uses linear sample interpolation and the actual mixer gains/rates; it is not a perceptual audio-quality test. All runtime loop seams are within normal waveform step sizes, including the inherently noisy tire recording.

The siren now uses the patrol car's physical 3D distance when available, keeping volume correct when vehicles are separated by a shortcut or another road section. Its legacy longitudinal gap remains a fallback.

Final audit validation: **205 audio/PCM checks and 162,898 finite parameter commands passed**, alongside **66 App/progression integration assertions** and **19 progression/leaderboard checks**. The audio test uses actual decoded PCM for signal analysis; Web Audio scheduling uses a mock. Neither test is a claim of human listening.

Arena junk-car crushes reuse the original collision-noise source at a 0.72 playback rate, with a 260 ms maximum burst and a quieter metallic accent. Only player crush events trigger this close impact; no fatal cue or explosion sample plays. Pause/mute also covers this voice. This is original synthesis, not a newly sourced crash recording.

## Recorded landscape ambience

Added three CC0 field recordings, verified on their primary Freesound pages: [Pacific beach waves by felix.blume](https://freesound.org/people/felix.blume/sounds/500171/), [Sunny Forest Ambience 1 by deadrobotmusic](https://freesound.org/people/deadrobotmusic/sounds/609952/), and [Stadium Crowd by stomachache](https://freesound.org/people/stomachache/sounds/274516/). The complete public HQ MP3 previews are preserved, together with SHA-256 hashes, source times and exact processing in `public/assets/audio/AMBIENCE_SOURCES.json`. These are the public compressed previews, not the account-only original WAV files. Both in-game credits and `CREDITS.md` identify the authors and licence.

FFmpeg 7.1 decoded coast seconds 20–44, forest seconds 10–34, and the full 8.193-second crowd clip into retained mono 44.1 kHz/16-bit PCM excerpts. Runtime processing removes DC, applies a modest high-pass filter, limits peaks and RMS, and crossfades each loop boundary. Coast and forest loops run 22.75 seconds; the crowd loop runs 7.39 seconds. Runtime loop files total about 4.7 MB. No new runtime dependency or external request is needed. Rebuild only ambience with `node tools/prepare-audio.mjs --ambience-only`; the standard audio build also includes these files.

Each recording has one decoded buffer and one continuously looping, unpitched source after the existing user-gesture unlock. Repeated loading reuses the same promise and voices. Failed ambience downloads leave engine and tire playback unchanged. `ambienceStatus` reports `locked`, `loading`, `ready`, or `partial` independently of engine sample status.

App forwards the actual wrapped course section and day/night setting. Surf plays in coastal sections, forest ambience in daytime alpine sections, and crowd in the two stadium events. Desert and city use no borrowed ambient recording. Daytime forest birds are suppressed on night routes. A 0.65-second exponential fade handles section transitions; the transition is mostly settled within about two seconds. These exterior signals bypass engine tunnel reflections, and their volume drops inside tunnels and under high-speed acceleration. Recorded vehicle sounds remain the priority. Pause and mute use the shared master control, and returning to the menu fades the previous race ambience.

Validation: **240 audio/PCM checks passed, with 177,736 finite automation commands**. New checks decode the real ambient PCM, verify non-silence and peak headroom, compare loop-boundary discontinuities with normal waveform steps, verify original MP3 hashes, and exercise loading deduplication, independent failure handling, biome selection, night suppression, crossfade scheduling, tunnel/load attenuation, pause/mute, menu exit and App forwarding across laps. The existing seven-car steady-engine and transition checks still pass with the same maximum 5.99 dB short-window envelope swing. This evidence does not claim a human listening review or native browser decoding of the new ambient loops.

## Recorded mix depth, tire bed and camera perspective

The later sound pass keeps the licensed source files unchanged but gives their runtime mix more physical depth. Every looping engine recording now feeds three controlled paths: the existing main engine band, a low-pass exhaust-body path and a band-pass intake path. The seven cars retain bounded pitch and brightness differences while gaining separate exhaust/intake balances. Banshee and Titan emphasize low exhaust weight; Viper and Dusthawk carry more intake detail. These are filtered views of the same credited recordings, not new vehicle recordings.

Gear changes now use a smooth 180 ms load envelope instead of a flat binary cut. The recorded engine body, intake and main band unload and return together. Hood view brings intake forward, chase view uses the balanced mix and wide view reduces and darkens the whole vehicle bus. App forwards the active camera mode to the mixer; event sounds and tunnel reflections remain on the same vehicle bus.

Normal asphalt travel now has a quiet speed-sensitive rolling bed before the car slides. Meaningful slip fades in the recorded tire loop with a stable speed/slip pitch and filter response; ordinary steering no longer adds the former rapid pitch wobble. Loose surfaces still suppress asphalt squeal and use the gravel layer, airborne tires remain silent, and impact grind retains priority. The in-race synthesized sequencer was reduced so it sits behind the vehicle instead of masking acceleration and tire transitions.

Focused validation now passes **248 audio/PCM checks with 301,448 finite automation commands**. It covers the exhaust/intake signal paths, car voicing, chase/hood/wide perspective, smooth shift unloading and recovery, quiet rolling tires, recorded squeal onset, loose surfaces, airborne suppression, tunnel routing, partial asset failure and the existing six-second PCM audit. The maximum tested 100 ms envelope swing remains 5.99 dB. A real browser on the isolated port 5176 QA page decoded all samples and ambience, then ran Pacific, Midnight Muscle Chase and Neon Drift Trial samples with no browser warning or error. This verifies decoding and routing, not final listening quality; headphones and speakers remain the required subjective check. A matched-filter estimate put the shift one-shot about 7 dB below the pre-shift engine in one loaded segment, even though the engine is cut during the cue. A headphone and speaker pass must decide whether shifts are clear in the full race mix; the measurement alone does not settle audibility.
