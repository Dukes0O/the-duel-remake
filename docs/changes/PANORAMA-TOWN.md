# PANORAMA-TOWN

Claude, 14 October 2026 (taken from Codex's queue; Kyle: keep every line busy).

The valley town under Conrod Straight looked like a toy grid of kit
shopfronts. It is now a country town drawn in code:

- `src/circuit-landmarks.js`: two new landmark types. `town` draws authored
  houses (weatherboard walls in eight colours, pitched iron roofs, verandas
  on posts, doors, brick chimneys, stone footings that take up the slope,
  lit and dark windows front, back and sides) and street lamps as 11
  instanced meshes; every house stands on the rendered ground at its corners
  and throws if any part comes within 3 m of a road. `church` draws a
  weatherboard church with a steeple. Window and lamp materials carry
  "window" in their names, so the existing night lighting lights them.
- `src/circuits/panorama-ridge.js`: `valleyTown()` lays out 64 houses and 14
  lamps on two streets that bend with the slope (fixed hash, same every
  load), with a square for the church; the 32 shopfront kit placements are
  gone. Looks only: no road, field, rule or record change.
- `tools/fixtures/world-signatures/panorama-ridge.json` recaptured after the
  reviewed sheet (`docs/board/looks/panorama-town/round-2.jpg`).

Changed assertions (`tools/test-circuit-panorama.mjs`): the landmark count
goes from 2 to 4 (town and church), with new checks that the town has at
least 50 houses in at most 12 meshes, more lit than dark windows, no
shopfronts, and a church over 20 m with at least 8 windows. The fence-finish
test no longer checks shopfront panes, and the test "ready Panorama owner
finishes windows before synchronous native night discovery" is replaced by
"the valley town windows and lamps light at dusk through the native night
lighting", because Panorama no longer places shopfronts.

Tests: `test-circuit-panorama.mjs` 19/19, world composition 41 checks, the
native `p4-panorama` browser scenario (26 screenshots, no warnings), lane
tier and build. Frame check: in tonight's full check (Panorama's busiest view
already includes Conrod Straight).

Removed: Panorama's shopfront placements, and the shopfront pane renaming in
`finishRidgeKitMaterials` with its test (nothing else used them).
