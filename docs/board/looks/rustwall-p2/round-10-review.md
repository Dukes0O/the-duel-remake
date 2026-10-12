# Rustwall P2 round 10 review

Director and Crew independently scored wall likeness/readability/grounding/scene consistency **3/3/3/3** and wash **3/3/3/3**. Frame unmeasured. Weathered vertical steel panels reduce the earlier bright horizontal color bands and improve the facade rhythm. The wall still reads as repeated rectangular bays and straight columns. Thin perched cars, regular dark recesses and artificial wash strata remain visible. The approved reference has denser interlocked three-dimensional salvage and more irregular tall gate tower silhouettes. This candidate is a development improvement; it does not meet likeness four.

`round-10.jpg` and ignored `.evidence/2026-09-24/rustwall-p2/round-10` preserve matched Blender, High and Performance views plus six all-route placements. Private memory-only browser port 6631: twenty screenshots, zero warnings/errors. Exported wall 56,122 triangles / 14 draws; wash source module 144 / 1. The independent outer-panel red check became green without changing its assertion. The full focused suite passed 25/25 in 50.31 seconds, including gate, collision, atlas, actual source, sheet and joined-wash checks. Frame pacing and the lane/build gates remain to be recorded before a handoff. Remaining likeness work is to be re-sliced as EGG-02-P3.

## Subsequent final frame verdict

Scoped frame score four: quiet 600-frame A1/B/A2 on frozen d0e26a1 versus baseline 5a994ad, both qualities and wash/approach. Worst aggregate or mirror-stratum CPU p50/p95 ratio is 1.0833; worst RAF p95 ratio is 1.006; baseline CPU p95 drift is at most 1.053. Director independently reproduced the raw comparison. This measures complete production render CPU and delivered RAF, not GPU time. Visual scores remain 3/3/3/3. Lane 256/256 in 375.19 seconds and build passed. Prior concurrent diagnostics remain documented in the task note, including 23.5 percent baseline drift. EGG-02-P3 retains the unmet likeness target.

## Export inventory correction after merge

Direct parsing of the committed GLB accessors and scene nodes gives **55,834 wall triangles in 14 primitives**. The earlier 56,122 figure was a source total, 288 higher. Baseline wall is 58,626 in 13 primitives (not the initial source total 58,914). The actual frame sample's per-pass reduction of 2,792 agrees with these exported counts. No mesh is multiply instanced. This reporting correction changes no geometry, assertion, visual score or frame verdict; both assets remain within the original limits.

## Consumed earlier rounds

Earlier sheets and separate notes were removed in the 11 to 12 October janitor sweep.
Their verdicts and limits follow. The final sheet above is retained unchanged.

### Earlier round 1
Reference: `rustwall-gate.png` for the wall, with the approved top-right canyon crop of `wasteland-art-direction.png` as environment context for the wash. The five wall rows share numeric cameras. The wash source module and joined game bank do not share one camera.

Director score: wall likeness 2/5, readability 3/5, grounding 3/5, scene consistency 3/5; wash 3/3/3/3. Frame unmeasured. The first full source-car wall still reads as a corrugated fence: five narrow lower car bays cover less than 9% of the facade, while horizontal steel panels and peaked roofs dominate. The wash shows a plain upper terrain mass over its striated bank.

Evidence: `the consumed round-1 sheet`; ignored raw Blender/High/Performance captures and `sheet.json` under `.evidence/2026-09-24/rustwall-p2/round-1`. Private browser: 20 screenshots, zero warnings/errors. This is a development failure, retained before the changed relief method.

### Earlier round 2
Round 2 is **unscored technical evidence**. Blender showed the new recessed source-car relief, but High and Performance showed blocky dark palette areas. The relief quads faced glTF +Z, away from the game's -Z wall camera, so Three culled them. Crew's exported winding regression was red at 0% front-facing area in zone 0. The reference/camera labels and six-route placements remain recorded in `the consumed round-2 sheet` and the ignored raw sheet.

The wall exported at 53,180 triangles and 14 draws, under the unchanged 60,000/24 caps. Private browser: 20 screenshots, zero warnings/errors. A green geometry/UV check did not establish rendered visibility or likeness. The subsequent face-order correction was captured in round 3 without replacing this evidence.

### Earlier round 3
Round 3 is **unscored technical evidence**. The exported relief winding now faces the game camera in all eight zones, but the game still showed palette blocks where Blender showed car rows. Decoding the GLB found that its packed color atlas retained the earlier palette; the generated disk atlas held the authored car image. Comparing the wall and probe GLB hashes had compared two stale exports, so it did not prove a correct bake.

Crew's actual embedded-versus-authored atlas check was red with 182,446 differing RGBA channel samples in the probe relief region. The generator now discards the old pack and packs saved PNG bytes; isolated full and probe builds compare each GLB to its own SHA-verified color/surface/normal atlas snapshots with zero pixel differences. `the consumed round-3 sheet` and ignored raw captures remain as the failed in-game record. Private browser: 20 screenshots, zero warnings/errors.

### Earlier round 4
Director score: wall likeness 2/5, readability 3/5, grounding 3/5, scene consistency 3/5; wash 3/3/3/3. Frame unmeasured. The car relief is now visible in High and Performance as in Blender, but the wall reads as repeated warehouse shelving. Large rectangular recesses, X braces, blue/orange sheet bands and a thin straight skyline dominate the central gate and salvage.

The tested wall remains 53,180 actual triangles and 14 draws. Crew's isolated full/probe atlas test passes with exact own-build embedded pixels and production asset hashes unchanged; P2 winding, coverage, wheel and P1 safety checks pass. `the consumed round-4 sheet` is the matched visual record; ignored raw captures and `sheet.json` are under `.evidence/2026-09-24/rustwall-p2/round-4`. Private browser: 20 screenshots, zero warnings/errors. The candidate remains a development asset. Next: prove a dark, irregular central gate mass before changing the outer sections.

### Earlier round 5
Director score: wall likeness 2/5, readability 3/5, grounding 3/5, scene consistency 3/5; wash 3/3/3/3. Crew separately scored the wall 2/3/2/2. Frame unmeasured. The central crown improves wayfinding but reads as a thin sign with cars displayed on top; the same two regular car-shelf grids dominate the wall. Do not spread this method to outer sections.

The recorded `the consumed round-5 sheet` and ignored `.evidence/2026-09-24/rustwall-p2/round-5` are immutable matched Blender/High/Performance evidence. Private memory-only browser: 20 screenshots, zero warnings/errors. The captured export had 57,072 triangles / 14 draws and passed the new upper-mass and clear-gate regression. A later unchanged P1 asset check found its named `wall-body` extended to 46 m because three crown profiles were grouped with the fixed core; those profiles moved to `scaffold-steel` without changing geometry, leaving `wall-body` exactly 35 m. This sheet predates that node grouping correction. Its visual verdict remains valid; it is not final asset or frame evidence.

### Earlier round 6
Director score: wall likeness 2/5, readability 3/5, grounding 3/5, scene consistency 3/5; wash 3/3/3/3. Frame unmeasured. The two deep pylons are more grounded, but large blank dark strips and a cap still sit over regular car-grid bays. This is a structural improvement without a likeness gain; do not propagate it across the wall.

The recorded `the consumed round-6 sheet` and ignored `.evidence/2026-09-24/rustwall-p2/round-6` show matched Blender/High/Performance and six all-route placements. Private memory-only browser: 20 screenshots, zero warnings/errors. Exported wall 48,223 triangles / 14 draws, wash source module 144 / 1. Crew's red-first broad-pylon and unchanged portal tests pass; the old asset/core, scene/route and sheet tests also pass. Subdividing wide pylon faces prevented their invisible triangulation edges from being classified by the edge-based test as X braces. Those edges were never visible rods; the subdivision is geometrically harmless but should not be mistaken for a visual improvement. Next proof targets dedicated painted pylon surfaces in unused steel-atlas tiles, with protected tiles and the exact gate unchanged.

### Earlier round 7
Round 7 is **unscored failed paint-mapping evidence**. The generated steel source SHA `817aedd97c42b69f57736e308e302c47ea8d5940512b0ad72e6519a8ea23c2ed` was loaded, and decoded embedded strip pixels visually matched its downsample, but High showed old green/rust pylon blocks and changed crown/rails. Camera-facing triangle winding was already correct. The test had used `1 - exportedUv.y` to infer the PNG row; GLTFLoader with `flipY=false` samples `exportedUv.y`. The paint was placed in an occupied atlas quadrant while the pylon sampled another.

Crew corrected only this coordinate assertion and preserved protected-pixel and area thresholds; the candidate then failed with zero painted pylon coverage. The source now uses the actual unused upper-right PNG tiles 2/3/6/7 for the current pylon geometry, with protected old tiles unchanged. A later UV inset covers the foot y0..8. `the consumed round-7 sheet` and ignored `.evidence/2026-09-24/rustwall-p2/round-7` preserve the failure. Private memory-only browser: 20 screenshots, zero warnings/errors. The image is not a likeness or frame pass; a new capture must show the corrected explicit-source GLB.

### Earlier round 8
Director and Crew independently scored wall likeness/readability/grounding/scene consistency **3/3/3/3** and wash **3/3/3/3**. Frame unmeasured. The generated weathered plate material now appears on the gate pylons in High and Performance. The gate is more readable, but the peaked kiosk-like cap, low flanks, repeated horizontal steel bands and dark car-grid slots still differ from the approved wall reference. This is measured progress, not the required likeness 4.

`the consumed round-8 sheet` and ignored `.evidence/2026-09-24/rustwall-p2/round-8` preserve matched Blender/High/Performance and six all-route placements. Private memory-only browser port 12136: twenty screenshots, zero warnings/errors. Exported wall 48,307 triangles / 14 draws; wash source module 144 / 1. The generated paint source was selected explicitly with SHA-256, recorded in steel GLB extras, and independently downsampled test input matches embedded strip colors with RGB mean absolute error below three. Used steel palette tiles remain byte-identical, and painted pylon/lintel projected coverage, facing and physical UV aspect pass. The next proof changes the central silhouette and adjoining salvage, retaining this material and all gate/collision bounds.

### Earlier round 9
Director and Crew independently scored wall likeness/readability/grounding/scene consistency **3/3/3/3** and wash **3/3/3/3**. Frame unmeasured. The deep bridge and two connected tower tops improve the gate silhouette. Wide blue/orange horizontal outer bands and regular dark relief recesses still differ from the approved dense salvage wall, so likeness remains below the required four.

`the consumed round-9 sheet` and ignored `.evidence/2026-09-24/rustwall-p2/round-9` preserve matched Blender, High and Performance views plus six all-route placements. Private memory-only browser port 55829: twenty screenshots, zero warnings/errors. Exported wall 55,866 triangles / 14 draws; wash source module 144 / 1. The full focused suite passed 24/24 after Crew replaced centroid-only sampling in the new tower check with clipped triangle area and added a triangulation-invariant fixture. The gate opening, collision envelope and texture limits remained under existing checks. Round 10 will change outer paint and panel rhythm within the same atlas and geometry caps.
