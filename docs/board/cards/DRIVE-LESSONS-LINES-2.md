# DRIVE-LESSONS-LINES-2

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/DRIVING_LESSONS.md`; this card names the slice, files and acceptance.

Codex (needs the voice service key in Kyle's environment). Packet D2,
sections 12.7 and 12.8. Switch `driving-lessons`. Needs DRIVE-LESSON-HOOKS.
Takes over DRIVE-LESSON-LATE-LINE (drop that card when this one starts).

- Record the 32 lines of 12.7 with Brian, same voice and settings as
  lesson 1's lines, through `tools/audio/build-drive-lessons.mjs`; takes in
  `audio-src/voices/`, catalogue rows, runtime files in
  `public/assets/audio/voices/`. Within the month's voice credits.
- The late try: `drive.radio.corner.late.slid` when it finishes after at
  least 0.5 s of screech, `late.off` when it ends at a wall or off the road,
  `late.early` unchanged. Remove `drive.radio.corner.late.result` from the
  catalogue, the voices folder and the line table in the same change
  (replace means remove).
- The cue `lesson.shift-light`: a short soft tick, three rising pitches for
  the three lights, from a recipe.
- `src/lessons/drive-radio-lines.js` maps the new ids; one sound-bank row
  for the cue.
- `tools/test-drive-lesson-run.mjs`: the three late-try cases pick the right
  line (changed assertion: `late.result` becomes `late.slid` or `late.off`;
  Claude's written review on this card: the line was untrue, the case
  coverage is the same).

Owns: the takes, runtime files, catalogue rows,
`docs/changes/DRIVE-LESSONS-LINES-2.md`. Hooks:
`src/lessons/drive-radio-lines.js`, the late-try line choice in the lesson
run, `src/sound-bank.js`. Locks: `sound-bank`. Art: none.

Acceptance: a Node render check of every new line and the cue (peaks at
most -1 dBTP, speech about -18 LUFS); Claude listens to one packet (at most
three rounds); lane tier, build. Removed: `drive.radio.corner.late.result`.

- Asked by DRIVE-LESSON-2 (Claude, 24 October): an exit-specific racing-line line,
  for the right try that misses the exit cone's outside half (today it reuses
  `drive.radio.corner.coach.exit`). Suggested id `drive.radio.line.coach.exit`.
