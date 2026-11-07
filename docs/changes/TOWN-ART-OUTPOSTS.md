# TOWN-ART-OUTPOSTS

## Changed

- Replaced the old school photo and carve recipe with one four-view fuselage reference set and a copied `carve_object` measurement table. Dot's Diner's table and geometry were not changed.
- Added measured body-bound output and a body-only check mode. The GLB body is 2.480 × 2.480 × 10.998 m (width × height × length); table values are 2.379 × 2.528 × 11.484 m. Width +4.3%, height -1.9%, length -4.2%.
- Rebuilt the slide from a yellow bed and two red rails, and replaced raised type with two curved, textured, painted-letter slabs.
- Added a round-7 photo/render sheet (200,850 bytes) and its look note. The comparison uses the same side, front, rear and overhead cameras, with three-quarter renders below.

## Checks

- Blender body-only carve: passed the 5% bounds check. Four masks were reviewed beside their photos; each forms one connected silhouette, with small edge notches on the end masks near ground shadow.
- Blender full export and GLB re-import: passed. Final GLB 2,776,232 bytes. Eight flat-lit review renders completed. The front and three-quarter views show a round tube.
- `node tools/test-blender-output.mjs`: pending.
- `node tools/test-repo-hygiene.mjs`: pending.
- `node tools/test-review-evidence.mjs`: pending.
- Browser checks: not run; this art task assigns them to Claude. Claude should inspect the round-7 sheet, especially body shape at the ends and three-quarter angles, slide-to-sill contact, and both SCHOOL slabs.
- Changed assertion: replaced the obsolete single `plane-school:slide` photo-piece name check with names for the bed, both rails and both sign slabs. The check was updated to match the requested three-box slide and two-wall signs; no budget or pass condition was loosened.
- Race fingerprints: not applicable; this art model is not wired into gameplay.

## Removed

- Removed the prior wall-clean and overhead-clean school photos, and the previous overhead photo. Replaced the side, front and rear references with the new generated set.
- Removed the old photo-textured slide geometry and raised font lettering from the school recipe.
- Removed `round-6.jpg` and `round-6-review.md`; kept `round-4.jpg` unchanged.