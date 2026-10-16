# ARDENNES-PIT-GRASS

Found in Claude's finishing pass on Ardennes (P4-FINISH-ARDENNES round 1, 15 October 2026).

## The fault

Grass tufts stand on the paved pit-lane apron on the inside of La Fontaine (s about 330 to 360), so the grass grows through the asphalt. Picture: `.evidence/2026-10-15/P4-FINISH-ARDENNES/views/ardennes-la-fontaine-high-first-lap.png` in the integration folder (bottom left).

Cause: the tufts in `src/landscape-detail.js` are scattered 8.5 to 38 m either side of the road centre without checking for the pit-lane surface.

## Settled rule

- Grass tufts and small plants never stand on a paved pit-lane surface. Skip any tuft whose point lies on the pit lane (use the course's existing pit-lane query; do not add a second description of where the pit lane is).
- Skipping must not change the random sequence for any other placement, so courses without a pit lane, and every placement away from the pit lane, stay exactly where they are today. If that cannot be done, stop and ask.
- No change to the road, the pit lane, collisions or race state.

## Acceptance

- A test shows no tuft inside the pit lane on Ardennes and Panorama Ridge, and unchanged placements on a course without a pit lane.
- World signatures: courses whose picture changes need a reviewed visual difference before their signature is recaptured (AGENTS).
- Lane tier, build, one review.


## Root implementation slice

Implemented as a named subtask of the existing ARDENNES-SWITCH-ON lane, keeping this settled rule and acceptance intact. No extra lane or duplicate implementation. The source card remains the decision record; the parent owns code, review, gates and the final release handoff.


## Proved pit overlap and exact predicate hook

Actual seed1989 production landscape/control has14000plants on Ardennes and14000on Panorama. pitAt reports0inside because it deliberately excludes the main-road overlap for limiter/boost behavior. Ray tests against the real production pit-lane-road mesh prove5Ardennes roots inside the pavement near s327.7..342.1, lateral -6.99..1.97; all5 pitAt results false. This is the pictured overlap, not a guessed random-sequence cause.

Before edit, Root grants src/pit-lane.js + existing tools/test-pit-lane.mjs ONLY to factor the current phase/extent/width predicate into one exported pitRoadAt footprint query. Existing pitAt calls that shared predicate then retains its exact main-road exclusion; no second authored pit description, geometry, width, limiter, boost, service or race behavior. Landscape filters actual final world-position nearest coordinates through pitRoadAt AFTER all original placement/color RNG consumption. Exact surviving source indices/matrices/colors and no-pit hashes must stay unchanged. Compare original pitAt outputs and the actual rendered pit mesh at overlap/end/taper boundaries in existing tests. This resolves the query semantics within Claude settled no-pavement rule; no new feature or runtime dependency.


Actual correction f80041aa has RED original root4652 then GREEN full actual seeded placement comparison.5Ardennes roots removed,0Panorama/Snow/Summit controls, every other original transform/color/index exact; existing no-pit hashes retained. Source review and native finishing picture still pending; no world fixture recapture or completion claim.

## Also: the pit-lane surface reads blue-grey (Claude, round 2)

Where the pit lane joins Pit Straight (s 10 to 40) its surface is drawn as a blue-grey slab over the dark road; it is the first thing seen from the grid (`.evidence/2026-10-15/P4-FINISH-ARDENNES/review-high-r2/frames/01-grid.jpg`). The apron inside La Fontaine is the same tone. Removing Ardennes' `wetRoad` did not change it. In the same lane, find where the pit-lane surface takes its material and, if it can follow the course's road tone (`dampRoad` colour on Ardennes) without changing any other course, do that; otherwise write what is needed here. Drawing only; no change to the pit lane's shape or the race.

## Pit-tone drawing hook before implementation

Claude1f0f7093 adds the current blue-grey pit apron finding to this same finishing slice. Actual cause is addPit in src/track-script-scene.js constructing an independent flat0x41454a material, whereas the main Ardennes road uses its real textured damp material. Root grants only src/world.js existing addTrackScriptScene options call, src/track-script-scene.js existing options/addPit material parameter, existing tools/test-pit-lane.mjs, and own change note. Preserve the existing snow option. For courses opting into the existing dampRoad look (currently only Ardennes), pass/reuse the actual already-created main road material. Do not approximate its rendered tone with a second untextured colour or new texture. All other courses retain the exact legacy material object properties/map/shader path; no global visual change, new course data/physics fingerprint or material recipe.

New RED/GREEN test must prove actual material identity sharing and exact pit geometry/paint/receiveShadow and race-feature retention, plus default legacy material controls. Existing road/damp uniforms and disposal already support sharing. One correction review, actual native pit picture and only approved Ardennes scene recapture precede final gate/build/install.545158d0 High16 remains the prior source pass; no source or world baseline changes while its old job is running (it has drained). Root adds the available world-signatures lease for this exact shared drawing call and the eventual one-course fixture, with Summit blocked/release locks free. Investigation starts01:10UTC and stops by01:40UTC if unresolved.
