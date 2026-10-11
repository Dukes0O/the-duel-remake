# Smoke: round 2

Verdict: Claude approved round 2 on 10 October, as relayed by Kyle.
Director reviewed the final source and native High25m image. Source implements Claude's
10 October request for neutral grey, varied overlapping puffs, soft broken
edges, brighter tops/darker undersides, and drift/churn. Art acceptance is explicit. One 393,910-byte comparison sheet.

The dense body uses 32 shared instances. Transparent puffs now sort from
back to front before GPU upload for each camera, fixing a bright car-shaped ghost caused by
rear puffs drawing over front puffs only when the car was absent. Seven
small wisps and varied upper sizes break up the silhouette. Director
requested clearer grey contrast within this same round; the final shading
keeps lighter tops and darker undersides visible under strong scene light. Existing atlas
and sound cue are reused; no runtime asset was generated.

| Native view | Radius | Visible at 10 m | Visible at 25 m | Scope |
| --- | --- | --- | --- | --- |
| Screen High | 6 m | 7.779% | 2.460% | Fully-inside concealment passes <=10% |
| Screen Performance | 6 m | .886% | 2.127% | Fully-inside concealment passes <=10% |
| Wren High | 2.5 m | 75.938% | 79.502% | Native shared look/haze only |
| Wren Performance | 2.5 m | 73.830% | 74.288% | Native shared look/haze only |

F42's rendered horizontal radius is 3.432/3.435 m; it cannot fit fully in
Wren's native 2.5 m cloud. This Director-approved scope is unchanged.
Camera-inside haze is 96% in all four cases. All eight repeated frames are
identical; twelve native views, zero warnings/errors, state purity passes.

The same fixed-camera four-pass controls and white car silhouette are used
as round 1; >=12 RGB levels means visible. No assertion was relaxed. The
initial round 2 candidate leaked up to 35.51% at 25 m. Correct instance
ordering fixed that failure within the bounded development check.

Focused tests and production build pass (294 modules, 517 ms), including
opposite-camera sorting and a red/pass teardown regression for releasing
the instance buffer. No art changed for that disposal fix.

Actual-source quiet comparison: pre-Smoke 3af7f15c versus candidate, native
advancing simulation, moving camera and one active cloud. Each native
kind/quality uses 60 warm-up and 180 measured RAF frames. Old/candidate
p95 ms: High Screen 33.4/33.4, High Wren 33.3/33.4, Performance Screen
16.8/16.9, Performance Wren 16.8/16.8. Maximum increase .595%, below 10%.
Whole preparation/render work p95 ms: 11.9/11.6, 10.9/11.1, 7.0/7.4,
6.9/7.2; maximum increase 5.714%, also below 10%. No material substitution.
Inspection draws coexist with native RAF; this stresses High (old/new
>33 ms counts 42/39 and 31/38). Performance has no >33 ms samples.
Both browsers pass with zero warnings/errors and state purity intact.
Integration ac01cbe6 sync preserves this approved art. Fresh lane passes
367 suites, including all 162 replay checks; fresh build passes in 538 ms.

Rebuild the sheet with tools/art/polish-smoke-sheet.py and the chosen native
capture (arsenal-core-2026-10-10T15-15-21-814Z). DUEL_SMOKE_POLISH=1 runs the
native capture. DUEL_SMOKE_FRAMES=1 instead samples actual checkout timing;
run it against both actual source checkouts with the same scenario file.

## Prior rounds, consumed

Earlier smoke verdict: Claude requested grey varied puffs, soft broken edges, brighter tops/darker undersides and drift/churn; flat brown round1 source36b0da67 was superseded. Native Screen visibility High6.974%/.917%, Performance0%/.104% at10/25m; Wren High74.552%/78.657% and Performance73.063%/73.781% were appearance-only because its2.5m cloud cannot contain the actual3.432/3.435m F42. This explicit scope and96% inside haze persist above. Twelveviews/read-only state passed, repeatedpixels exact, threshold12RGB unchanged. Round1 draw-swap2880RAF p95 18.1–18.2ms/+0.275% was scoped pacing only: new matrix preparation ran in both controls, High work initially6.8 vs4.7/4.9ms (repeat4.5 vs4.4/4.4). It did not establish full-change or moving multi-cloud CPU cost. That draw-swap recipe was removed and replaced by round2 actual-source timing.

Earlier sheets and superseded notes are removed after their verdict facts are folded here. Recipes and the final comparison remain.
