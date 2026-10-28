---
task: ARDENNES-STAVELOT-STONE
status: done
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
  door under a stone lintel with a rubble step from the ground up to the
  floor (on sloping plots the floor stands up to 1 m above the ground), small windows set deep in four-piece blue-stone
  surrounds, and a stone stack at the gable; no veranda, deck or posts.
  Without `houseStyle` the town is drawn exactly as before (Panorama).
- `src/circuits/ardennes-forest.js`: the Stavelot town uses
  `houseStyle: 'ardennes-stone'` and dark slate roof colours. The houses,
  streets and church are unchanged.
- `tools/scenarios/stavelot-stone.mjs` (new): the look views (from the road
  at Stavelot, a village street at eye height, close by the church, from
  above), High, memory-only saves, no race.
- `docs/board/looks/stavelot-stone/round-1.jpg` to `round-3.jpg` and
  `round-3-review.md`: one sheet per round, verdict round 3 (their own family
  folder, since `looks/ardennes/` already holds another card's rounds).
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
  is renamed from "foundation and veranda" to "foundation". New: every
  door step reaches the drawn ground and the floor (within the 32-bit
  instance matrix, 1 mm).

`tools/test-course-landmarks.mjs` (new check only): an unknown house style
is refused.

## Tests

On 1e523546 (integration merged in, with P4-FINISH-ARDENNES and JANITOR-LOOKS):
- Lane tier `node tools/run-tests.mjs --tier lane --changed --jobs 4`:
  96 passed, 0 failed. It includes replay fingerprints (207 checks across 23
  cases, 20 events, three frame rates, unchanged), combat replay fingerprints
  (12 checks), `test-circuit-ardennes` (42), `test-course-landmarks`,
  `test-world-composition` (only the Ardennes signature recaptured; the other
  courses identical) and `test-review-evidence` (9).
- `node tools/test-circuits.mjs`: 127,090 checks across 21 events and four
  seeds, unchanged road.
- `npm run build`: built.
- Browser: `tools/scenarios/stavelot-stone.mjs` on a private port with
  memory-only saves, High, four views per round plus a final pass on the
  merged lane: no warnings or errors; pictures reviewed, then deleted.
- One review: three faults (sheet names, doors above sloping ground, this
  test record) fixed and confirmed.

## Race

No road, run-off, solid or placement change: same houses in the same
places; replay fingerprints unchanged.

## Removed

The pastel weatherboard houses with verandas at Stavelot (the style stays
for Panorama).
