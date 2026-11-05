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

Use a stable world-space oval frame through the eight places, centered at the
map origin. Keep the dirt road as a surface band over that frame, not as a
winding course route. `course.js` must preserve the world origin and use the
Salt Flats normal-projection nearest solver for this stable oval. The frame's
600 m by 430 m radii keep every place within the map's 700 m by 500 m extent;
the surface road follows that same oval so a car can drive from each place to
the next. Terrain height provides the steep outer ridge and far wall, not an
invisible car boundary.

Both cars and fighters use the full 1.4 km by 1.0 km world-space rectangle.
Cars keep their normal frame mapping across that rectangle and can use the
hills to turn back. Fighters on this venue use the same world rectangle rather
than the arena's 278 m wall offset or the usual 150 m car radius; the hills and
shared ground height still govern movement. Other arenas retain their existing
limits.

**Ground:** one height function and one surface function, shared by physics and later the renderer, as `freestyleSurfaceHeightAt` matches its grid. About 1.4 km by 1.0 km. Flats at each of the eight places
(table in section 3), dirt road linking them, steep ridge round the edge, far wall behind it. Own `floorSpeedMph` about 115. Keep hillside driving: no invisible wall where a hill does the job.

**Checks:** `tools/test-scablands-ground.mjs`: a headless ordinary car drives the road from each place to the next and arrives; a fighter (`src/onfoot.js`) walks Tin Town's flat without a seam; a Titan climbs the Ridge further than an ordinary car;
height is continuous at chunk edges. `tools/test-world-composition.mjs` and replay guards unchanged, as `def.scablands` touches no other course.

Design: [docs/WASTELAND_WORLD.md](../../WASTELAND_WORLD.md). Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/WW-GROUND.md` with a Removed section. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key.
