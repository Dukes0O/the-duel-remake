# FIRE-RADIO: Sarah's and Roger's radio lines and the fire sound cues

Card: FIRE-RADIO (Claude, AUD lane, no lock). Design: `docs/HELI_FIRE.md`
sections 10 and 11.

Needs: HELI-FINISH code merged at 64198f94 (the main design session ruled
the pending H1 release, which waits on Kyle, is not a build dependency).

## What changed

- **Voices.** `src/heli/heli-radio-lines.js` gains `HELI_VOICES` (Brian
  `nPczCjzI2devNBz1zQrb`, Sarah `EXAVITQu4vr4xnSDxMaL`, Roger
  `CwhRBWXzGAHq8TQ4Fs17`) and a `voice` on every line; the 27 H1 lines stay
  Brian's and `HELI_RADIO_VOICE` still names him.
- **19 new lines**, word for word from section 10: ten for Roger (fire
  dispatch), four for Sarah (the rangers), five for Brian (the bucket).
  All recorded once through `tools/audio/elevenlabs.mjs` with Brian's H1
  settings (`eleven_multilingual_v2`, stability 0.4, similarity 0.8,
  style 0.35, speaker boost), kept in `audio-src/voices/`, catalogued, and
  copied to `public/assets/audio/voices/` by `tools/audio/build-heli.mjs
  --voices`. No line was left out: the three regrowth lines are in.
- **Credits pages:** `public/assets/audio/CREDITS.md` and `credits.html`
  name Sarah and Roger, the 46 lines, the five new CC0 recordings and the
  new tones (SPEC asks every catalogued sound to be credited in the game).
- **Credits:** about 1,250 of the month's ElevenLabs credits used; the
  account read 7,875 left before and about 6,600 after (its counter lags,
  so the per-line figures in the catalog are estimates). Two requests hit
  the service's rate limit (HTTP 429) and were retried after a pause; no
  take was made twice.
- **Even levels.** Sarah's takes came out about 7 dB louder than the H1
  lines, so her four lines play with `gain: .5`; Roger's "fire is out" was
  about 2 dB quiet and plays with `gain: 1.25`. A new test keeps every H2
  line within the H1 lines' loudness range, after gain, allowing 1.5 LU either side.
- **Cues** in `src/heli/heli-audio.js` (section 11):

  | Cue | Bus | Made from |
  | --- | --- | --- |
  | `heli.fire.crackle` | ambience, loop, volume 0.5 | Freesound 868895 "Fireplace_Outside_Fire_3", SMKoski02, CC0 |
  | `heli.bucket.scoop` | vehicle, loop | Freesound 523022 "Rushing River Loop", ThanksForTheInspiration, CC0 |
  | `heli.bucket.pour` | vehicle, loop | Freesound 690224 "Ambiance_Waterfall_Big_Skogafoss_Loop_Stereo", Nox_Sound, CC0 |
  | `heli.bucket.dent` | vehicle | Freesound 513797 "metallic tube is hitting metallic bucket", lartti, CC0 (the second, harder hit, darkened) |
  | `heli.fire.hiss` | ambience | Freesound 479296 "R19-39-Steam Hiss", craigsmith, CC0 |
  | `heli.fire.alert` | interface | two soft alternating triangle tones, no louder than the low-fuel chime |
  | `heli.aim.lock` | interface | a short two-tone tick |
  | `heli.badge` | interface | a short rising four-note chime |

  The steam hiss is a recording, not noise: the tone player only plays
  tones. The cues keep the `helicopter` switch like every H1 cue (the fire
  code that plays them runs only with the fire switch on; FIRE-SAVE names it
  `forest-fire`, since switch names are lower case with hyphens; the packet
  writes `forestFire`). The five fire recordings are left out of a flight's
  preload: `preloadFire()` loads them when a fire needs them (FIRE-HOOKS),
  so an H1 flight downloads nothing new. They reach
  `src/sound-bank.js` through HELI-HOOKS' existing line; that file and
  mastering are untouched. No event is wired yet: FIRE-HOOKS does that.

- **Catalog order.** `addCatalogEntry` sorts the whole catalog by source
  and key on every write, but the catalog on integration was not in that
  order, so recording reshuffled 122 untouched rows and broke the pinned
  hashes in `test-p4-audio.mjs` and `test-arsenal-wave1-audio.mjs`. The
  old rows are back in integration's order with the 24 new rows after the
  existing helicopter rows; the diff is additions only. (A later card that
  uses the tool will hit the same sort; worth fixing in the tool.)

## Round one listening (measured; I cannot listen)

The sounds were chosen from their descriptions and loudness over time.
Kyle's ear is round one: if one sounds wrong, say which and I pick again
(three rounds at most).

| File | Length | LUFS | True peak |
| --- | --- | --- | --- |
| `heli/fire-crackle.ogg` | 6.1 s loop | -27.4 | -3.5 |
| `heli/bucket-scoop.ogg` | 4.7 s loop | -22.3 | -8.9 |
| `heli/bucket-pour.ogg` | 3.7 s loop | -20.3 | -8.3 |
| `heli/bucket-dent.ogg` | 0.7 s | -26.7 | -3.8 |
| `heli/fire-hiss.ogg` | 1.2 s | -24.3 | -13.6 |

All loop seams pass. Voices: H1 lines -25.7 to -22.1 LUFS; Roger -27.6 to
-24.1 (fire is out lifted to about -25.6); Sarah -18.8 to -16.7 before gain,
about -24.8 to -22.7 after; Brian's new lines -25.1 to -23.4; all peaks at
-1.6 dBTP or below. The crackle is a peaky sound, so it sits at -27 LUFS
(target -26) where the limiter lets it; it plays under the rotor anyway.

The helicopter's library sounds stay under the 400 KB the H1 test allows
(403,719 bytes of 409,600): the loops are short cuts at Vorbis quality 3.

## Tests

- `node tools/test-heli-audio.mjs`: passed (the 19 lines, voices and texts
  as written; each take in its own voice and the H1 settings; levels within
  the H1 range after gain; the new cues, buses, loops, files, licences and
  loudness; the size cap).
- `node tools/test-heli-hooks.mjs` (178), `test-heli-lessons.mjs` (63),
  `test-heli-jobs.mjs` (554): passed.
- First lane tier: 159 passed, 2 failed (the two pinned catalog hashes,
  fixed above); build passed. Rerun: below.

## Changed assertions

- `tools/test-heli-audio.mjs`: the line count rises from 27 to 46 (the 19
  H2 lines); the catalog voice check reads each line's own voice instead of
  Brian's for all, and now also checks the settings; the library and tone
  cue lists, buses and loops gain the eight H2 cues. No limit was loosened.
- `public/assets/audio/CREDITS.md` and `credits.html` are outside the
  card's file list; they change because every catalogued sound must be
  credited in the game.

## Review (rule 17)

One independent reviewer checked every line against the packet, every
catalog row, file and hash, H1 playback and the gain and peaks: all
correct. Fixed from its findings: the credits pages now name Sarah, Roger
and the five new recordings; one catalog row counted 375 credits for a
48-character line (the account counter caught up mid-request), now 48 and
marked an estimate; the fire recordings are no longer preloaded by every
H1 flight; the alert was copied from a click cue that never plays and
would have been far louder than the low-fuel chime, so it is now soft
triangle tones tested against that chime; a test now pins each line's cue
volume to its gain.

## Removed

Nothing. No earlier sound, line or test is replaced.
