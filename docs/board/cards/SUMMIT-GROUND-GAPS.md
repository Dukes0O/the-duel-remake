# SUMMIT-GROUND-GAPS

The short board entry controls current state, ownership, dependencies and locks.

Kyle, 26 October 2026, five screenshots in
`.evidence/2026-10-26/kyle-summit/` (integration folder): on Summit Run
(live), seen from the road in Desert Foothills and Pine Switchbacks, the
hillside under the upper switchbacks is missing. Trees, rocks, roadside
grass tufts and the red-and-white edge line float in the sky over empty air,
and flat cliff slabs stand on their own. In the snow section (picture 4),
barrier pieces of a road above float in the sky with no slope under them.

Find why (a ground cell or terrain band not built or culled for the upper
road, a slope that should join two road levels, or scenery placed against
ground that is not drawn) and fix it so every road level stands on a
continuous hillside and nothing floats. Cliffs join the ground. Keep the
road, its physics and the race repeatable from seed; scenery only.

Owns: the Summit kit and terrain files the fix needs (name them in the
change note). World signatures change only with a reviewed before/after
sheet (AGENTS "Never"). Acceptance: before/after comparison sheet of the
same five views (JPG, at most 500 KB, `docs/board/looks/summit/`), the
drive-through check, `test-circuits.mjs` by hand (road geometry rule), lane
tier and build. Live fix (Summit is on). No frame timing in the lane; Claude
runs the Summit frame check before release if the scene's cost changed.

## Lane handoff, 26 October 2026

The five-view sheet is `docs/board/looks/summit/round-1.jpg`; independent
code and picture reviews pass after fixing both findings. Details and checks
are in `docs/changes/SUMMIT-GROUND-GAPS.md`.

Claude review requested: the two Summit scene pins change only for the reviewed
continuous backing and cliff faces (resource counts unchanged). No other
course changes. The strict ground-row guard also compares the opted-in
sampler to an independently built actual Float32 mesh, and refreshes Summit's
near/far/scenery component hashes; other courses keep their old references
and pins. No assertion or tolerance is loosened. All changed expectations
are listed in the change note. Please record the test/scene-pin review here before
merge and run Summit frames before release; this lane does no timing.

The required drive-through found an existing driver departure at Glacier
Hairpin (s=8565.152, 2.3–2.4 mm outside the 6 m edge) on all three CPU settings.
All laps complete; 106,650 ground checks pass. Disabling the scenery repair
in memory reproduces identical issue rows and lap times. No driver, physics
or test change is included. Please route this separate fault or decide its
effect on this scenery-only card; the lane does not call drive-through green.

Final lane coverage: 75/76 selected suites pass, zero unrun; build passes.
`test-yeti.mjs` retains a separate existing failure at line 255: its stated
GP-career-off fixture inherits the newly-on career flag and receives 2,160
credits instead of 1,400. The same failure occurs with this scenery repair
disabled. No Yeti, save, payout or flag change is in this card. Please route
that fixture correction with its owner; this lane does not call the gate green.
