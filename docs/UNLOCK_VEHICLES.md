# Earned vehicle models

Four original 3D models extend the two starter cars and Aurora GTR. Their shapes and details follow the generated [vehicle reference sheet](../public/assets/reference/unlock-vehicles.png). The actual game geometry is built in `src/unlock-vehicles.js`; the same builder exports the Blender-ready GLBs.

| Vehicle | Shape and visible hardware | Width × length × height | Tire radius |
| --- | --- | --- | --- |
| Dusthawk Rally | Compact hatchback, gravel tread, four auxiliary lights, roll cage, mud flaps and roof spoiler | 2.10 × 4.20 × 1.68 m | 0.41 m |
| Banshee Muscle | Long hood, exposed blower with intake butterflies, broad rear quarters, five-spoke wheels and dual exhausts | 2.26 × 5.10 × 1.47 m | 0.43 m |
| Viper Prototype | Low center-seat cockpit, curved glazing, separate fender caps, side ducts, diffuser and rear wing | 2.20 × 4.90 × 1.10 m | 0.39 m |
| Titan Monster | Lifted pickup, huge chevron tires, exposed axles, coil springs, chassis links, external cage and roof lights | 2.80 × 5.20 × 3.60 m | 0.98 m |

These dimensions are the intended vehicle envelopes. Small tread and trim details may extend by a few centimetres; the export manifest records measured mesh dimensions. The vehicle physics and camera use the same nominal dimensions.

## Runtime integration

Call `createUnlockedVehicle({ key, color, accent })`. Unknown keys return `null`. The returned group has the standard driver, steering pivot, four wheel pivots/spins, brake lights, boost flames, and directional damage data. Wheels rotate around local X. Vehicle forward is +Z; driver-left is +X; ground is y=0.

Body parts are batched by material. Wheels, driver arms/head, steering and boost remain separate for animation. All four vehicles support localized front, rear and side dents, scratches, broken-lamp shading and window cracks. `damageSpace` maps each body into the existing damage model, including the raised Titan cab. Reset restores exact original vertices and normals. Detached wheels remain controlled by the existing catastrophic crash system.

Front and rear fascia details sit outside recessed body end caps, so the lamps and exhaust outlets remain visible from driving cameras. Each car has a blank registration plate, bumper detail and thin panel seams projected onto its actual body surface. Paint retains its selected color with softer clearcoat reflections.

## Blender workflow

Run:

```sh
node tools/export-unlock-vehicles.mjs
```

The command validates the model dimensions, four damage directions, exact resets, glazing intersections and driver poses. It also traces 81 camera sightlines to verify that front lamps, brake lamps, exhaust outlets and blank plates are not hidden behind body panels. It then writes these files:

- `public/assets/models/unlocks/dusthawk_rally.glb`
- `public/assets/models/unlocks/banshee_muscle.glb`
- `public/assets/models/unlocks/viper_proto.glb`
- `public/assets/models/unlocks/titan_monster.glb`
- `public/assets/models/unlocks/manifest.json`

Import a GLB using Blender's glTF importer. Meshes, PBR materials, named wheel pivots, steering wheel and the driver are editable. The GLBs contain intact models; runtime damage shaders and animation logic remain in the game source. Changes made only in Blender are not automatically loaded by the procedural runtime: export those changes and add a matching loader before using a revised asset in the game.

No outside vehicle meshes or manufacturer logos are bundled in these four files. The geometry and design reference were created for this repository. The build was validated through the exporter; a Blender import is a separate check.
