# DRIVE-LESSON-LINES

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/DRIVING_LESSONS.md`; this card names the slice, files and acceptance.

Claude. Packet section 6. Needs DRIVE-LESSON-CORE.

Record the sixteen `drive.radio.*` lines with Brian, with the same voice
and settings as the helicopter's lines, within the month's voice credits.
Keep the takes in `audio-src/voices/drive-radio-*`, add one catalog record
per take (text, file, hash) and one for the CC0 cone sound (`lesson.cone`),
and copy the runtime files to `public/assets/audio/voices/` with a small
build step like the helicopter's. Write `src/lessons/drive-radio-lines.js`;
map the driving cue list with one line in `src/sound-bank.js`. Listen
through the radio chain and match loudness to the helicopter lines.

Owns: `src/lessons/drive-radio-lines.js`, `audio-src/voices/drive-radio-*`,
`public/assets/audio/voices/drive-radio-*`,
`tools/audio/build-drive-lessons.mjs`, `docs/changes/DRIVE-LESSON-LINES.md`.
Hooks: `src/sound-bank.js` (one line), `tools/audio/catalog.json`
(17 records). Locks: `sound-bank`.

Acceptance: every line id in the packet has a file and plays through the
radio chain; the audio budget, catalog and credits checks pass; lane tier,
build, one review.
Removed: nothing.
