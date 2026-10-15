---
task: WILD-PLACE
status: ready-for-review
kind: feature
flag: none yet (see below)
player_facing: no
---

# Where the animals stand (14 October 2026)

Packet section 3 of `docs/HELI_WILDLIFE.md`: which animals live beside each
course and where one race's herds stand. Nothing is drawn yet (WILD-VIEW) and
nothing in the game calls this file yet, so no race, replay, fingerprint or
world signature can change.

## What was built

- `src/wildlife.js` (new, pure: no graphics, no storage, no clock).
  - **Species per course** (`COURSE_SPECIES`): three or four common species
    with weights and herd sizes, plus one rare species, for Tremblant Woods
    and Snow, Panorama Ridge, Summit Run, the western mountain courses, the
    European courses, Red Mesa, Pacific Canyon, Harbour Lights and the other
    city courses. Titan arenas, and any course not listed, have none. Black
    bears sometimes have 1 to 2 cubs; the beaver stands at the lake only;
    the moose sometimes stands in the shallows.
  - **Spots**: count is the reference lap over 45 s, rounded, 1 to 8
    (`sightingSpotCount`; Tremblant Woods at 77 s gives 2). Each spot has its
    own stretch of lap time, and the stretches are 25 s apart, so two spots
    are never closer than 25 s of reference lap whatever positions they pick
    (`planWildlife`, `lapClock`). Time along the lap comes from the bundled
    reference trace.
  - **Herds**: one herd per spot, species by weight, herd size from the
    table. One race in five (a fixed roll from the seed) one spot holds the
    rare species instead. If a species cannot be placed in its stretch (the
    beaver away from the lake), the spot uses another species.
  - **Where**: every animal is 15 to 70 m from the road edge (echidna 15 to
    30 m, "near the track"). Never on a road, branch or shortcut, the run-off,
    an escape road, the pit lane or its side, the paddock, inside a wall or
    building or any solid thing, over a tunnel or gallery, in a lake (beaver
    and moose may stand at most 3 m out) or the sea. Birds are marked
    `perching`.
  - **Seed**: `wildlifeSeed(course id, play day, race number)`, its own
    generator built from `src/rng.js`. The file never reads or advances the
    race's generator.
  - **Models**: `availableSpecies(courseId, approvedModelIds)` gives the
    species whose models have passed WILD-ART-SRC's rounds. Nothing approved
    means no animals; `placeWildlife` takes the approved list and treats a
    missing list as nothing approved. `modelIdsFor(courseId)` lists the
    models a course needs.
  - **For the wildlife count (packet section 4)**: `createPlacementChecker(course)`
    answers "may an animal stand here?" for any point with a chosen
    distance band, and `wildlifeRng(..., purpose)` gives the count job its own
    generator. Nothing else is needed from this card.
- `tools/test-wildlife.mjs` (new, found by the test runner on its own, in the
  lane tier like every `tools/test-*.mjs`): 5,045 checks, about 6 seconds.
  - Same seed gives the same animals; a different race number, day or course
    gives different ones; spot counts (Tremblant Woods 77 s gives 2, and the
    bounds); spacing of at least 25 s on 12 courses over 6 races each; each
    of the 361 animals placed is 15 to 70 m from the road edge, measured
    again with a second calculation, and checked against every wall, building
    and solid thing, the lake, the sea, escape roads, the pit lane and
    tunnels; the rare rate over 5,000 seeds; Titan arenas empty; and the race's
    generator untouched (it is swapped for one that fails if used while
    animals are placed, and its next 12 numbers match an untouched copy).
  - Direct checks that the paddock, ski lodge, lake middle, road, escape roads
    and the pit side are refused, and that open ground is accepted.
  - I broke the code on purpose in eleven ways (distance limits, spacing,
    rare rate, obstacles, tunnels, lakes, pit side, paddock, ski lodge,
    escape roads) and the test caught each one.

## Tests run

`node tools/test-wildlife.mjs` passes. `node tools/test-repo-hygiene.mjs`
passes. The lane tier, the build and the browser checks were not run in this
lane because the laptop was in a release window; the lane gate and build are
still to be run before merge.

## Changed assertions

None.

## Gaps and things chosen here (for review)

- **No wildlife switch yet.** `src/feature-flags.js` has none, so none was
  added. WILD-VIEW, which first shows animals, needs to add it.
- **Summit Run has no reference lap** (it is an open road, so there is no
  closed lap to time). The pace is estimated at 45 m/s from its length, which
  gives 7 spots. `placeWildlife` reports `estimatedLap: true`.
- **No paddock outline exists in the course data.** The paddock is the kit
  pieces that make it (garages, pit wall, stands, gantry) with a 30 m margin
  along the road and 25 m beyond the outermost piece on each side. Where a
  course has a pit lane, the whole pit side of the pit straight, plus 30 m
  beyond each end, is kept clear. This is wider than a real paddock, on
  purpose.
- **Lakes**: only the course's `basins` (Tremblant Woods and Snow, Harbour
  Lights) are known as water, plus the sea on coast sections (ground at or
  below the sea level, kept equal to `src/coastal-water.js` by a test). No
  other water outline exists.
- **Run-off** is known only for scripted circuits (`runoffAt`). The older
  formula courses (Pacific Canyon, High Country and the like) have none, so
  there the 15 m minimum is the only guard beside the road.
- **Buildings and walls** come from the course's solid list, plus a
  small table of footprints for building pieces that are not solid (ski
  lodge, dock, shops, observatory). Trees count as solid only at the trunk.
- **Sea lion** is left out: it needs a beach, and no beach outline is
  exposed. The pelican stays (a bird).
- **European animals "as the table"**: the packet gives a group list, not a
  list per course, so the split is mine. Ardennes and Eifel: roe deer, red
  deer, wild boar, red fox (rare: wildcat at Ardennes, black stork at Eifel).
  Alpine Serpent: chamois, ibex, alpine marmot, red deer (rare: golden eagle).
  Azure Riviera: gull, red fox, roe deer, wild boar (rare: wildcat). The
  desert split is also mine: Red Mesa has roadrunner, jackrabbit, desert
  bighorn, collared lizard (rare condor); Pacific Canyon has roadrunner,
  jackrabbit, coyote, pelican (rare condor). City courses other than Harbour
  Lights get pigeon, black kite, cat, raccoon (rare owl); Harbour Lights gets
  pigeon, black kite, egret, cat (rare black-faced spoonbill). The cat and
  raccoon appear on night courses only. Claude to confirm or change.
- **Wolf tracks** at Tremblant Snow are a decal, not a model. The id
  `wolf-tracks` has to be in the approved list for them to appear.
- **The beaver** can only stand at the lake shore, so it appears only when a
  spot's stretch of the lap passes it (about 4% of Tremblant Woods spots in
  300 races, against about 18% by weight). Those spots hold another species
  instead, so the count of spots never drops.
- **Birds** carry `perching: true`. Choosing the tree or post is WILD-VIEW's
  job.

## Removed

Nothing. This card adds a new file and replaces no code, model, test or doc.
