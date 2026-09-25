# Rustwall P2 round 10 review

Director and Crew independently scored wall likeness/readability/grounding/scene consistency **3/3/3/3** and wash **3/3/3/3**. Frame unmeasured. Weathered vertical steel panels reduce the earlier bright horizontal color bands and improve the facade rhythm. The wall still reads as repeated rectangular bays and straight columns. Thin perched cars, regular dark recesses and artificial wash strata remain visible. The approved reference has denser interlocked three-dimensional salvage and more irregular tall gate tower silhouettes. This candidate is a development improvement; it does not meet likeness four.

`round-10.jpg` and ignored `.evidence/2026-09-24/rustwall-p2/round-10` preserve matched Blender, High and Performance views plus six all-route placements. Private memory-only browser port 6631: twenty screenshots, zero warnings/errors. Exported wall 56,122 triangles / 14 draws; wash source module 144 / 1. The independent outer-panel red check became green without changing its assertion. The full focused suite passed 25/25 in 50.31 seconds, including gate, collision, atlas, actual source, sheet and joined-wash checks. Frame pacing and the lane/build gates remain to be recorded before a handoff. Remaining likeness work is to be re-sliced as EGG-02-P3.

## Subsequent final frame verdict

Scoped frame score four: quiet 600-frame A1/B/A2 on frozen d0e26a1 versus baseline 5a994ad, both qualities and wash/approach. Worst aggregate or mirror-stratum CPU p50/p95 ratio is 1.0833; worst RAF p95 ratio is 1.006; baseline CPU p95 drift is at most 1.053. Director independently reproduced the raw comparison. This measures complete production render CPU and delivered RAF, not GPU time. Visual scores remain 3/3/3/3. Lane 256/256 in 375.19 seconds and build passed. Prior concurrent diagnostics remain documented in the task note, including 23.5 percent baseline drift. EGG-02-P3 retains the unmet likeness target.

## Export inventory correction after merge

Direct parsing of the committed GLB accessors and scene nodes gives **55,834 wall triangles in 14 primitives**. The earlier 56,122 figure was a source total, 288 higher. Baseline wall is 58,626 in 13 primitives (not the initial source total 58,914). The actual frame sample's per-pass reduction of 2,792 agrees with these exported counts. No mesh is multiply instanced. This reporting correction changes no geometry, assertion, visual score or frame verdict; both assets remain within the original limits.
