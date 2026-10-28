# WILD-RADIO: the wildlife and skin radio lines and sound cues

Card: WILD-RADIO (Claude, AUD lane, no lock). Design: `docs/HELI_WILDLIFE.md`
sections 8 and 9. Needs: RESCUE-RADIO (merged).

## What changed

- **9 lines**, word for word from section 8: Sarah for the wildlife survey
  (6), Brian for the new paint and the wash (3). Recorded once each through
  `tools/audio/elevenlabs.mjs` with the helicopter's settings (stability
  0.4, similarity 0.8, style 0.35), kept in `audio-src/voices/`,
  catalogued, and copied to `public/assets/audio/voices/` (83 lines in all with RESCUE-HURT's four).
  **412 credits used** (the account read 4,926 used before and 5,338 after;
  4,662 left this month). One request hit the service's rate limit and was
  retried after a pause. No gain needed: all nine play within the earlier
  lines' loudness range.
- **Cues** in `src/heli/heli-audio.js` (section 9), all CC0 1.0 Freesound
  recordings cut by recipes in `tools/audio/build-heli.mjs`:

  | Cue | Bus | Recording |
  | --- | --- | --- |
  | `heli.survey.click` | interface | 579876 "Canon A1 Camera Shutter", yfjesse |
  | `heli.wash` | vehicle | 532823 "Hidrolavadora" (a pressure washer), valeulloam97, 3 s |
  | `heli.winch` | vehicle, loop | 683807 "SFX Electric Actuator 2", mpuffenbarger |
  | `heli.animal.moose` | ambience | 486554 "Moose_Elk", gleith |
  | `heli.animal.wolf` | ambience | 472402 "Lobo aullando" (wolf howling), JoseAgudelo |
  | `heli.animal.bear` | ambience | 763026 "Bear Angry Growl" (a black bear), celldroid |
  | `heli.animal.kookaburra` | ambience | 826086 "Laughing Kookaburra; Two Calling", TheKingOfGeeks360 |
  | `heli.animal.cockatoo` | ambience | 844340 "Sulfur-crested Cockatoo", TheKingOfGeeks360 |
  | `heli.animal.sheep` | ambience | 803460 "Sheep - Bleat; Close Perspective", TheKingOfGeeks360 |
  | `heli.animal.marmot` | ambience | 640992 "Ground Squirrel First Chirp", burgersmoke |
  | `heli.animal.raven` | ambience | 716962 "Raven Croak or Crow Caw", fudgealtoid |

  Each cut starts at the call's loud part, read from a loudness outline of
  the recording in quarter seconds. Two stand-ins, both CC0: no CC0 marmot
  recording exists, so the marmot is a ground squirrel's alarm chirp
  (marmots are large ground squirrels and whistle the same way); the packet's
  "bear huff" is a growl, the only real bear recording. The only CC0
  "moose call" was a person at a Moose Lodge, so the moose is the
  Moose_Elk field recording.
- The eleven recordings load only when asked (`WILDLIFE_CUE_IDS`,
  `preloadWildlife()`), never on an ordinary flight.
- `missionBeds({dig, winch})`, built like `fireBeds`: called every frame, it
  holds the snow-dig loop (H4, which had no way to start) and the winch loop
  at a level from 0 to 1, and lets them go at 0.
- **For the Director (re-slice):** nothing calls `preloadWildlife` or
  `missionBeds` yet. The call belongs in `src/app.js` beside
  `preloadFire` and `fireBeds`, and the counting and washing events need
  entries in `HELI_EVENT_CUES`. SKIN-HOOKS owns the wiring but lists only
  `heli-session.js` and `heli-board.js`; please add `src/app.js` and
  `heli-audio.js`'s event table to its files (and RESCUE-HOOKS should call
  `missionBeds` for the dig).
- **Credits pages** name the 83 lines and the eleven recordings.

## Round one listening (measured; I cannot listen)

| File | Length | LUFS | True peak |
| --- | --- | --- | --- |
| `heli/survey-click.ogg` | 0.6 s | -23.3 | -3.5 |
| `heli/wash.ogg` | 3.0 s | -24.2 | -12.1 |
| `heli/winch.ogg` | 3.7 s loop (seam passes) | -24.0 | -12.3 |
| `heli/animal-moose.ogg` | 2.0 s | -24.0 | -11.5 |
| `heli/animal-wolf.ogg` | 3.0 s | -23.3 | -8.9 |
| `heli/animal-bear.ogg` | 2.8 s | -24.1 | -8.1 |
| `heli/animal-kookaburra.ogg` | 4.5 s | -24.2 | -12.5 |
| `heli/animal-cockatoo.ogg` | 1.1 s | -24.1 | -14.4 |
| `heli/animal-sheep.ogg` | 1.0 s | -23.6 | -13.4 |
| `heli/animal-marmot.ogg` | 1.2 s | -23.9 | -5.5 |
| `heli/animal-raven.ogg` | 2.6 s | -24.4 | -6.4 |

Kyle should listen to the animals in the first wildlife flight; any that
sound wrong can be recut by changing one recipe line.

## Tests

- `node tools/test-heli-audio.mjs`: passed. 83 lines; all nine new lines'
  voices and words checked against section 8's table; their loudness
  against the earlier lines; the eleven cues, buses, the winch loop and its
  seam, files, hashes and catalog rows; an ordinary flight fetches none of
  the wildlife sounds and `preloadWildlife` fetches all eleven; the winch
  and dig loops start, hold without doubling and let go.
- `node tools/test-p4-audio.mjs` and `test-arsenal-wave1-audio.mjs` (the
  pinned older catalog rows are untouched; new rows sit after the
  helicopter rows) and `test-heli-hooks.mjs` (283): passed.
- Lane tier (PowerShell, `--tier lane --changed --jobs 4 --keep-going`)
  after the review fixes: 168 passed, 0 failed, 0 not run in 1757 s.
  `npm run build`: passed. Again after merging integration (DRIVE-LESSON-CORE
  had moved the radio voice list; both files merged without a conflict):
  169 passed, 0 failed, 0 not run in 1395 s; build passed. Final, after
  RESCUE-HURT and DRIVE-LESSON-LINES came in (catalog, line count and
  credits conflicts resolved with both kept): 170 passed, 0 failed, 0 not run
  in 1264 s; build passed.

## Changed assertions

- `tools/test-heli-audio.mjs`: the line count rises from 74 to 83 (nine lines; RESCUE-HURT had raised it from 70 to 74); the cue
  lists, buses and loops gain the eleven wildlife cues; the helicopter
  library sound cap rises from 480 KB to 720 KB (the eleven recordings add
  about 233 KB and load only with wildlife; the helicopter's sounds are
  701,304 bytes).

## Review

One independent review (rule 17): nothing serious. Fixed: the winch (and
H4's snow dig) had no way to sound, so `missionBeds` is added; the note now
names the card that wires the sounds in and asks for the re-slice. Kept as
noted: the size cap leaves about 36 KB of room (sizes are targets, SPEC 0.8
rule 8), and the marmot and bear stand-ins wait for Kyle's ears.

## Removed

Nothing.
