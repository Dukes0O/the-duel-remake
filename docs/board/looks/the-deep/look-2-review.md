# The Deep, look test 2 (D0 DEEP-LOOK, round two of three)

[The sheet](look-2.jpg) replaces look-1. Same six fixed views at 1280 x 720 on
High, joined into one JPG (about 405 KB), the Falcone F42 in every view for
scale. Nothing here is reachable in the game: it is `tools/deep-look.html`
behind the `the-deep` switch (off). Recipe: `node tools/browser-harness.mjs
scenario deep-look`. Timing comes when it is wired into the game; none was
measured for this look test.

## Claude's round-one notes and what changed

| Note | What changed |
| --- | --- |
| 1 Kelp read as bamboo | Giant kelp: clumps of three stipes that lean apart, many broad ruffled olive-brown blades along the whole length, a small gas bulb at the base of each blade, and a canopy that spreads under the surface so the forest feels enclosed (views 2 and 3). Blades sway and flutter in the shader and glow gold-green with the sun behind. Drawn in full near the camera, as a cheaper copy farther out, and not at all beyond sight |
| 2 One cyan | Shallows are warmer and turquoise-green (views 1, 6), the water takes an olive-green cast under the canopy (views 2, 3, 4), blue arrives only at depth (view 5). Sand is paler gold and darker overall, with dark and grey patches, shell grit and scattered pebbles |
| 3 Caustics | A finer, brighter network of light lines on the sand, fading with depth, and the same ripples added to the car's paint (the roof and boot show it in views 1 and 4) |
| 4 Hovering car | Wheel contact is now worked out from the real axles and tracks, the car sits 5 cm into the sand, and a soft dark patch under it sits it on the ground. View 1's pose was the sand's own dunes tilting it; the dunes are lower now |
| 5 Sea floor | Denser seagrass meadows in patches, sand ripples and grain visible near the camera, rocks cut into angular, faceted crags with a coat of growth |
| 6 Headlights | The hard cone is gone. Each lamp now has a soft strip of scattered light that widens and fades, brighter looking back at the lamp, and the pool on the sand is softer (view 5) |
| 7 Fish | Silver flanks act as small mirrors, so a few fish flash as the school turns; the school is now tighter and closer to the car in view 4 |

## Still wrong

- Close up, kelp blades are still a little angular at the tips (view 3).
- The rocks are better but plain; real rocks need cracks and barnacles.
- The car's red goes brown and then near black with depth, as it should, but
  at 28 m (view 5) the car is a dark shape. Its own lights should pick it out.
- Pebbles are only visible where the ground turns rocky; the shallow sand has
  almost none.
- Performance quality was looked at separately, not on the sheet: the same scene
  with fewer kelp clumps, fish and seagrass, no glow around the sun, and light
  shafts that run a little bluer.
