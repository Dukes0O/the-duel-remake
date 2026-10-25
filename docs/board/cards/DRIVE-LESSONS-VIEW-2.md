# DRIVE-LESSONS-VIEW-2

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/DRIVING_LESSONS.md`; this card names the slice, files and acceptance.

Codex (needs the screen). Packet D2, sections 12.2 to 12.4 and 12.6.
Switch `driving-lessons`. Needs DRIVE-LESSON-2, DRIVE-LESSON-3,
DRIVE-LESSON-4, DRIVE-LESSONS-SAVE-2 and DRIVE-LESSONS-LINES-2.

- Drawing: the middle markers and apex cones (lesson 2); the green mark at
  half revs and three shift lights from 90% on the rev counter (lesson 3);
  the red dry board, snow cone and a faint ice sign on the spur (lesson 4).
- The run: forced manual for lesson 3 with the box restored afterwards; the
  summer-then-winter tyre change for lesson 4's last run.
- Result cards with each lesson's numbers (lesson 3: shift revs and the gear
  at the exit; lesson 4: braking point against the snow cone).
- The board rows for lessons 2 to 4 with "Opens later" reasons.
- Browser scenario (private port, memory-only storage): take lesson 2's
  middle try and right try on Tremblant Woods.

Owns: the scenario, `docs/changes/DRIVE-LESSONS-VIEW-2.md`. Hooks:
`src/lessons/drive-lesson-ui.js`, `drive-lesson-ui.css`, `src/app.js`,
`src/game.js`, `src/render3d.js`. Locks: `busy-game-files`.
Sound: `lesson.cone`, `lesson.shift-light`, the lines. Art: lesson 1's cone
and board; the ice sign is a plain road sign from the existing set.

Acceptance: the scenario; drawing and screens never change race state;
replays unchanged; lane tier, build, one review. Removed: nothing.

## For lesson 3 (from DRIVE-LESSON-3)

The gearbox lesson's rules and instructor are built (`'gears'` in `src/lessons/drive-lessons.js`). The host needs two lesson flags that do not exist in the game yet,
and the view must feed the lesson two more numbers:

- **Always manual:** the lesson run uses the manual box whatever the player's setting, and Casual goes back to the automatic box afterwards. In Node the scratch Duel overrides
  `diff` with `autoShift: false`.
- **No engine damage from the limiter:** `engineBlow` is off for the lesson run (same override).
- **The lesson view passes `gear` and `revs`** (`state.gear`, `state.revs`) every step; the lesson reads a change up from `gear` rising and takes the revs it came at from the step before.
- The lesson runs on the engine curve: show "Opens later" while `engine-curve` is off. The green mark is at `GEAR_LESSON.greenMarkRevs` (50%) and the shift lights come on from `GEAR_LESSON.lightsRevs` (90%).
