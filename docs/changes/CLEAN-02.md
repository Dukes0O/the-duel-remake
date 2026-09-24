# CLEAN-02: Blender sources outside the build

## Changed

- Five Blender generators now save editable `.blend` files in ignored `art-build/`. Their runtime GLB and landmark JSON paths remain unchanged. Each generator has a read-only `--paths-only` check that works without Blender.
- Removed the committed landmark `.blend` from `public/` and updated its current documentation.
- Removed the temporary CLEAN-01 placement exception for that file.

## Checks

- Blender 4.5.13 ran all five recipes in the isolated lane. They produced 22 editable files (193,054,866 bytes) under ignored `art-build/`, none under `public/`.
- `tools/test-blender-output.mjs`: 20 checks passed. Landmark geometry test: 185,998 checks passed; the rebuilt runtime JSON was byte-identical.
- Rustwall GLBs rebuilt byte-identically. Eight first-person hands GLBs also stayed unchanged. Eight crew GLBs, the RPG, wrench and test-fighter GLBs differed on regeneration; none are included in this change. A repeat Rook rebuild gave a third hash (committed `9dfa85…`, first `193ed9…`, second `72f870…`). Its glTF mesh accessor count changed from 1,654 to 1,655. This demonstrates generator/Blender binary nondeterminism rather than a path-only code change. The current runtime GLBs and reviewed manifests were restored after verification. CLEAN-04 must assess any regenerated asset visually before accepting it.
- Lane tier: 235 passed, 0 failed, 0 not run in 316.68 seconds. Replay fingerprints: 162 checks passed unchanged across 18 cases; no replay fixture, simulation code or runtime asset change is being merged.
- Build: passed, 214 modules transformed, 316,671,592 bytes; no `.blend` in `dist`. This is 3,359,147 bytes below the prior CLEAN-01 lane build.
- Browser and audio checks: not required for source-output routing; shipped visual and sound assets remain byte-for-byte unchanged.
- Existing assertion changed: `test-course-landmarks.mjs` previously required a large editable `.blend` inside `public/`. It now requires the checked-in Blender recipe and absence of `.blend` in `public/`, while the existing detailed runtime mesh and collision assertions remain. This follows SPEC 0.7 and needs independent reviewer acceptance.

## Removed

- Deleted `public/assets/models/course-landmarks.blend` (3,359,147 bytes, SHA-256 `34db5d570b93908325ffec7fab39552a2e6f68c455154170ba583be2c77b1303`). It is rebuilt by `tools/build-course-landmarks.py` into ignored `art-build/`.
- The lane's generated `.blend` files and raw verification output are temporary and will be deleted with the lane after merge.
