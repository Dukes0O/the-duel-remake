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
  up to 55 m. They are marked `farForest: true`.
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

- Trees: 9,131 before (191 of them drawn as beeches), 11,336 after: 2,205
  far trees, +24.1%. Every earlier tree is identical in name, position,
  height, scale and tint; the 191 beeches are identical.
- World signature (Ardennes only): instances 35,277 to 39,687 (+4,410, a
  trunk and a crown per far tree), meshes 1,243 to 1,313 and nodes 1,302 to
  1,372 (35 new vegetation cells, two meshes each); geometries 250,
  materials 157 and textures 84 unchanged. Hash 5a96dada to 759f7ad3. Every
  other course's signature is exact.

## Pictures

`docs/board/looks/ardennes/far-forest.jpg`: before and after at High, La
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
  planted after every earlier tree; far trees keep every keep-clear rule and
  stand on the drawn ground; a course without a far band has none.
- No existing assertion changed.
- Lane tier, build and review: see the merge's run-log line.
- Frame check (rule 8): waits for a quiet laptop; see the run-log line.

## Found, not changed

- 129 of the first band's 8,837 trees are more than 2 m off the drawn
  ground (93 sunk, 36 floating), mostly 40 to 60 m out where the drawn far
  terrain begins. The first band had to stay identical, so this is left
  for its own card.

## Removed

Nothing.
