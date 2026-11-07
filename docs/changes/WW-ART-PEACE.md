# WW-ART-PEACE

## Changed

Built the first four peace props from generated, measured photo references with `photo_model.py` and `hull_model.py`: `mirage-billboard`, `gunn-turret`, `gunn-rock`, and `kettles-chair`. Added 11 compressed source photos and their credits, one Blender-output budget entry, and the round 1 comparison sheet. The recipe rebuilds `public/assets/models/wasteland/town/peace-props.glb`.

Read back from the GLB: 29,664 triangles and 1,905,116 bytes. The sheet is 210,539 bytes.

## Checks

- Blender 4.5 export and imported-GLB review renders: passed. The exported model was reimported into an empty scene; renders use Standard.
- `node tools/test-blender-output.mjs`: passed, 304 checks and 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed. Size targets are advisory.
- Browser review: Claude should inspect the billboard edge-on, turret bolt count and shine, the rock's far face, and especially the chair's three-quarter view.
- Changed assertions: none.
- Race fingerprints: not applicable; this art-only card does not touch race code.

## Removed

Removed the first inconsistent generated chair photo set when replacing it with a more consistent four-view set. No existing model, runtime asset, or test was removed.
