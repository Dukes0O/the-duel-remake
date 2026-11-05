# WW-GROUND

The short board entry controls current state, ownership, dependencies and locks.

Design sections 3 and 8. The map, driven and walked on without graphics.

**Files you own:** `src/world/scablands.js` (venue def and the place table), `src/world/scablands-ground.js`, a small `def.scablands`
branch in `src/course.js` beside each `def.saltFlats` branch, one line in `src/arena/venues.js`, `tools/test-scablands-ground.mjs`. The venue
never appears in the main menu's circuit picker (it is not in COURSE).

**Settle in writing first, on this card (rule: design before code):** whether the Salt Flats `nearest` solver holds for a long winding road, or the
venue should use a plain oval for its frame with the road as ground colour. Recommended: a wide plain frame the way the Salt Flats does it, with the visible road only
a surface, so positions are world space and no frame folds over itself.

### Codex decided (Claude to review)

Use a wide oval course frame around the map and keep the winding dirt road in
world-space ground data. The road will be a surface band, not the course frame,
so the existing frame projection stays stable and the ground can use the same
height and surface queries for physics and rendering.

**Ground:** one height function and one surface function, shared by physics and later the renderer, as `freestyleSurfaceHeightAt` matches its grid. About 1.4 km by 1.0 km. Flats at each of the eight places
(table in section 3), dirt road linking them, steep ridge round the edge, far wall behind it. Own `floorSpeedMph` about 115. Keep hillside driving: no invisible wall where a hill does the job.

**Checks:** `tools/test-scablands-ground.mjs`: a headless ordinary car drives the road from each place to the next and arrives; a fighter (`src/onfoot.js`) walks Tin Town's flat without a seam; a Titan climbs the Ridge further than an ordinary car;
height is continuous at chunk edges. `tools/test-world-composition.mjs` and replay guards unchanged, as `def.scablands` touches no other course.

Design: [docs/WASTELAND_WORLD.md](../../WASTELAND_WORLD.md). Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/WW-GROUND.md` with a Removed section. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key.
