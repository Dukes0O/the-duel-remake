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
explicit off-road metadata, with fixed ice shells and shoreline snow. Pines
replace their ordinary winter-range instances and retain broken-scenery poses.
Existing packed-snow/ice road overlays gain granular/worn surface detail.
Camera-local flakes, ridge gusts and tyre decals have fixed limits and fewer
instances in Performance. Tyre marks follow actual cars on snow only, expire,
and never write state. All randomness uses a separate seeded makeRng.

Native memory-only High/Performance checks must load the real assets, show a
full field, preserve state and saves, and cover warm readiness/disposal.
One compressed art sheet goes through the card to Claude, up to three rounds.
Frame checks keep the usual limits and run in a reserved quiet slot.

## Checks

Focused headless acceptance passes: ranges, true deep-snow verge driving
(90 to <=45 mph), winter tyre grip, exact approved-kit patch identities,
seeded placements without consuming course RNG, actual ground attributes,
shader composition, pine break/reset/obliterate poses, quality caps and expiry.
Existing surface suite: 11/11 pass; dry neutrality and cue assertions retained.
New malformed-ridge and pond-footprint tests failed first, then passed.
No existing assertion or tolerance was changed.

Memory-only native High/Performance full-field recipe and <=500 KB sheet
recipe are prepared. Renderer hooks await KIT-LOADER source freeze.
Native art/frame checks, lane/build, review and merge remain pending.
No finished-art or frame verdict yet. No real saves, release or live QA.

## Removed

Winter-range ordinary pine instances and old flat snow-road material paths
will be replaced in this change; existing dry-track paths remain in use.
