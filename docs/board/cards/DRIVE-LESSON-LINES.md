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

## Claude answers - 15 October

Added hook (design session, 15 October): `src/audio.js`, one condition in
the start-up cue loader, `cue.flag !== 'driving-lessons'`, beside the
existing helicopter and Deep skips. Without it every player would download
the seventeen driving files at start-up even with the switch off. The
lesson player (DRIVE-LESSON-1) loads its own cues when a lesson starts.
`tools/test-drive-lesson-lines.mjs` checks the start-up load requests none
of them, with the switch off and on.
