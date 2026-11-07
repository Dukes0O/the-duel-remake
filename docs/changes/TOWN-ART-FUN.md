# TOWN-ART-FUN round 4

Replaced the fountain and tavern's hand-built body geometry with measured `carve_object` tables and removed their previous construction code in the same change. The fountain water is a separate thin `fountain:water` part. Replaced the big wheel's geometric rim/spokes/seats with photo `trace` and `slab` geometry, parented to the named `big-wheel:wheel` hub pivot. The model is `public/assets/models/wasteland/town/fun.glb`; the round-4 sheet is `docs/board/looks/town-art-fun/round-4.jpg` (146,457 bytes).

**Art gaps for Claude:** the fountain's exported carve floats and has the wrong scale/contact. Tavern has only one oblique photo, which is repeated across its four carve views and visibly stretches; the truck remains part of that photo rather than separate geometry. The big wheel retains open spokes and a centre pivot but uses one oblique reference, and its traced circle sits small inside the support. Review the sheet and the exported close three-quarter/mayor renders. These are honest candidate results, not accepted likeness claims.

**Checks:** Blender 4.5.13 export and imported-GLB render completed. `node tools/test-blender-output.mjs` passed (336 checks, 0 failed). `node tools/test-repo-hygiene.mjs` passed; size targets are advisory. No lane tier or build was run, as directed. Browser checks remain with Claude; Claude should inspect the photo/model comparisons and the art gaps listed above. No assertions changed. Race fingerprints: not applicable; art only.

## Removed

- Removed the former fountain bonnet/pipe construction and the former tavern beam/panel/truck construction when replacing their bodies.
- Removed the round-3 sheet and review note after publishing round 4.
- No runtime game code or test behavior was removed or changed.
