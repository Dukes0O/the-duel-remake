# FIX-GRASS-GROUND

The short board entry controls current state, ownership, dependencies and locks.

Claude, 24 October. Kyle sees grass floating on the newer courses.

**Cause (read in the code):** `src/landscape-detail.js` places grass, tufts and
grit at `course.groundAt(s, off)`, the height formula. The ground the player
sees is drawn by `terrainGeometry` (`src/world-surfaces.js`) from
`ribbonGroundAt`, which lowers columns that reach across another stretch of road
(hairpins, switchbacks) and is flat between sparse columns, so over basin rims
and stream cuts the formula sits above the drawn ground. Only Panorama Ridge
(`ridgeLandform`) already uses `renderedGroundHeight`; every other placer
(reeds, stones, snow, snowmen, kits, landmarks) uses it everywhere.

**Settled design:**
- Place every grass card, tuft and grit piece on `renderedGroundHeight` for all
  courses, as the other placers do. Keep the seeded positions, counts and
  colours; only the height changes.
- First write a test that measures, per course, the largest gap between a grass
  base and the drawn ground under it. Today it should fail on Summit Run,
  Ardennes Forest, Harbour Lights and the Tremblant courses. After the fix every
  course must be within 0.05 m.
- World build time must not grow by more than 5% on any course (Summit's build
  time is already a concern, SUMMIT-BUILD-TIME). Record before and after.
- World signatures will change. Regenerate them in the branch and list the
  courses and numbers in the change note; Claude reviews the picture difference
  on the laptop before merge.

No switch: this is a fix to existing scenery.
