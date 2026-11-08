# TOWN-ART-SERVICES — school, round 13

## Builder review

| Measure | Score (1–5) | Note |
| --- | ---: | --- |
| Reference resemblance | 4 | The exported body follows the measured bus photos; the raised rubber shoulders and hubs fix the featureless wheel disks in the draft. |
| Proportions | 4 | The bus, lean-to and chalkboard fit the 3 by 2 cell footprint; the straight-down comparison now shows the complete bus. |
| Materials | 4 | Photo-mapped rust and glass stay distinct from the timber, dark chalkboard and galvanized roof. |
| Color | 4 | The old yellow paint, dark glass and patched tin read clearly under even neutral light. |
| Detail | 3 | Windows, door, grille and lights carry the source photos. The wheel faces are simplified to stay inside the triangle cap. |
| Wear | 4 | The photo-carved shell preserves uneven rust and chipped paint; the added pieces use the town's worn timber and metal. |
| Readability at town zoom | 4 | The lean-to, legs and separate chalkboard read as classroom pieces in both three-quarter and mayor views. |
| Grounding | 5 | The bounds audit printed every school piece; all touch the ground or another piece and remain inside the footprint. |
| Scene consistency | 4 | The converted bus and salvaged lean-to fit the town's improvised materials. |
| Frame cost | Not measured | Art-only asset; not wired into gameplay here. |

## Evidence and source

`round-13.jpg` compares the bus photos and exported model at matched side,
front, rear and straight-down orthographic cameras. It also shows both
three-quarter views and the mayor view, with the other service buildings
hidden. Blender 4.5.13 rendered the imported family GLB on plain grey ground
under even light with the Standard view transform.

The model keeps `carve_object` for the bus body, with scale set from its
roughly 2 m door. It uses the measured tyre geometry, textured sidewalls,
raised rubber shoulders and hubs. The lean-to roof rests on four timber posts;
the chalkboard is a separate framed piece on legs. The overhead camera was
opened until the full bus fit beside the top photo.

The school uses 8,716 triangles of its 9,000 limit. `services-2.glb` is
1,747,864 bytes. `round-13.jpg` is 1,600 by 1,600 pixels and 245,894 bytes.
The school bounds/contact audit passed for all 34 pieces. The source photos
remain full size and each is 1,024 pixels wide.

## Claude review request

Check the front and rear end silhouettes against their photos, especially the
rounded roof and the simplified tyre faces. Check that the lean-to is visibly
attached along the bus side and that the chalkboard reads in both three-quarter
views and the mayor view. The toll bank and the other three services in
`services-2.glb` were not changed.

## Checks

- Blender 4.5.13 export and school bounds/contact audit: passed.
- `node tools/test-blender-output.mjs`: 386 checks passed, 0 failed on the
  final GLB. Earlier runs exposed the school triangle cap; the body target and
  wheel detail were reduced without changing assertions.
- Browser and in-game checks were not run. Claude handles those checks.
- Lane tier and build were not run, as required for art cards.
- Changed assertions: none. Race fingerprints: not applicable; race code is
  unchanged.

## Removed

- Removed the flat rubber material override that hid the photo-mapped tyre
  surfaces.
- Removed high-triangle wheel bolt spheres from the final recipe to meet the
  existing school triangle budget; raised shoulders and hubs remain.
- No buildings, source photos or checks were removed.
