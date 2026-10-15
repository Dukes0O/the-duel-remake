# RESCUE-RADIO: the rescue radio lines and sound cues

Card: RESCUE-RADIO (Claude, AUD lane, no lock). Design: `docs/HELI_RESCUE.md`
sections 8 and 9.

Needs: FIRE-RADIO and FIRE-MISSIONS (merged).

## What changed

- **24 lines**, word for word from section 8, each in its voice: Roger for
  mountain rescue, fire calls and the lodge (16), Sarah for the park
  rangers (4), Brian for the rescue line (2), plus the two season lines
  (Roger). Recorded once each through `tools/audio/elevenlabs.mjs` with
  Brian's H1 settings, kept in `audio-src/voices/`, catalogued, and copied
  to `public/assets/audio/voices/` (70 lines in all). No line waits: the
  season lines are in. About 1,560 credits used (catalog estimates); two
  requests hit the service's rate limit and were retried after a pause.
- **Cues** in `src/heli/heli-audio.js` (section 9):

  | Cue | Bus | Made from |
  | --- | --- | --- |
  | `heli.beacon.beep` | interface | a 1,000 Hz tone, 70 ms; the game sets its pitch (900 to 1,400 Hz) |
  | `heli.flare` | ambience | Freesound 348767 "road flare ignite burns", frankelmedico, CC0 |
  | `heli.snow.dig` | vehicle, loop | Freesound 201888 "Snow removing", Gutek, CC0 |
  | `heli.rescue.clip` | vehicle | Freesound 457454 "Karabiner_Click_04", Rudmer_Rotteveel, CC0 |
  | `heli.clock.tick` | interface | a soft 2,200 Hz triangle tick, 25 ms |

  The beep sits above the rotor (it is the instrument you fly by), the tick
  under it. The tone player takes a `rate` (`play(id, {rate})`) that raises
  every tone's pitch, for the beep. The three recordings load with the fire
  sounds (`preloadFire`), never on an H1 flight. They keep the
  `helicopter` switch like every helicopter cue.
- **Credits pages** name the 70 lines and the three new recordings and tones.

## Round one listening (measured; I cannot listen)

| File | Length | LUFS | True peak |
| --- | --- | --- | --- |
| `heli/flare.ogg` | 2.5 s | -24.4 | -9.0 |
| `heli/snow-dig.ogg` | 3.7 s loop | -24.3 | -3.2 |
| `heli/rescue-clip.ogg` | 0.3 s | too short to measure | |

The voices are checked against the H1 lines' loudness range by the test
FIRE-RADIO added (1.5 LU either side after gain).

## Tests

- `node tools/test-heli-audio.mjs`: passed (70 lines; the 24 rescue lines'
  voices and texts; the new cues, buses, loops and levels).
- `node tools/test-p4-audio.mjs` (the pinned older catalog rows are
  untouched: new rows sit after the helicopter rows) and
  `test-heli-hooks.mjs` (236): passed.
- Lane tier and build: below.

## Changed assertions

- `tools/test-heli-audio.mjs`: the line count rises from 46 to 70; the cue
  lists, buses and loops gain the five rescue cues; the helicopter library
  sound cap rises from 400 KB to 480 KB (the three rescue recordings add
  about 64 KB; the helicopter's sounds are 468,070 bytes).

## Removed

Nothing.
