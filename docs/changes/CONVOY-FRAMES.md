# CONVOY-FRAMES: full-loop tanker cost

The distant tanker passes the ten-percent cost limit in both presets and both
repeats. Native near appearance, lamp signals and race state are preserved.
Lane gate passes all 356 suites in 898.29 s; production build passes in 617 ms.

## Changed

Claude, 9 October: drop player input; follow the tanker with a fixed camera for
one whole Salt Flats loop. Run twice with the tanker and a plain box of the
same size, in High and Performance. Simplify the distant view above ten percent.
Further decisions belong to Claude.

At 80 m the view combines existing native body geometry into one draw, retaining
every original texture coordinate and the worn atlas. The exact roof and two
warning posts make four distant draws. It switches back below 76 m to prevent
flicker. Near objects, hierarchy, geometry and materials stay exact. Shared
lamps keep boarding recovery and Tollkeeper flashes; all resources dispose once.

## Checks

Original main-view measurements on the older lane base exceeded ten percent
in both High repeats (GPU +42.53%/+132.62%). Final measurements use integration
c2762d1b and replace the tanker in every native scene draw, including the mirror.
The box is exactly 3 by 3.5 by 11 m, centred at height 1.75 m. Both conditions
retain native movement, poses, valves and temporary career ownership.

Final private laptop run: seed 9908, zero inputs, camera fixed 110 m behind,
12 m across and 14 m above, 1280 by 720, resolution scale 1. All eight continuous
640 m loops match native start tick 120, end tick 4703 and one-second witnesses.
Each loop covers 38.1917 native seconds and 2,271–2,292 delivered frames.

| Preset/repeat | Delivered p95 added | CPU submission p95 added | Main-view GPU p95 added |
| --- | ---: | ---: | ---: |
| High 1 | 0% | -37.37% | -31.25% |
| High 2 | 0% | -54.76% | -34.59% |
| Performance 1 | 0% | -24.56% | -10.82% |
| Performance 2 | 0% | +2.04% | -12.41% |

Delivered p95 is 16.8 ms throughout. CPU, delivered intervals and completed GPU
queries are separate measures. GPU queries cover the High composer or
Performance scene pass; CPU submission also includes the mirror. Missing,
disjoint or sparse available GPU timing fails. Native owner, scale, camera view,
start/end and path guards pass. Browser: zero errors, eight known QA-only
Three-bundle warnings (one per page). All processes and private port are closed.

The parent reviewed source, all-view sampling, near and far captures and metrics:
no finding. Native tanker suite: 62 controls pass, including exact near pose,
far geometry/UVs, lamp recovery/flash and disposal. Actual runtime GLB UV/flash
check passes. Tollkeeper: 165 acceptance checks in 21 passing tests.
Existing assertions and expected hashes remain unchanged. The Director granted
only the warning-material fixture expansion for shared clones, plus one separate
body in Tollkeeper's former lamps-only fixture. Neither relaxes an assertion.
Simulation and replay data are unchanged. The lane replay suite passes all 162
checks across 18 cases, 16 events, eight categories, three frame rates and three
runs. No expected replay fingerprint or world signature was regenerated. The
build has the existing chunk-size warning; the lane gate has zero failures and
zero skipped suites.

## Removed

Replaced the stopped/coasting pose and 120-frame partial profiler with continuous
full native loops. Replaced distant material groups with one native atlas draw;
the original model remains the near level. No native parts or assets were added.
Raw captures/reports are disposable after review; only this verdict is retained.
