# Rustwall Blender round 3

The final initial asset round follows the Director's round-2 game review. It preserves all round-1 and round-2 evidence and the metric asset contract.

## Changes

- The rock prototype has asymmetric ledges on both sides, staggered heights and a broken summit. Fine cracks and mineral grain replace broad soft bands while retaining continuous strata coordinates. The runtime's separately reviewed half-turn variation can expose both sides of this one prototype.
- Sparse thin overlapping sheets introduce notches and irregular edges into the large steel fields. An inspected internal draft made these patches too thick and small; the final sheets were broadened and thinned before freeze.
- Gate winches have flanges, paired cables and support braces. Near-gate scrap, tires and broken plates provide scale while leaving the entire passage clear.
- Banners have stronger folds and split hems. Guard helmets and shoulder shapes remain within human bounds; localized flame silhouettes replace plain cones.

## Measurement

Wall: 53,634 triangles, 13 material draws. Wash: 144 triangles in one mesh, one instanced draw, 25,776 triangles across the observed 179 banks. Three wall 1024-square material sets and one rock set remain. The wall core is 420 by 35 m, the gate opening 9 by 7 m and adult figures 1.8 m.

Command: `blender -b --python-exit-code 1 --python tools/blender/rustwall.py -- --root . --round 3`.

The final complete export/six-render run took 32.52 seconds after the scheduled integration full gate released the CPU. Exact source, asset and image hashes are in `blender-manifest.json`. The final front view, depth view and wash silhouette were inspected. `node tools/test-rustwall-assets.mjs` passes 8/8 with no changed assertions.

This freeze completes the third Blender round only. Actual browser capture, independent fidelity scores and cost review remain necessary. Round 2's High wash CPU p95 rose from 2.5 to 2.8 ms, exceeding ten percent in that sample; it is not recorded as a complete performance pass. The already planned round-3 browser comparison will reassess it. No beta claim is made here.
