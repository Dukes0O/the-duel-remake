# TOWN-ART-MACHINES-1 | Round 4

## Changed

Rebuilt the excavator boom and dipper and trencher chain boom as rectangular welded plate sections. Added framing and guards to the trencher cab, darkened the running gear and hubs, strengthened the dump truck cab/bonnet and ribbed bed, and kept the dozer's curved painted blade with two push arms and two lift rams. Kept the yellow-green paint and wear. No new texture files were needed; the recipe still uses the existing credited photos.

The recipe exported `public/assets/models/wasteland/town/machines-1.glb` at 2,685,192 bytes. Counts read from the GLB: trencher 14,788 triangles; excavator 7,616; dump truck 14,436; dozer 7,480. Every machine is below 15,000 triangles and the GLB is below 3 MB.

**Pivots:** printed before and after. All nine joint-node translations match the round 3 GLB exactly; the table is in `docs/board/looks/town-art-machines-1/round-4-review.md`.

## Checks

- Blender recipe and GLB reimport renders: completed. Rendered rest, working and joint close-up views; round sheet made from the final GLB reimport.
- `node tools/test-blender-output.mjs`: passed, 242 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed; placement clean, size targets advisory.
- Lane tier, build, browser scenario and look check: not run here. Claude should review the look items in the round 4 review note, especially cab support/clearance, hinge poses and retained paint in The Dig.
- Changed assertions: none. Replay fingerprints: none; this is art only and is not wired into game logic in this lane.

## Removed

Deleted the superseded `round-2.jpg` and `round-2-review.md`. Removed the temporary renders, Blender file and test logs from this lane after review.
