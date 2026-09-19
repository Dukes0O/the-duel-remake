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

## September refinement

The second art pass uses smoothly interpolated body sections, rounder shoulders, recessed brake discs, open wheel barrels, visible sidewall detail, fuller window frames and small dashboard instruments. It keeps the original wheel centers, tire radius, driver poses and physics dimensions. Rally and muscle cabins now have an open tub beneath their occupants instead of a painted deck across their bodies.

- Dusthawk: angular green livery, hood and roof intakes, perforated skid plate, forward auxiliary lamps and supported roof spoiler.
- Banshee: fitted hood stripes, split five-spoke wheels, window trim, quarter vents, side markers and detailed blower butterflies.
- Viper: fitted nose stripe, cockpit sills, airbox, sidepod louvers and visible wishbones beneath separate fenders.
- Titan: angular side graphics, front protection bar, ribbed bed and more chassis links and damper hardware.

Livery is clipped against the actual body triangles. This replaced the first sampled patch implementation after browser review exposed flickering across shoulder and wheel-arch creases. The small normal offset is 4 mm; the polygons retain the source surface shape rather than bridging across it. All detail is original geometry; no new third-party runtime dependency or texture was added.

The standalone developer page `/tools/vehicle-art-check.html` shows all seven cars under neutral lighting, with front, rear, side and close views, a shared neutral-paint comparison, damage and driver controls. It never reads or writes player profiles. The two starter cars now have their own original bodies; see [CLASSIC_VEHICLES.md](CLASSIC_VEHICLES.md).

## Blender workflow

Run:

```sh
node tools/export-unlock-vehicles.mjs
```

The command validates the model dimensions, four damage directions, exact resets, glazing intersections and driver poses. It also traces 141 camera sightlines to verify that front lamps, brake lamps, exhaust outlets and blank plates are not hidden behind body panels. These include 60 rays across the four rally auxiliary lamp faces, protecting against grille bars crossing the lenses. It then writes these files:

- `public/assets/models/unlocks/dusthawk_rally.glb`
- `public/assets/models/unlocks/banshee_muscle.glb`
- `public/assets/models/unlocks/viper_proto.glb`
- `public/assets/models/unlocks/titan_monster.glb`
- `public/assets/models/unlocks/manifest.json`

Import a GLB using Blender's glTF importer. Meshes, PBR materials, named wheel pivots, steering wheel and the driver are editable. The GLBs contain intact models; runtime damage shaders and animation logic remain in the game source. Changes made only in Blender are not automatically loaded by the procedural runtime: export those changes and add a matching loader before using a revised asset in the game.

No outside vehicle meshes or manufacturer logos are bundled in these four files. The geometry and design reference were created for this repository. The build was validated through the exporter; a Blender import is a separate check.
