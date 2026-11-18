# Founding home surfaces

The paired views use the game’s Founding terrain, buildings, lighting, materials, renderer settings and plot-selection rule. The front shack is `shack-a`. Its painted door and front panels already had usable coordinates. The left return lost its galvanised-tin picture across 12.15 m². The red oxide above it lost coverage across 51.28 m² of roofing.

| Game asset | Accepted round six | Corrected |
| --- | ---: | ---: |
| Textured surface mapping to a point or line | 1,280.57 of 2,954.18 m² | 0 m² |
| Broad vertical surface mapping to a point or line | 344.12 of 807.46 m² | 0 m² |
| Collapsed red oxide on shack-a | 51.28 of 55.22 m² | 0 m² |
| Homes / triangles / embedded pictures | 10 / 19,004 / 15 | 10 / 19,004 / 15 |
| Runtime GLB bytes | 1,780,924 | 1,780,924 |

A triangle counts as collapsed when its sampled UV area is below 0.001 times its physical area in square metres. The wall subset uses triangles of at least 0.5 m² with normals within about 3° of horizontal. The finish recovered 4,412 authored UV triangles from other channels (493.50 m²) and projected 5,426 triangles from their surface normals (787.08 m²). Every one of the 8,726 working painted triangles retained its exact corner coordinates. A byte comparison masked only the sampled UV buffers. All model transforms, geometry, normals, indices, alternate UVs, materials, embedded JPEGs and lamp nodes matched. The fifteen textured materials all sample `TEXCOORD_0` on the accepted family.

The driver camera is 1.72 m above the terrain at game X −4, Z −4.4. The mayor camera uses the game's 48° vertical field of view at 45° elevation, a zoom distance of 30 m and heading −2.65 radians. Both see the same ten occupied plots at 11 in spring. The street view draws 19,864 triangles per frame and the closer mayor view draws 26,425 in each version. The whole-town capture also used the mayor’s opening distance of 90 m. In the paired pictures the long brown stripes on the shack’s side give way to rust and vertical ribs. From the closer mayor camera the red-oxide roof shows its weathering between the existing patches. At 90 m the change is subtle. The share of pixels differing by more than four RGB levels was 9.4% at driver height, 10.5% at 30 m and 1.4% at 90 m. [Matched camera views](round-1.jpg)

A clean reproduction starts with the family accepted in round six.

```sh
git show 82e2caf5b:public/assets/models/wasteland/town/homes.glb > /tmp/founding-homes-round-six.glb
python tools/blender/town-homes.py -- --root . --surface-source /tmp/founding-homes-round-six.glb
node tools/test-town-home-surfaces.mjs /tmp/founding-homes-round-six.glb
```

The source adapter needs NumPy, included in Blender. The output SHA-256 is `08bb64222db3c130d89e72e23a44ca344f71bed8d257a4a06bf91ca9c0e84264`. Reapplying the finish to the corrected asset finds zero collapsed triangles. The full Blender construction path still applies the same finish after export. An untouched Linux Blender 4.5.13 reconstruction produced 19,536 triangles and different encoded pictures before any UV work. The production asset starts from the accepted round-six export to preserve the original art. Its texture credits are in [Town texture credits](../../../../public/assets/models/wasteland/town/textures/CREDITS.md).
