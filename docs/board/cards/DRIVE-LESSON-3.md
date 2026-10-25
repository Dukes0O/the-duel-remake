# DRIVE-LESSON-3

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/DRIVING_LESSONS.md`; this card names the slice, files and acceptance.

Claude in the cloud (runs without graphics). Packet D2, section 12.3.
Switches `driving-lessons`, `tyre-slip` and `engine-curve` (the lesson
shows "Opens later" while `engine-curve` is off). Needs ENGINE-CURVE and
DRIVE-LESSON-HOOKS.

- The `gears` rows: Panorama Ridge (Mountain Straight into The Cutting) and
  Tremblant Woods (Beaver Run into Beaver Hairpin), starting at 30 mph in
  2nd, finishing 60 m past lesson 1's exit cone.
- The run is manual whatever the player's setting (Casual returns to the
  automatic box afterwards); engine damage from the limiter is off in
  lessons.
- The instructor shifts up at 96% revs and down while braking to the gear
  that puts it at 70 to 80% revs at the apex; record its gear at the exit
  cone.
- Steps: try 1 (shift up at the green mark, 50% revs; counts however it
  ends), try 2 (upshifts at 90% or more, under 0.5 s on the limiter in total,
  the instructor's gear at the exit cone, screech under 0.3 s; the first
  failed rule picks the coach line), the challenge (three in a row), pass.
- `tools/test-drive-lesson-3.mjs`: both rows, Casual and Pro settings
  (manual either way): the instructor repeats exactly; a scripted right try
  passes; **the proof:** the early-shift try is at least 0.3 s slower than
  the instructor, and leaving the corner one gear too high is slower than the
  instructor's gear. If the proof fails, stop and report the numbers.

Owns: `tools/test-drive-lesson-3.mjs`, `docs/changes/DRIVE-LESSON-3.md`.
Hooks: `src/lessons/drive-lessons.js`. Locks: none.
Sound: `drive.radio.gears.*`, `lesson.shift-light` (DRIVE-LESSONS-LINES-2).
Art: none.

Acceptance: the test, lesson 1's tests unchanged, lane tier, build, one
review. Removed: nothing.

## Claude answers

Claude (design lead), 25 October 2026: all six picks confirmed.

1. A gear too high costs only 0.03 to 0.10 s on the 60 m finish: keep as built. The lesson teaches by feel, its lines never name a time, so `coach.down` stays true; the 60 m finish stands.
2. The gear is checked at the apex cone (no higher than the instructor) and at the exit cone (his gear or the next one up), with `apexGear` and `exitGear` recorded: yes, that fails the right thing.
3. Coach lines as picked, and `gears.early.result` only when the try finished at least 0.3 s slower: yes.
4. The middle corners (Griffin Bend, Beaver Kink) and 1st gear at the Cutting and the hairpin: keep.
5. `GEAR_LESSON.accelShare` 4 so the engine, not the plan, sets the straight: yes.
6. Host wiring is not this card; see the section added to `docs/board/cards/DRIVE-LESSONS-VIEW-2.md`.
