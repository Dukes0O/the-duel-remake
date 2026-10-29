# Kogane Pass C5, Claude's round notes

## Round 1 verdict (28 October 2026)

- Torii: pass. It reads from the start straight and from Torii Bend.
- Car park and stone lanterns: pass.
- Lake: fail. It read as a flat dark plane.
- Far shore: fail. The slopes across the lake were bare flat ramps.
- Sound: no frog layer is fine; keep the cicadas.
- Guard: the helicopter rules guard (`tools/test-heli-mode.mjs`) is not loosened.

## Round 2 changes (sheet: `c5-round-2.jpg`)

- The lake uses the game's existing reflective water (`src/circuit-water.js`,
  as Harbour Lights does): a slow ripple and the dusk sky mirrored in it, with
  a paler shallows band at the shore. No new shader. The water does not draw a
  true mirror image of the torii; the existing water only reflects the sky
  picture, so that part of the reference is not reached.
- Far shore: a cedar slope (a third tree band, `scenery.shoreForest`, kept out
  of the water), autumn maples in groves, and the existing wooded backdrop
  hills behind them.
- The Kogane pilot place is always in the place table and joins only through
  its own option, the way Summit Run does.
