# DRIVE-LESSON-LINES

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/DRIVING_LESSONS.md`; this card names the slice, files and acceptance.

Claude. Packet section 6. Needs DRIVE-LESSON-CORE.

Record the sixteen `drive.radio.*` lines with Brian through the same tool
and settings as the helicopter's lines, within the month's voice credits;
write `src/lessons/drive-radio-lines.js`; pick the CC0 cone sound
(`lesson.cone`) into `tools/audio/catalog.json`; map the driving cue list
with one line in `src/sound-bank.js`. Listen through the radio chain and
check loudness against the helicopter lines.

Owns: `src/lessons/drive-radio-lines.js`, the mp3 files in
`public/assets/audio/voices/`, `docs/changes/DRIVE-LESSON-LINES.md`.
Hooks: `src/sound-bank.js` (one line), `tools/audio/catalog.json` (one
entry). Locks: `sound-bank`.

Acceptance: every line id in the packet has a file and plays through the
radio chain; the audio budget and credits checks pass; lane tier, build,
one review.
Removed: nothing.
