# LAB-RADIO

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/LAB.md`; this card names the slice, files and acceptance.

Codex (needs the voice service key in Kyle's environment). LAB sections 4,
6, 7 and 8. Switch `lab` (dev). Can start now.

- **Brian's Lab lines**, clean (no radio filter), same voice and settings as
  the driving lessons: for each of the 16 lessons an intro (what we will
  try), the explanation (the "What Brian explains" text of section 4, said
  in his words, no numbers he cannot see on the bench) and a pass line; the
  secret's four lines (the fan reversing, the 1970, 1978 and 2022 story in
  short sentences); the restore's two lines. About 55 lines; Claude writes
  the final wording on this card before recording (one review round), then
  record. Ids `lab.brian.<lesson>.<intro|explain|pass>`, `lab.brian.secret.*`,
  `lab.brian.restore.*`. Takes in `audio-src/voices/`, catalogue rows,
  runtime files through `tools/audio/build-lab-voice.mjs`. Within the
  month's voice credits.
- **Cues** from recipes (CC0 libraries or synthesis): `lab.fan`,
  `lab.reverse`, `lab.burner`, `lab.snap`, `lab.creak`, `lab.splash`,
  `lab.tick`, `lab.clunk`, `lab.fizz`, `heli.buoy-hit`, `heli.retardant`,
  `car.sputter`, `car.speirling` (an electric motor whine rising with speed
  over a loud fan roar that is there even standing still).
- Sound-bank rows for all of them.

Owns: `src/lab/lab-lines.js`, the takes, runtime files, catalogue rows,
`tools/audio/build-lab-voice.mjs`, `docs/changes/LAB-RADIO.md`. Hooks:
`src/sound-bank.js`. Locks: `sound-bank`.
Art: none.

Acceptance: a Node render check of every line and cue (peaks at most
-1 dBTP, speech about -18 LUFS); Claude listens to one packet (at most three
rounds); lane tier and build. Removed: nothing.

## Carried from LAB-HELI-CHALLENGES (Claude, 24 October)

- Register and make the cue `heli.buoy-hit` (a buoy hit in the Projectile motion challenge); the session already emits it as a `cue` event.
