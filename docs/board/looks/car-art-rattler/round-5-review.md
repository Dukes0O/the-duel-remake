# CAR-ART-RATTLER — round 5

## Review

This is the round-five candidate for Claude's visual review. The sheet compares the exported GLB with a crop of the generated daylight pickup reference and includes rear, side, top and person-scale views. Every car view was rendered after importing the GLB into an empty Blender scene.

The recipe keeps the chassis, engine layout and stance. It replaces the open cab assembly with a continuous formed shell, removes the floating cab frames and panels, adds low side-window insets and door shut lines, softens the tire shoulders, and adds thin curved front mudguards on stays. The lead camera fits the full truck. The background and floor use one neutral grey field.

The export contains 22,442 triangles and is 2,287,640 bytes. It retains the `rattler` vehicle id, metre dimensions, wheel radii and socket names. The export check confirms one `TEXCOORD_0` layer with a non-flat range on every primitive and metallic factors no higher than 0.3.

## Remaining visual gaps

The cab shell is continuous, but the side window and door details still read too simply next to the photo. The current body picture also looks more mottled than streaked bare steel, and the tire face still has a mechanical ripple at this viewing scale. Claude should judge those differences against the reference crop first, then check the rear bed, the guards, and all four supporting views. This is a candidate sheet, not a claim that the art is accepted.

Reference prompt used this round:

> Photographic modeling reference of an original chopped 1930s rat-rod pickup on a dusty gravel lot in plain bright overcast daylight, full vehicle in front three-quarter view, closed rounded steel cab with thick pillars, low slit windshield and dented door, tall narrow oval-top grille with thin bars, exposed detailed V8 engine, round lamps on stalks, large side exhaust, short timber-sided bed, rounded thin front mudguards, narrow front tires, large rear tires with rectangular block tread and dark steel disc wheels. Weathered grey-brown bare steel with vertical rust streaks, worn bright edges and dust low down. No brands, text, watermark, dramatic shadows, extra objects or people.

## Check results

- Blender recipe: passed. Exported GLB and five views from the re-imported model.
- `node tools/test-blender-output.mjs`: passed, 257 checks and 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed. Size targets remain advisory; no oversized look sheets were reported before this sheet was assembled. The final sheet is 130,037 bytes.
- No browser or game look check was run. Claude should compare the reference crop and front three-quarter view, then inspect the rear bed, side-window shape, tire tread and guards, and the remaining three views.
- No test assertions changed. No race or game code changed; race fingerprints are not applicable.

## Removed

- Removed the round-two and round-three sheets and reviews, as required for this round. Round four remains for comparison.
- Removed the prior open cab panels, separate roof, floating window framing, and old side glazing from the exported model.
- No save, runtime path or unrelated asset was removed. Blender renders, manifests and logs are temporary evidence and are removed from the lane before commit.
