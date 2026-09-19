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
