# CLEAN-04 runtime size, round 1 review

Matched 1280×720 browser captures before and after removal of standalone
generated PNGs. The GLBs are byte-identical. The comparison sheet shows the
Rustwall interior and the High-quality wash at the same scenario checkpoints.

Independent art review found no missing texture, geometry, HUD or scene element.
The Rustwall pair's mean absolute RGB difference was 0.017/255; the wash pair's
was 0.082/255. These tiny differences are capture variation, not visible loss.
Art direction, material and lighting scores remain 3/5 because the wall has a
broad dark area and the wash has repeated pale, faceted cliffs. Both are existing
issues for later art cards, outside this cleanup.

The memory-only hidden-road-discovery scenario passed on private ports 6966
(before) and 24775 (after), with eight captures and zero issues each. Over 120
sampled High-quality frames, p95 was 16.8 ms in both runs, with 427 draw calls
and 1,291,175 triangles at the capture point. Performance-quality p95 was also
16.8 ms in both. Its sampled draw counts differed (303 before, 243 after), so
that sample does not establish a draw-cost improvement. Static captures do not
establish motion timing or GPU time. No runtime model bytes changed.

Verdict: visually equivalent, with no measured frame pacing regression in this
scenario. Raw captures are disposable after this verdict is committed.
