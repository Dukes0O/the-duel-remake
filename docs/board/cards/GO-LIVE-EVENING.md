# GO-LIVE-EVENING

The short board entry controls current state, ownership, dependencies and locks.

Kyle, 26 October 2026: "these are in the preview, and the helicopter changes
can't be tested in preview either. maybe they just need to be pushed into the
real game." Claude decides go-live (rule 18).

Switch on, in one change: `driving-lessons`, `heli-logbook`, `heli-skiing`
and `rescue` (lab-2 is already on). Anything these need on (for example
`tyre-slip` for lessons, `heli-skins` for the rank paints) is named in the
change note with why; switch it on only if the feature cannot work without
it, and say so.

Run the lane tier and, because four features switch on at once, the full tier
(`node tools/run-tests.mjs --tier full --jobs 4 --keep-going`) in this lane.
Fix tests that pin these switches as dev or off: each changed assertion is
listed with old and new, and must only follow the switch decision (the off
paths stay tested explicitly with the switch set off, as test-grand-prix-cups
and test-yeti do). Never loosen a limit. No frame timing (Claude runs it with
the screen off). Build. Commit; Claude merges and releases.

## Claude, 26 October 2026, after the first pass

Approved: the switch-state assertions for driving-lessons, heli-logbook,
heli-skiing and rescue, and the fixture changes that pin historical
fingerprints and off paths explicitly.

Not approved: switching `tyre-slip` on. It changes how sliding works in every
race (the drift-trial and engine-curve history fingerprints had to pin it
off), which is a change to how the whole game drives that Kyle has not felt.
Lessons already apply the sliding rules inside their own scratch race. So:
- keep `tyre-slip` dev;
- change lesson admission (`App._drivingLessonsEnabled` and the Duel lesson
  admission) to need only `driving-lessons`, while the lesson run itself
  keeps its own sliding rules exactly as now;
- undo the tyre-slip parts of the changed assertions and fixtures that no
  longer apply, and keep a test that a lesson with `tyre-slip` off still
  uses the sliding rules inside the lesson and that ordinary races do not.
Lane tier and build; the full tier only for suites the change touches
(rule 19), and the replay guard.
