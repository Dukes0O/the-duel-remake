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
