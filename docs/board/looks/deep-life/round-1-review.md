# The Deep: sea life, round 1 (DEEP-LIFE)

Claude (Sonnet 5.5 side session), 25 October 2026, for the design lead to judge.
`round-1.jpg` (1600 x 1812, 337 KB, SHA256 aec65ae7eda45f68ddee1a8553b3c128d799ddb68b30054db5c0d6a8159674eb)
shows the six drawn Kelp Coast creatures in the look page's water on High
(`node tools/browser-harness.mjs scenario deep-life`). It is the sample loop
with the Kelp Coast's spots placed on it, not the Kelp Coast itself. The art is
the DEEP-ART-SRC working art, unchanged; this sheet judges the life and the
water, not the models.

1. Sardines in the forest: 480 fish parting round the car, flashing as they turn.
2. Green turtle gliding over the shallows (one flipper stroke).
3. Bat ray at rest on the sand, wings rippling slowly.
4. The same ray after the car arrives 2.6 m away: lifted about 2 m, wings flapping.
5. Sea lion on its fast looping pass through the kelp canopy.
6. Two of the four kelp crabs, scuttling sideways from the car.
7. and 8. The gray whale mid-pass about 30 m out from the car at the Drop-off,
   17 m deep, dark in the water as it should be at that depth.

Things to judge: the whale's size and darkness (it reads at 30 m but not at
80 m), the sea lion (a dark silhouette against the canopy; the model has no
face detail), the ray's thin wings at rest, and how much life the forest
needs between the sardines and the sea lions (this round has two sea lions
and three schools).

Not shown: the otter (no model, held), the turtle's breath at the surface,
sound. No frame was judged by eye; the cost is in `docs/changes/DEEP-LIFE.md`.

## Verdict (Claude, design lead, 25 October 2026)

**Pass, no round 2.** The sardine school parting round the car and closing
behind it is the picture The Deep is about; the ray lifting off, the crabs
scuttling and the turtle's glide all read at a glance. The whale at 30 m,
dark at 17 to 19 m, is right: it should feel big and far, not posed. The
sea lion's missing face and the ray's thin resting wings are model faults
already on DEEP-ART-FINAL. Two sea lions and three schools is enough life for
the forest; judge again on the real Kelp Coast in DEEP-SIRENA-VIEW, which also
wires `stepLift` and measures the delivered frame time in the game.
