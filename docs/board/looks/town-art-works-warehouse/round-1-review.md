# TOWN-ART-WORKS warehouse — Round 1

## Builder self-review

This is warehouse round 1. The sheet keeps the card's existing family round 1
and round 2 in place. It pairs the four source photos with renders from the
exported GLB, then shows both three-quarter views and the mayor's roof view.

- **Likeness: 4/5.** The carved shell follows the rusted patched tin references.
  The front and side doors, raised dock and two roof vents give the shed a
  working warehouse silhouette.
- **Readability: 4/5.** Loading doors read as separate sliding panels from the
  road and both long sides. The roof vents remain visible from above.
- **Grounding: 4/5.** The carved shell and dock supports meet the ground. Doors
  and vents meet the shell. All pieces fit within the 3×3-cell margin.
- **Material and finish: 3/5.** The body carries the generated weathered tin
  photos. The separate doors and dock have simpler materials than the shell.

## Bounds and budgets

- GLB: 837,976 bytes, 8,040 triangles, four embedded photo images.
- `warehouse` is the only direct child of `town-works`.
- Shell bounds (metres, X/Y/Z): X −4.64 to 4.67, Y −0.025 to 6.68,
  Z −10.22 to 10.09. Its 2.5 cm voxel overlap seats it on the ground.
- Dock bounds: X −3.00 to 3.00, Y 0 to 1.045, Z −11.40 to −10.10.
- Front door leaves, four side leaves, rear door, dock and both roof vents each
  have separate named piece roots. The recipe prints every piece's bounds and
  checks ground/body contact and the footprint margin.

## Claude should inspect

Please check the side-door panels against their openings, the closed front leaf
against the open front reference, the rear leaf, the two roof-vent bases, and
the dock's narrow 0.1 m clearance to the footprint margin. The mayor and both
three-quarter views are in `round-1.jpg`.
