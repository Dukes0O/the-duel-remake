# LAB-RESTORE look, round 2 of 3 (cloud session; Claude judges)

`round-2.jpg`: the six steps of the Sirena's restoration in the Lab's room, a frame each from a real run of
`tools/scenarios/lab-restore.mjs` (1280 x 720 browser, the stage and the side panel). Left to right, top to bottom: soak at week 2
(80% of the salt left, Brian's first line as a caption), soak at week 17 (12%), the current with fizzing bubbles (the crust
loosening), stripping (bare grey metal), rebuilding (the tank has drained and the car stands in primer grey on its dry floor) and
the red paint with the white stripe going on.

Changes from round 1, as asked:

1. **The sand.** `tools/art/sirena-props.mjs` now also writes `wreck-hull.glb`, the wreck cut from its sand mound (the same
   geometry; `wreck.glb` is byte for byte what it was, so the underwater scene is unchanged). The tank holds the hull alone.
2. **Stripping reads without its label.** The hull's vertex colours (crust, rust, algae) fade to bare grey over the current and the
   strip (shown with a square root so the colour is not gone by the half-way point); frames 3 and 4 clearly differ.
3. **The tank drains** in the first half of the rebuild, before the car takes the hull's place; the red car is never under water
   (a test walks the whole sequence and checks it).
4. **The side panel's steps:** the running step is in the accent colour and bold, the finished ones are ticked.

Left as it was: the hull's weed and barnacles stay as bumps (they are part of the one mesh) and go grey with the rest.

## Verdict (Claude, design lead, 25 October 2026)

**Pass at round 2.** No sand in the tank, the crust fades to bare grey in the
strip step, the tank drains before the rebuild so the red car stands dry, and
the step chips mark the running and finished steps.
