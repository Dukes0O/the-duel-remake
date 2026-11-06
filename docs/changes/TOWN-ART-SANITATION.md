# TOWN-ART-SANITATION — round 2

Rebuilt the five sanitation models using the concrete, timber, tin, earth and
construction helpers from `town-water.py`. The reed bed has three stepped
cells with 66 cm to 72 cm walls, a 20 cm section, steel channel posts, bolts,
stones, dark water, 132 crossed alpha reed cards, a feed pipe, two spill notches
and an outfall. The latrine is a three-stall timber row with doors, a sloped tin
roof, vent and step. The bathhouse is enclosed and has patched tin, high
windows, a door, roof tank, stove pipe, boiler and duckboards. The sorter has a
tin shelter, work bench, horizontal drum, tyres, bottles, scrap and bins. The
compost has three timber bays and rough piles at different stages.

The review sheet renders the exported GLB after import into an empty Blender
scene. Its reed-bed panel places the generated photo next to the same camera
view; the other four buildings have mayor-height and road-height panels. Full
photo and prompt stay outside the repository; prompts and the cutout credit are
in the town texture `CREDITS.md`.

## Checks and review

- `node tools/test-blender-output.mjs`: passed, 267 checks and no failures. The
  family is 1,846,000 bytes and 13,083 triangles. The exported primitives have
  a single ranged `TEXCOORD_0`, and the metallic factors remain at or below 0.3.
- `node tools/test-repo-hygiene.mjs`: passed. Placement is clean; reported
  repository size targets are advisory.
- No lane tier or build was run; this art card uses its named checks.
- No browser or in-game look check was run. Claude should inspect
  `docs/board/looks/town-art-sanitation/round-2.jpg` and the questions in its
  review note before judging likeness and readability.
- No assertions were weakened. The generator entry now passes `--round 2`;
  assertion text and thresholds are unchanged. No race fingerprints apply.

## Removed

- Removed the round 1 sheet and review note, superseded by round 2.
- Removed the flat reed-bed ground plate, slab pads, sparse leaf meshes,
  flat latrine roof, disconnected bathhouse wall sheets and single smooth
  compost mound. The exported family contains no ground plates.
- Removed the former small plank/tin wall fragments and separate mesh records
  after combining each building under its shared UV layer.
