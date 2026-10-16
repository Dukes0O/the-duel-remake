---
task: ARDENNES-STAVELOT-STONE
status: review
player_facing: yes
---

# ARDENNES-STAVELOT-STONE: Stavelot's houses in Ardennes stone

Claude, 15 October 2026. Kyle: "if Belgian, then Belgian look". Ardennes is
live, so this changes released scenery (AGENTS rule 18: a finished, reviewed,
green change goes live).

## Changed

- `src/circuit-landmarks.js`: the `town` landmark takes an optional
  `houseStyle: 'ardennes-stone'`. In that style each house keeps its
  footprint, storeys and position and is drawn as rubble stone walls (a new
  world-space rubble material: stones laid along each wall, mortar, grime),
  a steep dark slate roof with stone gable ends, a rubble plinth, one timber
  door under a stone lintel, small windows set deep in four-piece blue-stone
  surrounds, and a stone stack at the gable; no veranda, deck or posts.
  Without `houseStyle` the town is drawn exactly as before (Panorama).
- `src/circuits/ardennes-forest.js`: the Stavelot town uses
  `houseStyle: 'ardennes-stone'` and dark slate roof colours. The houses,
  streets and church are unchanged.
- `tools/scenarios/stavelot-stone.mjs` (new): the look views (from the road
  at Stavelot, a village street at eye height, close by the church, from
  above), High, memory-only saves, no race.
- `docs/board/looks/ardennes/stavelot-stone-round-1.jpg` to `-round-3.jpg`
  and `stavelot-stone-review.md`: one sheet per round, verdict round 3.
- `tools/fixtures/world-signatures/ardennes-forest.json`: recaptured from
  the reviewed round on the lane after P4-FINISH-ARDENNES merged. Every
  other course's signature is unchanged (checked: 20 courses identical).

## Changed assertions (reviewed)

`tools/test-circuit-ardennes.mjs`:
- The Stavelot town expects `houseStyle: 'ardennes-stone'` and roof colours
  `[0x2c3034, 0x363a3e, 0x303236]` (was the slate and red palette).
- The town support test keeps every footing and floor check; it now expects
  no veranda or post meshes, one door per house and one stone gable per
  house, and no longer checks veranda decks and posts (there are none). It
  is renamed from "foundation and veranda" to "foundation".

## Race

No road, run-off, solid or placement change: same houses in the same
places. Replays are unchanged (lane tier).

## Removed

The pastel weatherboard houses with verandas at Stavelot (the style stays
for Panorama).
