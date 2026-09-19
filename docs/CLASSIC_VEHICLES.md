# Original starter vehicles

Falcone F42 and Stuttgart 959-S now use separate original procedural bodies in `src/classic-vehicles.js`. Changing paint no longer turns one into the other. Both build synchronously, so the race renderer can use the final model from its first displayed frame. Aurora GTR remains the separately loaded, credited concept asset with its GT package.

| Vehicle | Body and visible features | Nominal width × length × height |
| --- | --- | --- |
| Falcone F42 | Flat wedge nose, rectangular popup covers, twin hood ducts, low angular cabin, rear engine louvers, rectangular quarter intakes, four round taillights and a high bridge wing | 2.30 × 4.80 × 1.36 m |
| Stuttgart 959-S | Fuller curved nose, flush oval lamps, bowed windshield, taller round coupe roof, flared shoulders, broad five-spoke alloys, continuous rear light band and a low integrated rear hoop | 2.30 × 4.80 × 1.48 m |

The silhouettes are fictional homages rather than manufacturer meshes or licensed replicas. Falcone follows the generated `public/assets/reference/redline-horizons-art-direction.png`. Stuttgart's rounded greenhouse, inset lamps and integrated rear wing were also visually checked against the [Porsche Museum 959 reference](https://newsroom.porsche.com/en/press-kits/Porsche-Museum/Porsche-959-Coup%C3%A9.html). That photograph is a viewing reference only; it is not copied into the game or exports. No manufacturer badge is used.

The models share original construction helpers with the four unlock cars, including private paint materials, detailed wheels and the animated driver. They have separate authored bodies, cabins, fascia, ducts and spoilers. The central cabin tubs are open so painted body panels do not cross through the driver's chest. Stuttgart lamp surfaces, front cooling mouths and rear engine grille are clipped to the actual body triangles, with millimetre offsets between layers. Thin 2.5 mm shutlines define the doors. Both retain directional dents, scratches, glass cracks, brake lights, steering, boost flames and exact factory resets.

## Editable assets

`node tools/export-classic-vehicles.mjs` writes `public/assets/models/classics/falcone_f42.glb`, `stuttgart_959s.glb` and `manifest.json`. `npm run assets:export` exports these plus the four unlock models. Import them with Blender's normal glTF importer. The exported geometry comes from the runtime builder; Blender-only edits do not change the game until a matching loading pipeline is added.

The exporter validates four damage directions, crack geometry, exact vertex/normal resets, driver poses and model bounds. Nominal physics bounds stay unchanged; small trim details extend less than 5 cm beyond the nominal total length. The manifest records exact measured dimensions, triangle counts and draw counts. No Blender render or import is claimed.

`node tools/test-classic-vehicles.mjs` independently checks production hooks, four wheels, body bounds, the open driver compartment and a same-paint surface comparison. The final geometry checkpoint has 196 checks and 140 matched surface samples: the two silhouettes differ by 14.6 cm RMS, with a 27.2 cm largest sampled difference. This proves different bodies, not photorealistic quality. Paint and rendered-road grounding use these actual new starter factories in their existing integration suites.

Use `/tools/vehicle-art-check.html` in the development server for all seven cars, front/rear/side views, shared neutral paint, damage and driver pose. This page has no career or player-storage effects. It is excluded from the production entry point.
