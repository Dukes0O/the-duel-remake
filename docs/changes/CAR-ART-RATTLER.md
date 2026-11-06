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
