# P4-SNOW: winter scenery and bounded snow effects

## Design, before code

Only explicit snowWorld ranges opt a track into winter scenery. Existing dry
tracks stay exact. The snow-world dev switch controls this new presentation.
Snow loaded pines, ground detail, snow ledge rocks and plough banks reuse
Kyle's approved kit GLBs through P4-KIT-LOADER, never substitute shapes.

Course construction generates real deep-snow verge bands from the same ranges.
Course.gripKindAt reads patches before its existing outside-road default;
ordinary courses and pre-existing road patches retain their exact answers.
The renderer reads these surfaces. Cue names remain surface.snow/surface.ice
through existing surfaceChanged events; weather adds no new gameplay event.

Terrain coverage uses a winter weight on the drawn triangles; ponds are
explicit off-road metadata, with fixed ice shells and shoreline snow.
Every pond vertex uses requireSurface renderedGroundHeight on actual Float32
near/far triangles; a missing surface fails instead of floating analytic ice. Pines
replace their ordinary winter-range instances and retain broken-scenery poses.
Existing packed-snow/ice road overlays gain granular/worn surface detail.
An optional landscape-detail omitFoliageAt predicate removes summer grass
inside winter ranges after all seeded placement/color calls, preserving dry
object signatures and RNG order. Native checks reject duplicate green grass.
Camera-local flakes, ridge gusts and tyre decals have fixed limits and fewer
instances in Performance. A winter world rebuilds when an equivalent Course
object changes between
menu and race, so frozen banks retain the actual live surface-patch identities.
Dry worlds retain their existing same-key reuse. Tyre marks follow actual cars
on snow only, expire,
and never write state. All randomness uses a separate seeded makeRng.

Native memory-only High/Performance checks must load the real assets, show a
full field, preserve state and saves, and cover warm readiness/disposal.
One compressed art sheet goes through the card to Claude, up to three rounds.
Frame checks reuse the unchanged DAY 360 CPU / >=359 delivered / async GPU
sampler, both orders and qualities, with the original 10% limits. Static
eight-car snapshots keep flakes/track expiry active. Moving native full-field
checks separately prove wheel-track generation/lifetime; static timings do
not measure moving-car Snow update cost. Quiet slot required.

High native acceptance also requires real floating-point reads from the scene
before Bloom, bright extraction and all ten blur targets: zero NaN/Inf.
Default Bloom stays enabled. FIX-P4-KERB-NORMALS removes shared reverse kerb
triangles without changing vertices/materials; its independent regression
failed on the actual ridge zero normal first. Genuine fix merge preserves
Dossier snapshot/readiness/retry/disposal and Snow/PIT presentation hooks.

## Checks

Focused headless acceptance passes: ranges, true deep-snow verge driving
(90 to <=45 mph), winter tyre grip, exact approved-kit patch identities,
seeded placements without consuming course RNG, actual ground attributes,
shader composition, pine break/reset/obliterate poses including the exact
loader-prepared ground anchor, quality caps and expiry. The actual eight Snow
High/LOD GLBs pass real mesh clearance, bank containment and pose reset.
Retained dry grass matrices and tints remain exact after winter omissions;
all-omitted grass releases its orphan texture. Focused suite passes in 2.7 s.
Existing surface suite: 11/11 pass; dry neutrality and cue assertions retained.
New malformed-ridge and pond-footprint tests failed first, then passed.
Curved pond vertices pass upper near/far Float32 triangle raycasts, including
actual overlaps; missing rendered terrain is rejected. Test failed before fix.
No existing assertion or tolerance was changed.

Memory-only native High/Performance acceptance passes with eight actual cars,
340/128 driven wheel marks expiring to zero after 8.5 s, and unchanged
state/profile/memory saves. Flakes use 240/72 and marks 512/128. Two ponds
pass 98 actual triangle anchors, including near/far overlap; max offset error
0.000004895 m. Live bank identities and winter pine/grass replacement pass.
Private functional QA has eight captures and no warnings/errors. The scenario
readiness predicate now returns a boolean instead of serializing a scene;
acceptance assertions stay unchanged. Clean inspection cameras hide only UI.
High ridge initially had a black region covering 58.85% of the canvas.
AO/flakes/edge smoothing were excluded. Actual HalfFloat scene input had
90 NaN components; first NaN hit a zero-normal kerb. FIX-P4-KERB-NORMALS
6d284cb0 removes only reverse duplicate faces; positions/UV/material remain
exact. Genuine merge 3004ee6c retains Dossier snapshot hooks and Snow disposal.
Fresh native default Bloom input, bright and all ten blur targets have zero
NaN/Inf. Ridge is fully visible. Consumed diagnostic probes are removed;
the permanent finite-target acceptance and normal regression remain.
Final KIT-LOADER integration ec734cfd genuinely merged without conflicts.
Renderer prepares approved extras before building Snow, keeps bank identities
on menu-to-race transitions, and feeds the actual eight grounded car meshes.
Round-one native art is pending Claude. Quiet frames, lane/build, final review
and merge remain pending.
No finished-art/frame verdict. PIT is synced; winter snapshot identity needs review.
Static timing fixes only its native presentation camera before sampling;
original samples/10percent limits and all actor poses stay exact.
Director clears the three additive renderer hooks; no real saves/release/live QA.

## Removed

Winter-range ordinary pine, rock and summer-grass instances are removed from
the copied presentation views. Snow switches replace the flat winter road
material path. Shared ordinary scenery remains in use on dry ranges/tracks.
Consumed ray/AO/flake/composite probes are removed after the cause is proved;
shared kerb duplicate faces are removed in FIX-P4-KERB-NORMALS.
