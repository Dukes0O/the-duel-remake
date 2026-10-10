# Smoke: round 1

Verdict: Claude requested round 2 on 10 October: grey smoke, varied
overlapping puffs, broken soft edges, brighter tops/darker undersides and
drift/churn. Director found no race-state or lifecycle blocker; the flat
brown body needed work. Round 2 supersedes this candidate.

Source rendering is frozen at 36b0da67. One compressed comparison sheet is
390,518 bytes; build it with tools/art/polish-smoke-sheet.py and the selected
native capture. No new runtime asset or sound; weapon.smoke.deploy stays.

| Native view | Radius | Visible at 10 m | Visible at 25 m | Scope |
| --- | --- | --- | --- | --- |
| Screen High | 6 m | 6.974% | .917% | Fully-inside concealment passes <=10% |
| Screen Performance | 6 m | 0% | .104% | Fully-inside concealment passes <=10% |
| Wren High | 2.5 m | 74.552% | 78.657% | Native shared look/haze only |
| Wren Performance | 2.5 m | 73.063% | 73.781% | Native shared look/haze only |

F42's rendered horizontal radius is 3.432 m at Screen / 3.435 m at Wren.
It cannot fit fully inside Wren's native 2.5 m radius. Director approved
excluding these Wren rows from fully-inside concealment claims; gameplay
radius is unchanged. Camera-inside haze is 96% in all four native cases.

Paired controls use fixed pose/time/camera and car-present/car-absent clear
and smoky frames. The denominator is a white car-only silhouette, excluding
ground and shadows. Visibility threshold is >=12 RGB levels; every repeated
smoky capture on this sheet has zero differing pixels. Native Screen and
Wren activation and state purity pass. Twelve views; no browser issues.

Quiet frame check: two old/candidate/old trials per native kind and quality,
120 RAF frames per phase (2,880 total), one active cloud, frozen pose.
Candidate p95 is 18.1-18.2 ms. Largest increase against its paired baseline
mean is .275%; no interval exceeded 33 ms. The baseline swaps back the exact
old translucent icosahedron draw while sharing current scene preparation.
This is scoped draw-replacement pacing only, not a full-change CPU-cost
pass: old phases also run the new matrix-update preparation. Render-work
cost is advisory: High Screen first p95 6.8 ms vs old 4.7/4.9,
repeat 4.5 vs 4.4/4.4. Moving multi-cloud CPU cost is not established here.

Production build passed (294 modules, 2.60 s); focused smoke tests pass.
Director deferred broad lane gate until art approval. A fresh lane gate,
build and actual old-source/candidate frame comparison are required before
merge. No merge/release.

Reproduce: DUEL_SMOKE_POLISH=1 enables the native arsenal-core scenario;
The former DUEL_SMOKE_FRAMES draw-swap sample is removed in round 2,
replaced with actual old-source/candidate timing. Use browser-harness.mjs
on its private port and memory-only storage.
