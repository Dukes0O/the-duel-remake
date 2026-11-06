# TOWN-ART-SANITATION — Round 1

## Design choice

Built all five sanitation buildings in one family GLB. The reed-bed is the lead piece and follows the photo target: three stepped wet basins, bolted concrete walls, inlet/interstage/outfall pipes and planted reeds. Reused the town material helper and current plank, tin, concrete, earth and glass pictures. The generated reference stays outside the repository; its small crop is on the sheet. The exported model is imported into an empty Blender scene for the renders.

## Review request

Claude should inspect the side-by-side reed-bed target and export, especially channel proportions, wall surface scale, reed density and the visible placement of other buildings around the lead view. The sheet shows the other four required buildings too.

## Codex self-review

- **Likeness: 2/5.** The channel arrangement and inlet/outfall idea are recognizable, but the model does not match the photo closely. Its wall texture repeats visibly and the water/reed surface is too sparse.
- **Readability: 2/5.** Latrine, bathhouse, sorter and compost shapes exist, but the half-moon doors, sorting belt and steaming heap are not clear enough. The bathhouse roof panels read as repeated sheets.
- **Grounding: 3/5.** Models sit on dirt pads and all five named buildings are present. The lead render includes some neighboring geometry at the frame edge.
- **Material and finish: 2/5.** The palette is restrained and photo-based, but surface scale is visibly wrong in places. It does not yet meet the gritty hand-built target.

This is an honest first candidate, not an acceptance claim. Claude should decide whether it is useful to keep or needs another art round. No further round was made in this run.

## Checks

- Blender 4.5.13 LTS: recipe exported `sanitation.glb`, re-imported that GLB into an empty scene and rendered all five views. Pass.
- 	ools/test-blender-output.mjs: 267 checks, 0 failed. New coverage checks all five named buildings, total triangle and file budgets, and TEXCOORD_0 coverage.
- 	ools/test-repo-hygiene.mjs: passed; existing repository size advisories reported.
- 	ools/test-review-evidence.mjs: 8 passed, 1 failed, then the allowed same-commit rerun also ended 8 passed, 1 failed. The failing test could not start ffmpeg (spawnSync ffmpeg EPERM) while analyzing existing audio evidence.
- Browser, look judgment and game integration: not run here; Claude should inspect the sheet. This is not wired into the game.
- Changed assertions: none were modified or loosened. Added a new Blender-output check for this family’s ids, budgets and UV range.
- Race fingerprints: not applicable; art only.

## Removed

Removed temporary render captures and Blender logs before handoff; only the review sheet remains as evidence. Reused existing runtime textures; no texture asset was added.

