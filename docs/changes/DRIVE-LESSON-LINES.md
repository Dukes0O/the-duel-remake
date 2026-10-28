---
task: DRIVE-LESSON-LINES
status: done
flag: driving-lessons
player_facing: no
---

# DRIVE-LESSON-LINES: the driving instructor's radio lines and the cone sound

Claude, 15 October 2026. Card `docs/board/cards/DRIVE-LESSON-LINES.md`;
design `docs/DRIVING_LESSONS.md` section 6. Behind `driving-lessons` (dev):
nothing changes for players.

## Changed

- `src/lessons/drive-radio-lines.js` (new): the sixteen `drive.radio.*`
  lines, word for word from the design, with Brian (`DRIVE_RADIO_VOICE`, the
  same object as the helicopter's `HELI_RADIO_VOICE`), and
  `DRIVE_LESSON_CUES`: the sixteen lines on the voice bus with the
  helicopter radio lines' priority, limit and ducking, and `lesson.cone` on
  the impacts bus, all flagged `driving-lessons`.
- `audio-src/voices/drive-radio-*.mp3` (16 kept takes) and the same files in
  `public/assets/audio/voices/`, copied unchanged by
  `tools/audio/build-drive-lessons.mjs` (new), which also builds
  `public/assets/audio/lessons/cone.ogg` from its CC0 recipe.
- `tools/audio/catalog.json`: 17 records appended (16 takes with text, file,
  hash and credits; the cone with its source, credit and recipe). The old
  rows keep their order: `addCatalogEntry` sorts the whole catalog when it
  saves, so the original order was restored and only the new rows appended.
- `src/sound-bank.js`: one import and one spread, `...DRIVE_LESSON_CUES`.
- `src/audio.js` (hook added by the design session, see the card): the start-up
  cue loader skips `driving-lessons` cues, like the helicopter's, so nobody
  downloads them at start-up; the lesson loads its own when it starts.
- `tools/test-drive-lesson-lines.mjs` (new): the lines match the design, one
  record per take, hashes, unchanged runtime copies, Brian with the
  helicopter lines' settings, credits within budget, the cone CC0 and
  credited, the bank entries behind the switch and played like the
  helicopter's radio, and start-up loading that requests none of the
  seventeen files with the switch off or on (it fails without the skip).

## Voice and sound

- Brian (`nPczCjzI2devNBz1zQrb`), `eleven_multilingual_v2`, stability .4,
  similarity .8, style .35, speaker boost: the helicopter lines' settings.
- Credits: 1,097 (one per character, sixteen takes, no retakes), against a
  card budget of 1,500. The account counter lags; it moved 1,450 over the
  same period, which includes other sessions' use. 3,139 credits left this
  month.
- Loudness, measured from the files: the driving lines sit at -23.5 to
  -25.7 LUFS, the helicopter's H1 lines at -22.1 to -24.8; true peaks -2.3 to
  -7.6 dB; lengths fit their words (1.3 to 9.4 s). They play unchanged, like
  the helicopter's. The lines were checked by measurement, not by ear: Kyle
  should listen once when DRIVE-LESSON-1 plays them in a lesson.
- Cone: Freesound 525100 "PlasticImpactB4" by jomse, CC0 1.0, cut to 0.46 s,
  high-pass 120 Hz, low-pass 2,600 Hz for a soft knock, -22 LUFS, peak
  -3.2 dB, 7.6 KB.

## Changed assertions (reviewed)

Four tests pin the existing sound bank and catalog and already leave out the
helicopter's cues; each now also leaves out exactly `DRIVE_LESSON_CUES`
(the same pattern as HELI-HOOKS): `tools/test-p4-audio.mjs`,
`tools/test-arsenal-core-audio.mjs`, `tools/test-arsenal-wave1-audio.mjs`
and `tools/test-fight-voices.mjs`. Every pinned hash is unchanged.

## Checks

Lane tier 171/171 and build on afcc11cb; the catalog, sound bank, voice
and placement checks rerun on the merge with integration's newer catalog
rows. One review: CONFIRMED, no faults.

## Removed

Nothing.
