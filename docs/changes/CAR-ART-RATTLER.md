# CAR-ART-RATTLER - round 6

- **Status:** final art-round handoff; Claude visual review required.
- **Changed:** replaced the bed sides and tailgate with separate thick boards and made the floor from individual boards. Kept the round-five cab and existing wheel geometry after the donor-body cutout proved visibly fragmented. Updated the recipe to write round-six evidence paths. The model remains within its triangle and byte limits.
- **Source review:** inspected `public/assets/models/classics/falcone_f42.glb` as the requested original donor. The attempted face cutout did not survive in the submitted model. `tools/blender/bowl-trucks.py` and `public/assets/models/wasteland/bowl/trucks.glb` were inspected for wheel reuse; the submitted tires still use the Rattler recipe's procedural tread. Both gaps are called out for Claude.
- **Visual review:** see `docs/board/looks/car-art-rattler/round-6-review.md` and `round-6.jpg`. Claude should check the cab proportions, doors/windows, front guards, bed wood, tire tread and all five views against the reference.
- **Checks:** Blender recipe completed successfully; output is 21,950 triangles and 2,624,988 bytes. `node tools/test-blender-output.mjs` passed (257 checks, 0 failures). `node tools/test-repo-hygiene.mjs` passed; size targets are advisory and no look sheet is oversized.
- **Browser/look checks:** not run; Claude owns the browser and visual verdict.
- **Changed assertions:** none. No simulation code changed; race fingerprints do not apply.
- **Removed:** deleted the superseded round-five sheet and review, and removed temporary donor inspection, render, build and sheet-generation files. Round four remains. No older model version is retained.

## Checks

- Blender recipe/export: passed, 21,950 triangles and 2,624,988 bytes.
- `node tools/test-blender-output.mjs`: passed, 257 checks, 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed; no oversized look sheets.

## Removed

- Round-five review sheet and note, superseded by this final round.
- Blender `.blend`, temporary renders, inspection script, build log and sheet-construction helper after final evidence was assembled.



- Lane tier and build were not run, as instructed for this art card.
# CAR-ART-RATTLER · round 7

**Status:** submitted for Claude's art judgment; visual result needs more work.

The lane was merged with `integration/wasteland` before the photo-model work.
The `tools/test-blender-output.mjs` merge conflict was resolved with both the
Rattler and Longhaul entries retained. The photos, credits and
`tools/blender/rattler-photo.py` use Claude's photo-measured `Photo.sky`,
`trace`, `slab`, `box` and `lathe` kit. The recipe exports metre units, the
`rattler` id, four separate round wheels with the contract radii and the eight
vehicle socket names. It reads the source photos from
`.evidence/car-art-rattler/` and renders the exported GLB in a clean
scene with Standard view transform.

Blender reported 1,728 triangles and 433,920 bytes for the exported GLB. The
side, front, rear and top matched renders, five requested views and a
person-scale view are in the round-7 comparison sheet. The rendered body is
visibly broken into broad, flat picture-mapped panels; some surfaces show the
wrong photo region. The four reference photos are consistent, but the model
does not yet match them and is not a visual pass. Claude should inspect the
photo crops, masks, four matched views, front and rear three-quarter views,
side, top, person scale, component names and socket transforms.

**Checks:** Blender export and clean-scene GLB renders passed: 1,728 triangles
and 433,900 bytes. The first `tools/test-blender-output.mjs` run after the
conflict fix passed 281 checks. Restoring the integration branch's historical
Rattler recipe-only check briefly duplicated its generator entry; the next run
reported three coverage/paths errors. I removed the duplicate entry without
changing assertions. Final `node tools/test-blender-output.mjs` passed 281
checks, 0 failures. `node tools/test-repo-hygiene.mjs` passed; no oversized
look sheets. No lane tier or build was run, as directed. No game behavior or
test assertions changed. Race fingerprints: not applicable to this model-only
art task.

**Photo credit:** the four generated reference photos are committed in
`.evidence/car-art-rattler/`; their prompt credit is in
`public/assets/models/wasteland/cars/textures/CREDITS.md`. The comparison
sheet includes crops beside the clean-scene GLB renders. Raw captures remain
in the ignored evidence folder.

## Removed

Moved the round-4 and round-6 sheets and review notes to the Recycle Bin as
superseded by round 7. Removed temporary renders and logs after assembling the
sheet. The source photos remain in `.evidence` for Claude's review.
