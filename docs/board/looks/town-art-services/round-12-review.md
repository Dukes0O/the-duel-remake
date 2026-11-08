# TOWN-ART-SERVICES — toll bank, round 12

## Builder review

| Measure | Score (1–5) | Note |
| --- | ---: | --- |
| Reference resemblance | 4 | The separate door now carries the front photo's rounded riveted plate, wheel and hinges. The steel shell, roof and matched photos remain. |
| Proportions | 4 | The 2 by 2 m-cell plot keeps at least 0.5 m clearance; the door, booth and lane barrier read at full scale. |
| Materials | 4 | Photo-mapped rusted steel remains distinct from the galvanized porch and booth roofs, timber booth, and painted barrier. |
| Color | 4 | Rust, dark steel, tin, glass and alternating barrier bands stay distinct under neutral studio light. |
| Detail | 4 | The door photo details, heavy frame, counterweight, long striped arm and booth window are visible as separate construction. |
| Wear | 4 | The original shell and roof retain their photo wear; the added parts use the existing worn town materials. |
| Readability at town zoom | 4 | The barrier crosses the road-side lane; the booth and its window and roof read in the mayor view. |
| Grounding | 5 | Every audited part touches the ground or another piece; no part leaves the plot. |
| Scene consistency | 4 | The toll-bank keeps the patched, improvised steel and timber look of the service family. |
| Frame cost | Not measured | Art-only asset; not wired into gameplay here. |

## Evidence and source

`round-12.jpg` compares the full side, front, rear and above photos with
exported-model views. It also shows both three-quarter views and the mayor
view. Other service buildings are hidden. The side view is framed to show the
whole building. Blender 4.5.13 rendered the imported GLB on neutral grey ground
under even light with the Standard view transform.

The front door slab is a separate piece whose UVs map to the photographed door
region, including its wheel, rivets and hinges. A heavy steel frame stands
around it. The booth has a front window and its own small roof. The striped
barrier crosses the road-side lane from a post with a counterweight.

The piece audit printed bounds for every part. All fit inside the allowed
2-by-2 plot area of X/Z ±7.5 m, leaving at least 0.5 m to the plot boundary.
Each part touches the ground or another part. The toll bank uses 3,300
triangles against its 5,000 limit. `services-2.glb` is 1,113,008 bytes.
`round-12.jpg` is 312,084 bytes at 1,600 by 3,200 pixels.

## Claude review request

Check that the door photo region reads as one proud vault door in its heavy
frame. Check that the striped barrier, counterweight, booth window and booth
roof read clearly in both three-quarter views and the mayor view. The seven
buildings in `services.glb` were not rebuilt or changed.

## Checks

- Blender 4.5.13 export and toll-bank bounds/contact audit: passed.
- `node tools/test-blender-output.mjs`: 386 checks passed, 0 failed.
- Browser and in-game checks were not run in this art lane; Claude handles
  those checks. Claude should check the gate and booth at mayor-view distance.
- Lane tier and build were not run, as required for art cards.
- Changed assertions: none. Race fingerprints: not applicable; race code is
  unchanged.

## Removed

- Replaced the flat brown door panel, separate wheel and hinge geometry with
  one separate photo-wearing door piece.
- Replaced the short barrier and small booth with the lane-length striped arm,
  counterweighted post and larger windowed booth with its own roof.
- No other assets or checks were removed.
