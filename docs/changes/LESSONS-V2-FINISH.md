# LESSONS-V2-FINISH (part 1, Claude, 27 October 2026, night)

Claude's finishing pass on the second-version lessons, plus Kyle's two
findings from play the same evening.

## What changed

1. **Room to beat the instructor (DRIVING_LESSONS 14.12).** A sweep of all 14
   cars against a clean full-pace run of the instructor's own line found 0.5
   to 2 s of room on Casual and 0.0 to 1 s on Pro (Jesko at Harbour, Pro:
   0.01 s). His time is now at least 7% (Casual) or 4% (Pro) slower than that
   run in your car. Pace starts at 92% / 95%, drops until the room holds,
   floors 78% / 85%. Measured on all 196 car, row and setting cases: pace
   0.79 to 0.95, 3 cases with no full-pace reference (the run faulted) keep
   the starting pace.
2. **Woods braking has its own road.** It was the same seven corners as the
   Woods racing-line lesson. It now runs Beaver Run, Beaver Kink, Beaver
   Hairpin, Timber Straight into Devil's Chicane, Lodge Bend and the Final
   Turn: 50 to 63 s, six corners (a Timber Straight start was under 30 s in
   the Jesko).
3. **A run never stops early (Kyle).** Walls, long trips off the road and
   stops only make a run not clean; it ends at the finish line, or when the
   car is wrecked beyond going on. The result card then judges the run.
4. **Any step again, back or forward (Kyle).** The step strip is four buttons
   during a run and on the result card; the result card adds Watch me again,
   Back to Follow me (ghost) and Same step again. A run in progress is
   dropped unscored. Focus leaves the button so the keys drive the car.
5. The winter comparison in the snow lesson starts at the summer run's pace;
   the teaching proofs (middle of the road, faster run) start at the
   instructor's own pace, so a proof starts as his lesson does.

## Tests

- `test-lesson-instructor-any-car`: 196/196, then the Woods braking rows
  again on the new road 28/28.
- `test-drive-lessons` 8/8 (two new tests: full runs, choosing steps),
  `test-drive-lesson-run` 20/20 (new: back to Follow me after a run),
  `test-drive-lesson-lines` 1/1, `test-drive-lesson-2` 28/28 (after the Woods
  move), `-3` 15/15, `-4` 4/4, `test-drive-lessons-view-2` 9/9,
  `test-drive-lesson-helipad` 1/1.

## Changed assertions (Claude's written review, rule 18)

- `test-lesson-instructor-any-car`: pace floor `.84`/`.89` becomes the
  INSTRUCTOR_PACE floor (`.78`/`.85`) and retries `<= 4` becomes
  `< MAX_INSTRUCTOR_TRIES` (6). Reason: the slower pace is the new rule
  (14.12). Not loosened elsewhere: a new assertion requires the room on every
  case that has a reference.
- `test-drive-lesson-2` (middle of the road is at least 0.3 s slower) and
  `test-drive-lesson-3` (a faster run beats him): the proof runs now start at
  the instructor's pace. The middle proof is compared at equal pace, so only
  the line differs; it is still 1.7 to 2.7 s slower. Assertions unchanged.
- `test-drive-lesson-run`: the fast proof gets the instructor's pace; no
  assertion changed.

## Removed

The old snap that ended a run at a wall, after a second off the road or at a
stop. The fixed 92% / 95% instructor pace. The duplicate Woods road for the
braking lesson.
