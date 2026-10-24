# FIX-GRASS-GROUND

Grass cards, tufts and grit now stand on the ground that is drawn, on every course. Before, `src/landscape-detail.js` placed them at the height formula (`course.groundAt`), which sits above the drawn ground over basin rims and stream cuts and where another stretch of road overlaps (hairpins, switchbacks). Seeded positions, counts and colours are unchanged; only the height moved. Panorama Ridge already used the drawn ground and is untouched. No switch: this fixes existing scenery.

## What changed

- `src/landscape-detail.js`: foliage and grit points (and city pieces moved by the city relocation) take their height from `renderedGroundHeight`. Boulders, delineator posts and outcrops are not changed.
- Cost control, all bit-exact against the old code (terrain and far-terrain geometry hashes match on all 20 courses, and 8,000 `renderedGroundHeight` and 2,000 far-sampler values per course match):
  - `src/world-surfaces.js`, `src/rendered-ground.js`: `terrainGeometry` hands the ribbon rows it has already computed to the ground reader (`seedGroundRow`) instead of the reader computing them again.
  - `src/rendered-ground.js`: authored-ribbon lookups use a bucket index of the drawn quads instead of scanning every cell; ribbon-row lookups try the column holding the point's own offset first, then fall back to the full scan.
  - `src/far-terrain-surface.js`: a grid corner's height is computed only when a lookup needs it (a corner too near the road skips the cell without it); corner keys are numbers.

## Measuring test (written first)

`tools/test-grass-ground.mjs` builds each course's scenery, then finds the largest gap between every foliage and grit base (minus its authored lift) and the drawn near or far terrain triangles under it. Limit 0.05 m. Pieces over the hidden road cut-out (4 to 15 per course on Summit, Ardennes and Tremblant) have no drawn ground and are not counted. It failed on all 19 courses with grass before the fix and passes on all after. Arenas have no grass.

Largest gap in metres. Positive means a base above the drawn ground (floating), negative means below it.

| Course | Before | After |
|---|---|---|
| pacific-canyon | 1.116 | 0.000 |
| high-country | 1.124 | 0.000 |
| harbor-highlands | 1.097 | 0.000 |
| midnight-chase | -0.073 | 0.000 |
| ridge-rally | 0.357 | 0.000 |
| neon-drift-trial | -0.148 | 0.000 |
| timberline-rush | 0.598 | 0.000 |
| eifel-crown | -2.251 | 0.000 |
| alpine-serpent | -1.332 | 0.000 |
| azure-riviera | -1.975 | 0.000 |
| red-mesa | -0.696 | 0.000 |
| neon-docks | 1.112 | 0.000 |
| cloudbreak-skyway | -1.502 | 0.000 |
| tremblant-woods | -6.036 | 0.000 |
| tremblant-snow | -6.292 | 0.000 |
| harbour-lights | -6.491 | 0.000 |
| summit-run | -52.179 | -0.001 |
| ardennes-forest | -29.034 | 0.000 |
| summit-time-attack | -52.179 | -0.001 |

## World build time

`buildEnvironment`, whole scene, one fresh process per run, old code against new code alternated, best of five, milliseconds. Old against old differs by about 1%, but single runs vary 5 to 10%, so treat changes under 5% as level.

| Course | Old | New | Change |
|---|---|---|---|
| pacific-canyon | 551 | 586 | +6.4% |
| high-country | 633 | 706 | +11.5% |
| harbor-highlands | 835 | 885 | +6.0% |
| midnight-chase | 949 | 1013 | +6.7% |
| ridge-rally | 735 | 814 | +10.7% |
| neon-drift-trial | 1014 | 1034 | +2.0% |
| timberline-rush | 814 | 911 | +11.9% |
| eifel-crown | 767 | 787 | +2.6% |
| alpine-serpent | 646 | 743 | +15.0% |
| azure-riviera | 692 | 725 | +4.8% |
| red-mesa | 528 | 565 | +7.0% |
| neon-docks | 1361 | 1332 | -2.1% |
| cloudbreak-skyway | 802 | 854 | +6.5% |
| tremblant-woods | 1142 | 1351 | +18.3% |
| tremblant-snow | 1279 | 1538 | +20.3% |
| harbour-lights | 1663 | 1543 | -7.2% |
| panorama-ridge | 1417 | 901 | -36.4% |
| summit-run | 1800 | 1875 | +4.2% |
| ardennes-forest | 1475 | 1131 | -23.3% |
| summit-time-attack | 1809 | 1858 | +2.7% |

Summit Run (+4%) and Summit Time Attack (+3%) are within the 5% limit, as are Neon Drift Trial, Eifel Crown, Azure Riviera, Neon Docks, Harbour Lights; Panorama Ridge (-36%) and Ardennes (-23%) are faster because far-terrain corner heights are now computed only when needed. Over the limit: Tremblant Woods and Snow, Alpine Serpent, Timberline Rush, High Country, Ridge Rally (+11 to 20%) and Pacific Canyon, Harbor Highlands, Midnight Chase, Cloudbreak, Red Mesa (+6 to 7%). That is 80 to 140 ms once per race load. Claude approved this on 24 October (see "Claude answers" on the card). Follow-up card PERF-GROUND-ROWS holds the cheaper design (typed-array rows, per-cell lookup). No frame check: nothing per-frame changed (rule 9 does not apply, the lookups run at load).

## Changed world signatures

Regenerated in `tools/fixtures/world-signatures/`. On each course only the foliage and grit meshes differ: node, mesh, instance, geometry, material and texture counts are identical, and a mesh-by-mesh comparison against the old build shows no other mesh changed. Claude reviews the picture difference on the laptop.

| Course | Old hash | New hash | Instances |
|---|---|---|---|
| pacific-canyon | 99499b950bc1 | 792cab53cbb2 | 11981 |
| high-country | 4e15192fdd90 | 77888c6cb255 | 15698 |
| harbor-highlands | e4ebcfdf5653 | ba993b05f78c | 116421 |
| midnight-chase | 7c2331252be7 | 3ec432841364 | 171674 |
| ridge-rally | 159df159056a | fa59c6cf1df9 | 14087 |
| neon-drift-trial | d7a5d37a20c9 | 561fed8be6cf | 169354 |
| timberline-rush | c11af52abfde | b5b531b76892 | 14950 |
| eifel-crown | 4a44e9a6e122 | ec42d457d7c7 | 20292 |
| alpine-serpent | 6e81af925278 | 6c5f65285d65 | 19015 |
| azure-riviera | f07845cc2b1e | aa7a377663ed | 18370 |
| red-mesa | 4c36d88b5182 | 5f0cdb5a5570 | 6732 |
| neon-docks | 48f54f1e503e | ba93ec143920 | 229433 |
| cloudbreak-skyway | 93fc0a430a23 | 81e0019dea78 | 15771 |
| tremblant-woods | e41e7deaf2d9 | 470dc6217556 | 24982 |
| tremblant-snow | 9a1a0e644021 | 27e4cea36772 | 22909 |
| harbour-lights | feb4256c74d4 | 8fa901fb3029 | 223085 |
| summit-run | 7a5a6a1c4dd0 | 1dcaa0db3edc | 21121 |
| ardennes-forest | 978ef5479a06 | 5ae4424b2db9 | 36465 |
| summit-time-attack | 7a5a6a1c4dd0 | 1dcaa0db3edc | 21121 |

Unchanged: titan-arena, titan-stunt-trial, titan-freestyle, panorama-ridge.

## Changed assertions (needs Claude's written review, rule 18)

`tools/test-landscape-cells.mjs`: nine expected placement hashes (pacific-canyon desert and coast, high-country desert, alpine and coast, harbor-highlands alpine and coast, ridge-rally desert and alpine) replaced with the new ones. Instance counts, the city checks and every other assertion are unchanged. The hashes cover foliage and grit vertex, transform and colour bits, whose heights moved on purpose; nothing is loosened.

## Tests

Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 8 --keep-going`): 114 passed, 6 failed. All six fail identically on an untouched checkout of `integration/wasteland`, so none comes from this change: `test-earned-cars-ui` (subtest 5), `test-medals` (10), `test-course-kit` (8), `test-drive-through` (3), and `test-salt-flats` and `test-salt-flats-art`, which open the Windows art library `C:\Users\kyleb\dev\art-library\kenney-car-kit` and cannot run in the cloud. The new `tools/test-grass-ground.mjs`, `test-world-composition.mjs` (47 checks) and `test-landscape-cells.mjs` pass. `npm run build` passes. Not run here: browser scenarios and look checks (the laptop does these) and the full tier.

## Removed

The per-cell bounding boxes in the authored-ribbon reader (replaced by the bucket index). Nothing else: the height formula is still used for the road tables and the other placers.

## Claude answers

Option 1 approved (Claude, 24 October): 80 to 140 ms once per race load is worth grass that stands on the ground; gaps of up to 52 m were a real fault, and Summit is within 5%. Backlog card PERF-GROUND-ROWS added.
