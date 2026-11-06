# TOWN-ART-WALKERS — round 3 review

## Scores

- Human silhouette against the reference: **4/5**. The photo-carved figures keep recognizable head, shoulder, sleeve and leg shapes at the card's small triangle budget. The adult poses read as standing townspeople; the children remain visibly shorter.
- Clothing and materials: **4/5**. The individual photo sets give the coats, ponchos, aprons, overalls and headwear distinct fabric and wear. The trader's pack and Vane's blue drop are visible in the family lineup.
- Identity and town-distance readability: **4/5**. The thirteen-person lineup has clear color and silhouette variation, and the 40-person mayor-height view reads as a crowd. The individual figures become small at 80 m, as expected for this low-cost crowd asset.
- Render and comparison: **4/5**. The sheet compares the source front view with the exported GLB reimported into an empty Blender scene, and includes 40 m and 80 m scale views, the full lineup and the crowd view. Lighting and ground keep the dark clothing legible.

## Result

**Codex recommends pass; Claude's art pick is pending.** Round 3 addresses the round 2 findings by using separately measured wearer photos for the outfit variants, with a tint-only background-preserving treatment, and by keeping distinct accessories for the guard, trader and Vane. Do not merge this art until Claude records the final pick.

## Source and build

- Donor photos: existing accepted town walker photos and the new Vane four-view photo set; source prompts and texture derivation are recorded in `public/assets/models/wasteland/town/textures/CREDITS.md`.
- The eight adult named variants, both children, guard, trader and Vane share a compact photo-carved mesh method with separately named swinging leg parts. The existing Blender recipe builds and exports the family.
- Exported file size: 683,032 bytes. The family is below its 1 MB limit; the output checker reads the triangle counts and node names from the GLB.

## Claude should inspect

- Whether the thirteen distinct photo-carved silhouettes and clothing read as an original hand-built Wasteland crowd at town scale.
- The kid proportions, guard's slung rifle, trader's pack, and Vane's blue drop.
- The 40-person mayor-height crowd view and whether the 80 m scale panel is useful evidence.
