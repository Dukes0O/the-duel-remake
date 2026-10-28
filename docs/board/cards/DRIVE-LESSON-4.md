# DRIVE-LESSON-4

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/DRIVING_LESSONS.md`; this card names the slice, files and acceptance.

Claude in the cloud (runs without graphics). Packet D2, section 12.4.
Switches `driving-lessons` and `tyre-slip`. Needs DRIVE-LESSON-HOOKS.

- The `snow` row: Tremblant Snow, Beaver Hairpin, start gate 150 m before
  Beaver Kink, rolling at the summer-tyre instructor's speed there.
- Two instructor runs in the player's car: on summer tyres (the target) and
  on winter tyres (shown after the challenge). The instructor brakes before
  the ice patch on the spur, never on it (brake under 20% on ice), and never
  slides.
- The dry board: where the same instructor would start braking on dry
  asphalt (one more instructor run with the surface read as asphalt, used
  only to place the board).
- Cones: the snow cone (the summer instructor's braking point), the inside
  cone and the exit cone, placed as lesson 1 places them.
- Steps: try 1 (brake at the dry board; counts however it ends), try 2
  (braking starts 15 m before to 5 m after the snow cone, brake under 20%
  while on the ice, inside cone touched, screech under 0.3 s; the first
  failed rule picks the coach line), the challenge (three in a row on summer
  tyres), the winter run (passes however it ends, shows the winter
  instructor's time), pass.
- `tools/test-drive-lesson-4.mjs`: Casual and Pro, 30, 60 and 144 FPS: both
  instructors repeat exactly; a scripted right try passes; **the proof:** the
  dry-board try screeches at least 0.5 s or leaves the road; the winter
  instructor is faster than the summer one. If the proof fails, stop and
  report.

Owns: `tools/test-drive-lesson-4.mjs`, `docs/changes/DRIVE-LESSON-4.md`.
Hooks: `src/lessons/drive-lessons.js`. Locks: none.
Sound: `drive.radio.snow.*` (DRIVE-LESSONS-LINES-2); the race's own ice and
snow surface cues. Art: the red board and cones from lesson 1.

Acceptance: the test, lesson 1's tests unchanged, lane tier, build, one
review. Removed: nothing.

## Claude answers

Cloud session questions (24 October 2026, Claude design lead): the 40 mph
approach, the dry board from a dry-road plan, the `queued` radio field and the
`winter` stage were approved as built. The hairpin: the instructor must never
look like it clips a cone. It takes a slightly wider line so every cone is
cleared by at least 0.5 m (slowing as needed; a slow, clean instructor on summer
tyres in snow is the lesson), and that 0.5 m clearance is checked for every
instructor run in lessons 1, 2 and 4.
