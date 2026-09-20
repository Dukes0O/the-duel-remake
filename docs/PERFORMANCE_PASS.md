# Startup and High-quality rendering

This pass reduces first-picture blocking and unnecessary scene work. It does not lower quality or change cars, roads, driving rules, rewards or saved careers. It does not claim that all stutters are gone.

## Changes

- **Prepare shaders before drawing.** Supported browsers now prepare the scene and enabled fullscreen effects asynchronously, after a paint opportunity. The adapter covers the actual Three r171 pass materials and output colour/tone defines: 16 fullscreen materials in High, nine in Performance. `?warmup=0` retains the synchronous path for comparison. Unsupported browsers, errors and a 15-second timeout fall back to drawing.
- **Keep loading outside race time.** Start stays disabled during the renderer import, car loading and preparation. The menu shows `PREPARING THE ROAD` once the car is ready. A completed picture releases the simulation gate without replaying loading time. Only a world rebuild, car change or quality change opens another preparation gate; traffic, ghosts, damage, explosions and lighting changes do not pause a race.
- **Draw shadows once.** The contact-shading normal pass no longer redraws the sun shadow map after the colour pass. Both shadow-update flags and excluded-object visibility restore even on failure. Shadow resolution, shadow casters, lighting and contact-shading settings remain unchanged.
- **Cull distant building details.** Station and warehouse instances use 256 m spatial batches instead of whole-course batches. Every instance, material, colour and transform is unchanged. Bounds include complete rotated parts across cell edges. Feature frames are reused during assembly. A 160 m prototype submitted too many small draws; 256 m is the simpler final balance. No distance-based detail removal is added.
- **Reuse environment preparation resources.** Studio and HDR lighting use the same prefilter scratch target, blur material and 11 geometry planes, then release them. Late and failed HDR callbacks still clean up safely.

## Observed results

Measurements below were taken on 19 September local time in the same in-app browser. The comparison viewport is 1280×720; the viewport override reports device pixel ratio approximately 1.0. **This differs from the earlier showcase's 1.5 DPR samples**, so those frame times are not a direct comparison. GPU/browser caches were not cleared. This is a shared computer, not a controlled benchmark.

### Loading

These are same-candidate-build observations with preparation enabled and then explicitly disabled. Times are milliseconds. The preparation-enabled capture was taken first. No benchmark was running in parallel.

| Observation | Synchronous (`warmup=0`) | Preparation enabled |
| --- | ---: | ---: |
| Initial renderer attach → first picture | 2720 | 1768 |
| Initial world build → first picture | 2121 | 1167 |
| Initial first-draw CPU submission | 1617 | 375 |
| Harbor world build → first picture | 2470 | 1009 |
| Harbor first-draw CPU submission | 2186 | 345 |

Initial synchronous setup was 66 versus 82 ms, and world assembly 204 versus 217 ms. Harbor assembly was 284 versus 308 ms. Enabled shader submission/wait was 165/84 ms initially and 135/197 ms in Harbor. Preparation makes the largest first-draw work smaller; it is not free work and its wait is included in build-to-picture time. Attach-to-picture excludes page download, module import and earlier App construction.

### Steady High rendering

Each review skips 30 frames and samples 120. The first row is the committed pre-pass renderer. The other rows are sequential candidates. Shader preparation affects loading, not these settled draw counts.

| Harbor, 700 m | Draws | Submitted triangles | Frame p95 (ms) |
| --- | ---: | ---: | ---: |
| Before this pass | 1174 | 4,169,241 | 18.1 |
| Duplicate shadows removed | 1071 | 3,404,087 | 18.2 |
| Final 256 m batches | 1191 | 2,722,763 | 18.2 |

The final view submits about **35% fewer triangles** with 17 more draws than the original. This is reduced geometry work, not a demonstrated FPS increase. Both before and after samples had no intervals over 33.33 ms. The same Titan view falls from 360 draws / 881,733 triangles to 297 / 705,969 from the shadow fix; its short p95 remained 18.1 ms.

The pass profiler adds overhead and exposes variability. After the shadow fix, Harbor scene/normal GPU medians were 3.93/2.17 ms; final batches measured 3.70/1.49 ms. These are separate pass medians, not a GPU frame-time total. Final render-submission CPU median was 5.0 ms, but p95 reached 12.3 ms in the profiled sample (versus 6.6 ms in the earlier candidate). Do not hide that tail or infer universally smoother pacing from triangle counts. An unprofiled rolling sample afterward reported 5.2 ms CPU p95.

The scenery-only headless assembly probe adds roughly 4–5 ms despite reduced allocations: Harbor median 25.22 → 29.16 ms, Midnight 36.67 → 41.48 ms across seven alternating warmed runs. Spatial grouping has a construction cost; it is retained for its bounded visibility and steady geometry reduction, not sold as faster world generation.

## Verification and reproduction

Run `npm run qa:build`, then `npm run qa:preview`. `/tools/visual-check.html` uses memory-only saves. Its **Measure frame pacing** button now reports App simulation/audio/HUD CPU work, renderer update/submission CPU work and each compositor pass. GPU durations use asynchronous timer queries when available; unsupported/disjoint samples are marked, at most 32 queries remain outstanding, and nothing waits synchronously for results. Samples cancel on hidden pages or changing scene, quality, car, pause, audio and viewport conditions. The tool stops and restores wrappers after its bounded sample. No profiler runs during normal play.

For the actual production HUD, use `/tools/update-check.html?manifest=current&profile=1` and the normal **Start Engine** button, not the frozen-race fixture. That page also uses memory-only saves and labels its HUD source correctly. The visual-check telemetry callback is not the production HUD.

A final production-HUD sample with the clock running and the player stationary at 0 m measured App CPU median/p95 0.5/0.7 ms, HUD 0.2/0.3 ms and delivered-frame p95 18.2 ms. Audio was muted. This validates attribution on the real HUD, not moving traffic/audio performance.

The batch test compares 326,479 original instances across all nine events, extra city seeds and adversarial cell boundaries. It checks exact Float32 transforms, geometry/material/colour equality, conservative bounds and disposal. The seven scene signatures with stations/warehouses are intentionally updated for grouping and bounds; both Titan signatures and all nine instance/geometry/material/texture counts are unchanged. Full test results and final browser checks are recorded in [VERIFICATION.md](VERIFICATION.md).

## Remaining limits

World construction, environment prefilter setup, shader submission, source-image/geometry uploads and some shadow/normal shader variants still involve synchronous work. Hardware, driver caches, resolution and other running apps affect the result. New dynamic shader variants can still hitch, but cannot open a new loading hold. A timeout cannot cancel native driver polling; resources are retained until those polls settle safely. The next useful investigation is longer isolated driving traces at the user's usual viewport, not an automatic quality downgrade.
