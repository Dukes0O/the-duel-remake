# HELI-RADIO

The instructor's 27 radio lines, the helicopter's sound cues and the player that
follows the flight. Nothing is wired into the game yet; HELI-HOOKS adds the one
line in `src/sound-bank.js` and the App wiring. The helicopter switch stays off.

## What landed

- **27 voice takes** in stock voice Brian (`nPczCjzI2devNBz1zQrb`), settings the
  same as the crew voices (stability 0.4, similarity 0.8, style 0.35). Each line
  was made once; every take's length fits its text (13 to 20 characters per second),
  so none needed a retake. Takes are in `audio-src/voices/heli-radio-*.mp3` with
  catalog rows. Runtime copies are exact copies in `public/assets/audio/voices/`,
  the same place and treatment as the fight voices (1,502,876 bytes).
- **Seven library sounds** in `public/assets/audio/heli/` (table below), built by
  `tools/audio/build-heli.mjs` (recipes: source, start, length, filters,
  loudness, loop, codec). `node tools/audio/build-heli.mjs` rebuilds the sounds
  and copies the voices; `--cues ID,ID` and `--voices` narrow it. Raw library
  files stay in the library cache outside the repository.
- **Chime, horn, click and hiss** are made from tones and noise in
  `src/heli/heli-audio.js` (no files), as the brief allowed.
- **`src/heli/heli-audio.js`**: `HELI_CUES` (all cue data, flag `helicopter`),
  `RADIO_FILTER`, `softClipCurve`, `createRadioChain`, `rotorVoice`, `windVoice`,
  `HELI_EVENT_CUES` and `HELI_EVENT_LINES` (what each flight or cable event
  sounds like) and `createHeliAudio({audio})` (queue, skip, loops, events,
  dispose). It works without the sound bank (bus connections direct) and uses the
  mixer once the cues are in the bank. It does not import the sound bank, so the
  bank can import it. The numbers are written in plain words in the card's
  "Claude answers" section.
- **Lines file.** `src/heli/heli-radio-lines.js` keeps all ids and wording. Only
  the `file` field changed, from `heli-<name>.mp3` to `heli-radio-<name>.mp3`,
  because the voice tool names a take after its line id.
- **Credits.** `public/assets/audio/CREDITS.md` has a new "The helicopter"
  section; `credits.html` names the Brian voice (ElevenLabs terms need
  attribution). No Creative Commons Attribution sound was used, so no
  other credit is owed.

## ElevenLabs credits

| | Used | Left |
| --- | ---: | ---: |
| Before | 580 of 10,000 | 9,420 |
| After | 2,125 of 10,000 | 7,875 |

The 27 lines cost 1,545 credits. The floor of 6,000 was never close.

## Library picks

All CC0 1.0 Freesound previews. Length and loudness are of the finished runtime
file (loudness is integrated LUFS, peak is true peak in dBTP).

| Cue | Source | Why | Length | LUFS | Peak | Bytes |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| heli.rotor (loop) | 187681 "Helicopter Rotor Loop", qubodup | A clean rotor chop already made as a loop, rated 4.6; a 0.25 s crossfade closes its seam | 6.05 s | -20.5 | -3.2 | 49,690 |
| heli.engine.start | 540801 "Helicopter engine starting (part 1)", Jadis0x | A real start that spools up from silence to idle, rated 5.0 | 7.10 s | -19.8 | -2.6 | 63,307 |
| heli.engine.stop | 479514 "Jet Helicopter In and Stop", craigsmith | A steady idle recording; the build reads it slower on a falling curve while it fades, a winding-down turbine. No CC0 recording of a short shutdown was found, and real ones last over 30 s | 4.60 s | -24.2 | -6.4 | 37,324 |
| heli.wind (loop) | 454072 "loop smooth muffled rushing air tone ...", kyles | A long smooth rushing-air loop, rated 4.9; 9 s cut with a 0.18 s crossfade | 8.82 s | -25.8 | -10.6 | 58,531 |
| heli.cable.creak | 664929 "rope leathery creaking", vestibule-door | A rope strained under load; the steadiest 1.7 s of it | 1.70 s | -27.0 | -3.2 | 21,860 |
| heli.hook.release | 457455 "Karabiner_Click_03", Rudmer_Rotteveel | A crisp metal clip snap, rated 4.8 | 0.44 s | -25.7 | -3.2 | 9,011 |
| heli.setdown.thud | 342535 "Medium Thud 1", sgrowe | A dull heavy thump, low-passed at 650 Hz | 0.80 s | -26.1 | -3.0 | 7,787 |

Runtime total for the seven sounds: **247,510 bytes**. The 27 voice files add
1,502,876 bytes. Both loops pass the decoded loop-seam measurement. The quieter
sounds sit under their loudness targets because their peaks are limited first
and the meter averages over very little sound; the cue volumes in `HELI_CUES`
make up the difference. Two other candidates were fetched while choosing (205897,
410603) and dropped; their catalog rows were removed and no file of theirs is in
the repository.

## Catalog

Thirty-four rows were added to `tools/audio/catalog.json` (27 ElevenLabs, 7
Freesound), appended at the end. Existing rows and their order are unchanged:
the voice tool sorts the whole file when it adds a row, which moved old rows
and broke three historical hash checks, so the file was put back in its original
order with the new rows after it.

## Tests

`tools/test-heli-audio.mjs` (plain node assert with a small pretend
AudioContext): every line has a cue, a runtime copy equal to its kept take and a
catalog row; every library cue has a runtime file, a catalog row with a licence
and a passing loop seam; sizes; the filter numbers; the soft clip curve is odd,
bounded and rising for several drive values; the rotor deepens with load and
falls with rotor speed and is silent when stopped; wind rises and stops at
60 m/s; the chain has the 300 and 3,000 Hz filters, the clip, and clicks and hiss
on key on and off; lines come one at a time, in order, can be skipped, are not
repeated at once and free themselves if the end is never reported; mute, pause,
switch off and a suspended context keep the radio quiet; engine start and stop,
events, the crash hold, a changed audio context and dispose; every cue carries
flag `helicopter`.

## Changed assertions

None weakened. Four existing suites read the whole audio catalog. Three pin it by
hash after leaving out the rows of cues added later; each now also leaves out rows
whose cue begins `heli.`, exactly as Deep rows were left out before. The fourth,
`tools/test-fight-voices.mjs`, treated every ElevenLabs row as a fight voice and now
skips the helicopter lines. No expected hash changed. Files: `tools/test-arsenal-core-audio.mjs`,
`tools/test-arsenal-wave1-audio.mjs`, `tools/test-p4-audio.mjs`, `tools/test-fight-voices.mjs`. HELI-HOOKS will
need the same kind of exclusion for the sound-bank hash in these suites when it
maps the cues.

## Gates

- Lane tier, `node tools/run-tests.mjs --tier lane --changed --jobs 4`: 57 suites passed, 0 failed, 0 not run, 350 seconds.
- `npm run build`: passed (built in under one second).
- `node tools/test-heli-audio.mjs`: passed. The full tier was not run in this lane.
- The fight voices suite counted every ElevenLabs catalog row as a fight voice; it now skips rows whose cue begins `heli.` (`tools/test-fight-voices.mjs`, one line, all its hashes unchanged). This is the fourth changed suite, besides the three listed above.

## Removed

Nothing.

## For Claude's listening

1. Do the 27 takes sound like a calm instructor, with no cut-off ends or odd
   words? The longest are welcome (6.5 s), controls and lift-off start.
2. The radio: is the 300 to 3,000 Hz voice with soft clip, hiss and click right,
   clear enough to understand and not too harsh? (Hiss 0.03, drive 2.5, click 14 ms.)
3. Rotor loop: does it sound like a helicopter rotor at hover, and does the
   pitch change with load and with a slowing rotor sound natural? Check for a
   beat at the loop point.
4. Engine stop: the slowed-down idle is the weakest pick. Does it read as a
   turbine winding down?
5. Wind loop: any traffic or distant city in it? (The recording's title says
   "skyline traffic".) Does it grow convincingly with speed?
6. Cable creak, hook release and set-down thud: right size and weight?
7. Low-fuel chime and low-rotor horn: clear, urgent without being unpleasant?
8. Levels together against the engine and music buses once HELI-HOOKS wires them.
