# ARDENNES-FAR-FOREST

Claude, 15 October 2026. Finishing pass on Ardennes, finding F5: beyond the
forest band (firs 23 to 60 m past the road edge) the hills were bare grass.

## What changed

- `src/track-script-course.js`: the forest band's planting is now one
  helper, `plantBand`, used for the first band exactly as before (same
  generator, same draws, same names `forest-N`) and for an optional second
  band, `scenery.farForest`, planted after it. The far band has its own
  generator (its own seed constant mixed with the course stage), its own
  names (`far-forest-N`), the same fields as `scenery.forest` plus its own
  `clear` stretches, and the same keep-clear rules (road, run-off, corner
  insides, basins, the course's clear stretches, kit `clear`). It only
  avoids spots the first band already took. Far trees stand on the drawn
  ground (`renderedGroundHeight`), because beyond the first band the course's
  own ground differs from the drawn far terrain by about 2 m on average and
  by over 100 m in places. They are marked `farForest: true`. Because the band reaches
  220 m, it can cross toward other stretches of the circuit, so each far
  tree is also measured from the nearest road: at least 60 m beyond its
  edge and outside the clear stretches as seen from that road (the review
  found 23 trees by the paddock, the grandstand or another road's catch
  fence before this rule).
- `src/vegetation.js`: `beechTreePlacements` skips far-band trees, so the
  beech set is the accepted one.
- `src/circuits/ardennes-forest.js`: a far band from 60 to 220 m, one row
  every 9 m in 5 rows, larger firs (scale 1.4 to 2.6) in groves with
  clearings between (`clumps` cut .5), thinning toward the back. The card
  named about 60 to 100 m; pictures showed that band hides behind the first
  band's firs while the bald hills stand further out, so the same tree
  budget is spread to 220 m instead.
- `tools/fixtures/world-signatures/ardennes-forest.json`: recaptured after
  the reviewed pictures below.

## Numbers

- Trees: 9,131 before (191 of them drawn as beeches), 11,313 after: 2,182
  far trees, +23.9%. Every earlier tree is identical in name, position,
  height, scale and tint; the 191 beeches are identical.
- World signature (Ardennes only): instances 35,277 to 39,641 (+4,364, a
  trunk and a crown per far tree), meshes 1,243 to 1,313 and nodes 1,302 to
  1,372 (35 new vegetation cells, two meshes each); geometries 250,
  materials 157 and textures 84 unchanged. Hash 5a96dada to 1882d745. Every
  other course's signature is exact.
- Recaptured again on top of ARDENNES-STAVELOT-STONE (8c310939), which merged
  first: its signature 978ef547 (instances 36,465, meshes 1,244, nodes 1,303,
  geometries 249, materials 156) becomes 1fe6dc9c (instances 40,829, meshes
  1,314, nodes 1,373): the same +4,364 instances and +70 meshes and nodes,
  geometries, materials and textures unchanged. The far band is still 2,182
  trees and the first band and beeches match integration exactly.

## Pictures

`docs/board/looks/ardennes-far-forest/round-1.jpg` (117,553 bytes) and its review note beside it: before and after at High, La
Fontaine, Les Combes, Riverside and Stavelot (native views from
`tools/scenarios/ardennes-views.mjs`). Verdict (Claude): better. Firs now
stand in groves on the Les Combes hill and on the slope behind Stavelot's
village; La Fontaine and Riverside gain a broken tree line behind the first
band. Not a complete fix: the highest slopes, several hundred metres out,
are still open meadow, which more trees cannot reach inside the +25%
budget. Follow-up suggested: a forest colour on the far terrain beyond the
band (no tree cost), as its own card.

## Tests

- `tools/test-circuit-ardennes.mjs`, three new tests: the first band and the
  beeches are identical with and without the far band, and the far band is
  planted after every earlier tree; far trees keep every keep-clear rule,
  measured from both their own road and the nearest road, and stand on the
  drawn ground; a course without a far band has none.
- No existing assertion changed.
- One independent review: one real fault (looks only), fixed as above;
  low-risk notes: two far trees stood 1.5 m behind a solid catch fence
  (now gone with the 60 m rule), and collision checks scan about 24% more
  trees. Lane tier and build: see the merge's run-log line.
- Frame check (rule 8): waits for a quiet laptop; see the run-log line.

## Found, not changed

- 129 of the first band's 8,837 trees are more than 2 m off the drawn
  ground (93 sunk, 36 floating), mostly 40 to 60 m out where the drawn far
  terrain begins. The first band had to stay identical, so this is left
  for its own card.

## Removed

Nothing.

## Taken out of Ardennes, 16 October (Claude)

The Summit release's frame check failed Ardennes at Pit Straight on High:
p95 33.3 ms against the 18.5 ms limit (Performance 16.8 ms passed). One
diagnostic run with only `farForest` removed passed both qualities (16.8 ms).
The far band (+2,182 trees) is therefore taken out of `ARDENNES_FOREST`
before the release.

- `src/circuits/ardennes-forest.js`: the `farForest` entry removed. The band
  code in `src/track-script-course.js` and `src/vegetation.js` stays, unused by
  any course.
- `tools/test-circuit-ardennes.mjs`: the band's tests now build Ardennes with
  the accepted band added back in the test (`ARDENNES_WITH_FAR`), so the band
  code keeps its full coverage; a new check confirms the shipped Ardennes has
  no far band and its 9,131 trees. Changed assertions, Claude's review: the
  same checks run on the same band; only where the band comes from changes.
  Nothing is loosened.
- World signature: the Ardennes row is restored to its Stavelot-stone state
  (29779488), and `test-world-composition` passes it exactly, which proves the
  scene is back to that state. `test-circuits` passes.
- A lighter far forest is card ARDENNES-FAR-FOREST-LIGHT.

### Removed
- The far band on Ardennes (its data only).
