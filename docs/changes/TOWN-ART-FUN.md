# TOWN-ART-FUN follow-up — statue

## Design

Built only the `statue` 1×1 building. The town grid remains +Y up with the front at -Z. The photo-carved figure and plinth use four generated references and `carve_object`, whose carve keeps the largest connected shape. The plaque is a separate blank board. The other buildings remain in the family recipe.

The overhead generation stayed high-angle after zenith prompts, so its mask uses the plinth footprint only. This choice keeps the figure carve within a consistent footprint; the overhead photo comparison remains a known shortfall for Claude to review.

## Changed

- Replaced the earlier hand-built statue primitives with the carved figure/plinth and separate plaque in `tools/blender/town-fun.py`.
- Added four credited reference JPEGs in `public/assets/models/wasteland/town/textures/` and preserved their proportions and source dimensions in the exported family.
- Added round 15's photo/model sheet and review note in `docs/board/looks/town-art-fun/`.
- Added the learned photo-scale and cross-view identity fault to `docs/ART_LINE.md`.
- Removed a duplicate `side` key from the existing fountain carve table. Python had already ignored the duplicate, so the exported fountain did not change.

## Checks

- Blender 4.5.13 `--build-only`: passed before the no-op duplicate-key cleanup. Family GLB 3,970,384 bytes. Statue triangles: 1,712. Bounds and contact checks passed: the figure/plinth spans game XYZ `[-0.857, 0.093, -0.790]` to `[0.842, 5.582, 0.737]`; plaque spans `[-0.510, 0.050, -0.795]` to `[0.513, 0.589, -0.705]`.
- Exported-GLB seven-view render and photo/model inspection: completed. See the round 15 sheet and its stated overhead-view limitation.
- `node tools/test-blender-output.mjs`: passed, 377 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed; size targets are advisory.
- `node tools/test-review-evidence.mjs`: 8 passed, 1 failed. Its audio-analysis check could not spawn `ffmpeg` (`EPERM`); a same-commit solo rerun failed the same way. No assertions changed.
- Browser checks: not run. Claude should review the top comparison and all three-quarter/mayor views.
- Lane tier and application build: not run for this isolated art card; it does not change game code. No frame check: the model is not wired into the game.
- Changed assertions: none. Race fingerprints: not applicable; this art asset does not change race code.

## Removed

- Removed the prior primitive-based statue construction from `tools/blender/town-fun.py`; replaced it with the photo-carved body and separate plaque.
- Removed the duplicate fountain table key. Its effective carve settings and GLB output remain unchanged.
