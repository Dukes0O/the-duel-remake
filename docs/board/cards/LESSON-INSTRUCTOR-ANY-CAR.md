# LESSON-INSTRUCTOR-ANY-CAR

The short board entry controls current state, ownership, dependencies and locks.

Kyle, 27 October 2026, live build 26.10.27 02:01: lesson 1 at Panorama Ridge in
his Koenigsegg Jesko shows "The instructor could not complete a clean run.
Instructor missed a native cone: [{"id":1},{"id":3}], nearest 1.40 2.68 2.00 m"
and will not start. The tests only drive the Falcone.

Build `docs/DRIVING_LESSONS.md` 14.8 on today's lessons, in
`src/lessons/drive-lessons.js` (`buildInstructorRun`, `placeCones`) and the
message in `src/app.js` `startLesson`:

- Place brake points and cones from the instructor's plan, not from the
  simulated run: brake point where the plan starts braking, apex cone at the
  plan's closest point to the inside, exit cone where the plan reaches the
  outside.
- The simulated run must be clean (no wall, never off the road, no screech).
  If not, drop the pace 2% and run again, at most four times. Remove the
  "must pass within 2.5 m of every cone" check on the instructor's own run
  and the "too close to a cone" check, keeping a check that his run does not
  tip a cone.
- New test: every row of every lesson (corner, line, snow; gears with
  `engine-curve` on) in every car in `CARS`, Casual and Pro: the instructor
  completes, and two builds give the same run. Keep it to `--jobs 4`; if it is
  slow, run the full car list in the full tier and Falcone plus Jesko in the
  lane tier.
- When a lesson still cannot start, the panel says "The instructor can't drive
  this lesson in the <car> yet. Try another car." and the details go to
  `console.warn`. No program text on screen.

The student's own cone counting (2.5 m, tip at 0.8 m) does not change.
Changed assertions go in the change note for Claude's review. Lane tier and
build. This ships on its own before LESSONS-V2-RULES.
