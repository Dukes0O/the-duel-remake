# FIX-GRASS-GROUND

Grass cards, tufts and grit now stand on the ground that is drawn, on every course. Before, `src/landscape-detail.js` placed them at the height formula (`course.groundAt`), which sits above the drawn ground over basin rims and stream cuts and where another stretch of road overlaps (hairpins, switchbacks). Seeded sequences are unchanged (no random number is used differently); only the height moved, and the few pieces that stood on a road were moved outward or dropped (below). Panorama Ridge already used the drawn ground and is untouched. No switch: this fixes existing scenery.

## What changed

- `src/landscape-detail.js`: foliage and grit points (and city pieces moved by the city relocation) take their height from `renderedGroundHeight`. Boulders, delineator posts and outcrops are not changed.
- No piece may stand on a road (added after the laptop's Tremblant Woods picture showed tufts on the hairpin asphalt, where another stretch of road passes under the spot a piece was placed from). Each foliage and grit point is checked against the nearest road over the whole course, not only the placing stretch: it must be farther than that road's drawn half-width plus 0.5 m (plus a hair so the edge itself counts as road), and shortcut cuts count too. A piece on a road moves outward 9 m, up to five times (the rule `foliagePoint` already used for its own stretch); if it still lies on a road it is dropped (`omitted`, as pit-lane plants already are). City pieces moved by the city relocation get the same check. The check uses the course's exact segment index for the distance, and the full `nearest` only beside shortcuts.
- Cost control, all bit-exact against the old code (terrain and far-terrain geometry hashes match on all 20 courses, and 8,000 `renderedGroundHeight` and 2,000 far-sampler values per course match):
  - `src/world-surfaces.js`, `src/rendered-ground.js`: `terrainGeometry` hands the ribbon rows it has already computed to the ground reader (`seedGroundRow`) instead of the reader computing them again.
  - `src/rendered-ground.js`: authored-ribbon lookups use a bucket index of the drawn quads instead of scanning every cell; ribbon-row lookups try the column holding the point's own offset first, then fall back to the full scan.
  - `src/far-terrain-surface.js`: a grid corner's height is computed only when a lookup needs it (a corner too near the road skips the cell without it); corner keys are numbers.

## Measuring test (written first)

`tools/test-grass-ground.mjs` builds each course's scenery, then finds the largest gap between every foliage and grit base (minus its authored lift) and the drawn near or far terrain triangles under it. Limit 0.05 m. Pieces over the hidden road cut-out (4 to 15 per course on Summit, Ardennes and Tremblant) have no drawn ground and are not counted. It failed on all 19 courses with grass before the fix and passes on all after. Arenas have no grass.

A second measure in the same test reads the drawn road strip of every stretch of the course, widened 0.5 m each side, and counts grass, tuft and grit bases inside it. With only the ground-height fix, that count was: pacific-canyon 74, high-country 82, harbor-highlands 91, midnight-chase 56, ridge-rally 0, neon-drift-trial 59, timberline-rush 0, eifel-crown 85, alpine-serpent 90, azure-riviera 90, red-mesa 76, neon-docks 40, cloudbreak-skyway 95, tremblant-woods 163, tremblant-snow 153, harbour-lights 21, panorama-ridge 100, summit-run 274, summit-time-attack 274, ardennes-forest 186. After the road rule it is 0 on every course.

Pieces moved or dropped for being on a road, per course (placed = all grass, tuft and grit placed): pacific-canyon moved 102, dropped 0, placed 10040; high-country moved 135, dropped 0, placed 12770; harbor-highlands moved 107, dropped 0, placed 11148; midnight-chase moved 94, dropped 0, placed 2700; ridge-rally moved 21, dropped 0, placed 11090; neon-drift-trial moved 95, dropped 0, placed 2700; timberline-rush moved 22, dropped 0, placed 11825; eifel-crown moved 91, dropped 0, placed 15500; alpine-serpent moved 95, dropped 0, placed 15500; azure-riviera moved 96, dropped 0, placed 15500; red-mesa moved 81, dropped 0, placed 5000; neon-docks moved 96, dropped 0, placed 5772; cloudbreak-skyway moved 101, dropped 0, placed 12665; tremblant-woods moved 165, dropped 0, placed 15500; tremblant-snow moved 155, dropped 0, placed 15500; harbour-lights moved 49, dropped 4, placed 2700; panorama-ridge moved 103, dropped 0, placed 15500; summit-run moved 276, dropped 0, placed 12690; ardennes-forest moved 192, dropped 2, placed 15500; summit-time-attack moved 276, dropped 0, placed 12690.

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
| pacific-canyon | 607 | 687 | +13.2% |
| high-country | 663 | 812 | +22.5% |
| harbor-highlands | 893 | 937 | +4.9% |
| midnight-chase | 1045 | 1152 | +10.2% |
| ridge-rally | 771 | 833 | +8.0% |
| neon-drift-trial | 1048 | 1060 | +1.1% |
| timberline-rush | 896 | 952 | +6.2% |
| eifel-crown | 797 | 822 | +3.1% |
| alpine-serpent | 666 | 747 | +12.2% |
| azure-riviera | 699 | 752 | +7.6% |
| red-mesa | 541 | 585 | +8.1% |
| neon-docks | 1341 | 1361 | +1.5% |
| cloudbreak-skyway | 772 | 819 | +6.1% |
| tremblant-woods | 1136 | 1320 | +16.2% |
| tremblant-snow | 1170 | 1390 | +18.8% |
| harbour-lights | 1627 | 1536 | -5.6% |
| panorama-ridge | 1402 | 902 | -35.7% |
| summit-run | 1733 | 1935 | +11.7% |
| ardennes-forest | 1451 | 1151 | -20.7% |
| summit-time-attack | 1777 | 1853 | +4.3% |

Within the 5% limit (or faster): Harbor Highlands +4.9%, Neon Drift Trial, Eifel Crown, Neon Docks, Summit Time Attack (+4.3%), Harbour Lights (-6%), Panorama Ridge (-36%) and Ardennes (-21%); the last two are faster because far-terrain corner heights are now computed only when needed. Over the limit: Summit Run +12%, Tremblant Woods +16% and Snow +19%, High Country +22%, Pacific Canyon +13%, Alpine Serpent +12%, Midnight Chase +10%, Ridge Rally +8%, Azure Riviera +8%, Red Mesa +8%, Timberline Rush +6%, Cloudbreak +6%. That is roughly 50 to 250 ms once per race load; the road rule added about half of it (one nearest-road query per placed piece). Claude approved the cost on 24 October (see "Claude answers" on the card). Follow-up card PERF-GROUND-ROWS holds the cheaper design (typed-array rows, per-cell lookup, and a cached road-proximity cell). No frame check: nothing per-frame changed (rule 9 does not apply, the lookups run at load).

## Changed world signatures

Regenerated in `tools/fixtures/world-signatures/`. On each course only the foliage and grit meshes differ. Counts match the old build except where noted in the last column (a dropped piece lowers a count; a moved piece can put a cell's pieces in an extra or fewer cell, or take them out of an omission zone such as a pit lane). Claude reviews the picture difference on the laptop.

| Course | Old hash | New hash | Count changes |
|---|---|---|---|
| pacific-canyon | 99499b950bc1 | 8f2b1d5c4693 | none |
| high-country | 4e15192fdd90 | 1b7833b57a7c | nodes 712 to 713, meshes 682 to 683 |
| harbor-highlands | e4ebcfdf5653 | a55bc4d93633 | none |
| midnight-chase | 7c2331252be7 | b47ecbc11b94 | none |
| ridge-rally | 159df159056a | 26f0f80991e9 | nodes 438 to 439, meshes 416 to 417 |
| neon-drift-trial | d7a5d37a20c9 | b1c996821705 | none |
| timberline-rush | c11af52abfde | 55d2930a3664 | none |
| eifel-crown | 4a44e9a6e122 | 2e3fbbfadbd8 | none |
| alpine-serpent | 6e81af925278 | 6f183adb188b | none |
| azure-riviera | f07845cc2b1e | 84f43961962e | none |
| red-mesa | 4c36d88b5182 | b8255ec08a51 | none |
| neon-docks | 48f54f1e503e | 1ea786ff989a | none |
| cloudbreak-skyway | 93fc0a430a23 | 33bae2a64c72 | none |
| tremblant-woods | e41e7deaf2d9 | 31ec3fa2d2f9 | none |
| tremblant-snow | 9a1a0e644021 | d1e2259497a5 | none |
| harbour-lights | feb4256c74d4 | f12a4e1551d0 | instances 223085 to 223081 |
| summit-run | 7a5a6a1c4dd0 | 717f2986420e | none |
| ardennes-forest | 978ef5479a06 | 2e8e6311374a | instances 36465 to 36468 |
| summit-time-attack | 7a5a6a1c4dd0 | 717f2986420e | none |

Unchanged: titan-arena, titan-stunt-trial, titan-freestyle. (panorama-ridge changes too now: its grass also stood on the road where another stretch passes.)

## Changed assertions (needs Claude's written review, rule 18)

`tools/test-landscape-cells.mjs`:
- Nine expected placement hashes (pacific-canyon desert and coast, high-country desert, alpine and coast, harbor-highlands alpine and coast, ridge-rally desert and alpine) replaced with the new ones. Instance counts, the city checks and every other assertion are unchanged. The hashes cover foliage and grit vertex, transform and colour bits, whose heights and a few positions moved on purpose.
- Ardennes pit-pavement filter: the test said exactly five plant roots (the main-road apron overlap) are removed by the pit filter. The road rule now moves those five off the road before the filter looks, so the expected count is 0 (reason in the comment beside it). Nothing is loosened: a new loop asserts that no foliage root of the real scene stands on pit pavement on any of the four courses, which is the property the old count protected.

## Tests

Run once on the branch after merging current `origin/integration/wasteland` (24 October): `node tools/run-tests.mjs --tier lane --changed --jobs 8 --keep-going`: 122 passed, 6 failed. The six fail the same way on an untouched checkout of `integration/wasteland` and need Windows or the art library, so none comes from this change: `test-earned-cars-ui` (subtest 5), `test-medals` (10), `test-course-kit` (8), `test-drive-through` (3), and `test-salt-flats` and `test-salt-flats-art` (they open `C:\Users\kyleb\dev\art-library\kenney-car-kit`). The laptop's own lane run before the road fix was 124/124. `npm run build` passes after the merge. Passing in that run: the new `tools/test-grass-ground.mjs`, `test-world-composition.mjs` (47 checks), `test-landscape-cells.mjs`, `test-terrain.mjs`. Not run in the cloud: browser scenarios and look checks (the laptop reruns the `tremblant-views` pictures) and the full tier.

## Removed

The per-cell bounding boxes in the authored-ribbon reader (replaced by the bucket index). Nothing else: the height formula is still used for the road tables and the other placers.

## Claude answers

Option 1 approved (Claude, 24 October): 80 to 140 ms once per race load is worth grass that stands on the ground; gaps of up to 52 m were a real fault, and Summit is within 5%. Backlog card PERF-GROUND-ROWS added.
