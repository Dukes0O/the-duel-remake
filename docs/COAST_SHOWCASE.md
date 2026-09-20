# Pacific coast showcase

This document records the earlier art checkpoint. The later [performance pass](PERFORMANCE_PASS.md) supersedes its opt-in warmup policy and architectural batching, without changing the reviewed coastal artwork.

This pass improves Pacific Canyon's shoreline and lighthouse without changing driving, cars, tracks, rewards or saves. It is a bounded scene improvement, not a claim that the whole game now matches the concept artwork.

## Visual scope

- `pacific-coast.js` builds fractured shoreline rock groups and animated foam in spatial cells. Their placement uses no Course random numbers and changes no feature lists. Rocks stay outside both the road recovery corridor and shortcut buffers.
- `coast-lighthouse.js` replaces Pacific's old simple tower with a tapered plaster shaft, fitted windows, a stone foot, balcony rail, glazed lantern and segmented roof. Detail is merged into six material draws. The existing solid footprint and approximate height stay unchanged.
- Pacific water gains subdued layered swells and broken whitecaps. No new bitmap files or downloads are added. Other routes retain their previous coast construction.
- Reference: the coastal panel in `public/assets/reference/expanded-scenes.png`. The pass takes its rocky headland, surf and weathered lighthouse cues; it does not add the concept's cottage or change road geometry to copy the composition.

The visual-only rocks cannot become reachable invisible obstacles. Geometry tests check every rock vertex against road/shortcut clearance and actual rendered terrain, all three curated route seeds, lighthouse bounds, resource counts, seeded state and disposal. The complete-scene signature changes only for Pacific Canyon; eight other event signatures must remain unchanged.

## Performance boundaries

High and Performance quality settings retain their existing effects, pixel ratios and shadow sizes. No automatic quality downgrade or experimental shader warmup is enabled.

`frame-metrics.js` keeps at most 240 consecutive presented frame intervals and synchronous render-submission times in fixed buffers. It publishes median, 95th-percentile, worst interval, stalls above 33.33 ms and shader count about once per second. It excludes hidden/loading/warmup/debug gaps, resets on scene or graphics changes, and retains genuine visible stalls. CPU render time is **not GPU time**.

Clean paved driving no longer calculates unused tire contact planes. The former and current effects produce identical particle, mark, bound and random-consumption results in 1,260 snapshots. This removes ten terrain queries per clean driving frame. Seven alternating headless runs of 5,000 updates measured a median 127.733 ms before and 42.037 ms after: about 17 microseconds saved per update. That is a small CPU saving, not a threefold improvement to the game frame rate.

## Reproduce the review

### Recorded browser samples

19 September local time, same in-app browser at 1280×720 and window pixel ratio 1.5. Each row uses 30 warmup frames then 120 measured frames. These are short, observed samples on a shared computer, not a controlled hardware benchmark. Baseline is the committed pre-showcase renderer. The table's after samples followed the final art review, before the small tunnel-texture readiness fix below; browser/GPU caches were not cleared.

| Scene and quality | p95 before → after (ms) | Draws before → after | Triangles before → after |
| --- | ---: | ---: | ---: |
| Pacific 2850 m, High | 16.8 → 16.8 | 628 → 633 | 1,631,021 → 1,668,005 |
| Pacific 2850 m, Performance | 16.8 → 16.8 | 338 → 346 | 930,180 → 950,408 |
| Harbor 700 m, Performance | 16.8 → 16.8 | 611 → 611 | 2,165,020 → 2,165,020 |
| Harbor 700 m, High | 33.4 → 33.4 | 1,174 → 1,174 | 4,169,241 → 4,169,241 |
| Titan 200 m, High | 16.8 → 49.8 | 364 → 364 | 881,781 → 881,781 |
| Titan 200 m, Performance | 16.8 → 16.8 | 193 → 193 | 444,714 → 444,714 |

The final coast High sample had three intervals above 33.33 ms, versus none in the baseline. Harbor High's median varied from 16.8 to 33.3 ms. Titan High repeated at p95 33.4 ms, with unchanged scene geometry and draw counts; its first final sample peaked at 99.9 ms. Do not interpret the stable coast p95 as a guarantee of hitch-free play, or the noisy Titan sample as proof of a particular cause. Longer isolated CPU/GPU profiling is still needed for High-mode pacing.

First-world draws remain slow. The baseline initial-world draw took 1,745 ms; final 2,077 ms. Harbor was 3,183 → 3,033 ms and Titan 756 → 845 ms. An earlier new-build run took 6,454 ms on the initial world, then a repeat took 2,219 ms. These cache-dependent, synchronous submission observations show that startup stalls are **not solved** by this pass. World construction and first draw are recorded separately from steady samples.

The transition checks exposed a concrete existing warning: tunnel concrete was marked ready before its image arrived. Browser textures now wait for TextureLoader's completion; the ready headless fallback is unchanged. A fresh Harbor Performance → High → Titan check then produced no warnings or errors. Its Titan High sample was p50 16.7 ms, p95 33.3 ms, maximum 33.5 ms, with four intervals over 33.33 ms. This validates the warning fix, not a causal explanation or cure for the broader timing variation.

### Run it again

```sh
npm run qa:build
npm run qa:preview
```

Open `/tools/visual-check.html`. The page uses memory-only test saves. Expand **Scene review controls** to choose Coastal approach, Golden coast, Lighthouse pass, Coastal exit, Lighthouse detail, Shoreline overview or Route B/C. Collapse the controls to inspect the view. **Coastal driving sample** runs the real test driver for 12 simulation seconds and pauses; it does not invent motion.

**Measure frame pacing** skips 30 warmup frames, records 120 delivered animation-frame intervals, then stops. It cancels if the page hides or the scene, camera, lighting, quality or viewport changes. Keep the browser and viewport identical between comparisons, and do not run headless benchmarks at the same time. Results remain in the page only and disappear on reload.

## Build identity and safe updates

Every production build embeds one immutable ID and emits the matching `build-version.json`. The menu footer shows the date/time and short ID. Menu entry and focus can check the same-origin manifest, at most once a minute and with one pending request. There is no background polling. Missing, offline, malformed or development manifests stay quiet.

The update card is menu-only. Reload always rechecks the live game state and responds once. Race entry aborts an outstanding check and hides the card; late replies cannot change it. Reload does not clear saved progress or preferences. New preview processes serve the manifest without caching and revalidate entry HTML. The client also requests `no-store` with a unique query for ordinary static servers or already-running previews.

`/tools/update-check.html` is a QA-only entry that uses the real menu with isolated saves and a simulated version response. It covers available/current/offline/missing/malformed/pending replies, throttled focus checks, stale clicks during a frozen race and explicit reload. This fixture is not included in the production release.
