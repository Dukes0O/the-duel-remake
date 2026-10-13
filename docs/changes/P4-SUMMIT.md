# P4-SUMMIT

Status: actual focused/kit checks pass; native timing failed. Art review and lane/build pending.
Own summit-run dev, stage 20 after Snow 19, stable id, 2,600 CR and noCombat.
Own source b7dd65eb; round-one sheet exists, pending Claude. No release, frames or merge.

## Settled behavior

Use Claude's actual 52-piece open mountain road, six cars, one run and all cars.
Retain six radii 16 / 16 / 18 / 16 / 15 / 15 m, crests 2.5 / 2.5 / 1.5 m and 720 m climb.
Named-piece boundaries set sections, surfaces, light and Tree Line pits;
Claude's marker confirmation remains requested. Exact avalanche coordinates:
trigger 10000, split 10100, slide 10420-10580, rejoin 10900 m. Gallery and Open
Road are real road/snow surfaces; negative lateral is driver-right, matching
ArrowRight/yaw, the +X driver-left asset convention and existing right pits.
Use actual approved Gallery/hut/observatory assets, real GLB collision bounds,
flat roof underside 5.0561127 m and at least 4.5 m road headroom. No substitute models.
Mixed winter ranges alone affect terrain/pines/flakes/light; dry and legacy
full-winter paths stay exact, including Snow's actual static winter override.
Presentation reads state. Existing start, pit, finish and surface cues apply.

## Actual checks and bounded fit

The first focused check failed original 165 m separation at 148.7805 m; actual
High/LOD kit validation failed early Gallery clearance on the 12 m road.
Before-code fit stays within Claude's 10% allowance and places narrowing 10100 m.
Total 14,219.9546 m; the later actual all native 2 m check passes the unchanged
165 m target for pairs >750 m apart. Earlier static 167.6946 m was not acceptance.
Each changed draft piece is recorded:

| Piece | Before | After |
| --- | --- | --- |
| 1 | 470 m | 460.3634 m |
| 3 | 380 m | 372.2087 m |
| 5 | 370 m | 362.4137 m |
| 7 | 340 m | 333.0288 m |
| 9 | 630 m | 617.0828 m |
| 11 | 390 m | 382.0037 m |
| 13 | 310 m | 303.6439 m |
| 14 | 420 m | 411.3886 m |
| 16 | 190 m | 171 m |
| 18 | 560 m | 548.5181 m |
| 20 | 210 m | 189 m |
| 22 | 570 m | 558.3130 m |
| 24 | 170 m | 153 m |
| 26 | 370 m | 362.4137 m |
| 27 | 560 m | 548.5181 m |
| 29 | 610 m | 597.4929 m |
| 31 | 390 m | 382.0037 m |
| 33 | 170 m | 153 m |
| 35 | 590 m | 577.9030 m |
| 37 | 520 m | 509.3382 m |
| 45 | 140 m | 126 m |
| 49 | 160 m | 144 m |
| 17 | 54 degrees | 59.4 degrees |
| 19 | 172 degrees | 170 degrees |
| 21 | 47 degrees | 51.7 degrees |
| 25 | 50 degrees | 55 degrees |
| 34 | 53 degrees | 58.3 degrees |
| 46 | 38 degrees | 41.8 degrees |
| 50 | 52 degrees | 57.2 degrees |

Root reviewed the 971449f2 source union and b7dd65eb roof fix. Actual focused
checks pass, including all 37 rendered-ground anchors (maximum difference
0.0000164 m), native 2 m separation, legacy winter controls and real contacts.
Target kit validation passed all 39 actual High/LOD placements on 8367733b;
roof fix b7 changes height handling only, with models and placements exact.

First summer native run stopped at 10,164.3991 m: zero finishes after 894.5583 s.
Its first actual crash was the raised roof at 184.367 s, with 5.056 m clearance;
pillars/back/scenery missed. Before code, the Director granted _staticContacts:
explicit Gallery roofs supply missing ground y through local cached copies.
Actual grounded passage, airborne roof contact, pillar and unflagged controls
now pass. Legacy paths, driver, layout, native inputs and targets stay unchanged.

All three b7 runs finish with zero crashes: summer 276.7833 s, pit 290.2583 s,
winter 262.9417 s. One real pit service at 7004.2820 m lasts 4.000 s. Timing
fails unchanged 360–480 s, pit saving 4–8 s, and starting winter costing 2–5 s.
Diagnosis stops; Claude must settle the course design. No speculative tuning.

Actual native capture passes: 16 High/Performance views, 309,720-byte round-one
sheet, private port 37273, memory-only, read-only snapshots, zero warnings/errors.
Root grants a camera-only fork view: split +35 m, 28 m up, 180 m ahead; all
other views stay exact. The exterior roof is visible; Open Road remains weak or
uncaptured as a clear route. No fork acceptance. Sheet/review live in
docs/board/looks/p4-summit; raw packets/logs in integration .evidence. Claude art
acceptance and lane jobs 4/build remain pending. Frames are deferred under rule
9, not passed. Price source/save review is clear; actual native purchase passes.
Avalanche, snowmen, yeti and finishing stay later.
## Accepted integration sync and changed assertions

Sync accepted integration 4211bf2e, including Qualifying 401/401 and build 570 ms.
Automatic union keeps Qualifying's closed-only guard, menu context, telemetry,
fixture and zero pay exact; only approved Summit field/menu hooks differ there.
App, pay, records, ghosts and all other Qualifying files match accepted bytes.
Preserve accepted release order Woods, Snow, Harbour, Panorama; append Summit.
Harbour/Snow stay on, Career dev; the catalogue grows 25 to 26 only for Summit.
Director grants the existing test-wasteland-beta exact-catalogue fixture to
append summit-run: dev with all 25 existing states and every isolation check exact.
Existing feature/preview/registry fixtures add the same dev id and fifth stage.
Closed-reference targets follow actual accepted Harbour source (28); Summit is
open and excluded. Published cyclic references and original tolerances stay.
Existing cyclic closure/reverse-drive assertions select closed definitions;
positive Summit endpoint/one-run coverage remains in its card test. Separation
checks every native 2 m sample, same >=165 m and >750 m exclusion. The unrun 6 m
roof assumption is replaced by exact actual GLB agreement and original 4.5 m
headroom. No acceptance is weakened; no new test machinery is added.

## Removed

Incorrect centered-post/nominal 6.292 m roof assumptions and duplicated cyclic
reference assertions are removed. Repeated history is folded here. All current
models, recipes, original thresholds, verdicts and still-needed evidence remain.
Two own unpublished interior-view deliverable drafts went to Recycle Bin.

## Factory resumption design before code

Claude corrected the F42 Medium race target to 270-330 s; strategy differences remain 4-8 s and 2-5 s. Start the opt-in 180 m limiter bay at 80 km/h, keep service four seconds, and use warm-tarmac only on asphalt pieces of A/B (summer 1.0, winter .82, warm winter top share .97). Existing lane roads, legacy tyres and Deep sea-floor remain exact. Dense B groves, existing soft snow heaps, brighter Summit-only night snow and the real kit windows/slit reuse approved assets. All native strategies and round-two art wait for night; at most six measured sets with original F42/.95/Medium/1989/4242. No timing or driving pass is claimed.

Integration sync conflicts: keep FAC-04 registry/flags/prices/Preview and FAC-05 catalogue fixtures byte-exact; drop obsolete central Summit additions. Preserve GP nine-base admission and Azure -400/Panorama -43 staging, adding only Summit gridStartS. Keep incoming derived menu counts, pay and qualifying controls, with Summit-only native briefing/default mode. Existing closure/reverse-lap and reference-target assertions select closed circuits with unchanged tolerances; full native catalogue coverage includes Summit. SURFACE_KINDS adds warm-tarmac by Claude decision; all old values remain. Append-only actual Summit replay/world rows will preserve every old byte, with no cyclic reference row.
