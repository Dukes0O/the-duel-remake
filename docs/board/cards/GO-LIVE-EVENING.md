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
