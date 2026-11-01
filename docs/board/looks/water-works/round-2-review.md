# WATER-YARD-ART: round 2 of 3

waiting_on: claude (pick for Kyle)

Two sheets, both Blender renders of the same scene that is exported to
`public/assets/models/wasteland/scrapdome/water-works.glb` (the group is not in the game yet):

- `round-2.jpg`: the nine chapters in the same 3 by 3 layout and the same camera as round 1.
- `round-2-close.jpg`: seven close-ups on one sheet: the lit boiler, the truck out of the bay,
  the tower at levels 1, 4 and 8, the well with its bucket, and the tap with its trough.

Rebuild: `blender -b --python tools/blender/water-works.py -- --root . --render .qa-dist/water-works --closeups`,
then `python docs/board/looks/water-works/round-2-sheet.py --captures .qa-dist/water-works --output docs/board/looks/water-works/round-2.jpg`
and again with `--close --output docs/board/looks/water-works/round-2-close.jpg`.

## What changed from round 1 (Claude's list, in order)

1. **The fire.** `boiler-lit`: a deep orange back wall with a hot yellow core, glowing orange and
   yellow coals, a glowing yellow grate, soft orange glow on the ground and the boiler front
   (stacked see-through planes, so it works in the game with no real light), a heat-stained dark
   chimney cap with a soot band, and a thin dark smoke wisp. The glow is held to orange, not white.
2. **Water.** Dark blue-green water with a lighter ring at the surface. The tower's door-like window
   is now a tall narrow slot (about 30 cm) with an iron frame and rivets, the painted level strip
   beside it, a red top line across the slot at level 7, and a bright orange float marker that rises
   with each level. The tank has an open hatch at the top so levels 7 and 8 show a water surface;
   level 8 also has a trickle over the lip and down the side, and a puddle on the deck.
3. **The ending.** `well-water` is raised to near the rim with a full bucket dripping into it.
   `tap-running` is a clear white-blue stream into a trough filled near the rim, with a ragged dark
   wet patch on the ground around it.
4. **Bigger chapter changes.** Patch collar thick and bare bright metal with weld beads, three
   clamps with big bolts and a new post under it. Six jerry cans in red and olive (one stacked) and
   two hoses. The valve wheel is larger and bright red. The pump house roof is newer, pale
   galvanised sheet with rows of bright rivets. The truck sits out in front of the bay, east of the
   pump house, so its tank with the stencilled WATER and its blue cab show.
5. **Ground (pictures only, not in the GLB).** Paler dirt, dark damp patches and tyre ruts so the
   rust stands off the ground. The wet patch around the trough is in `tap-running` and is part
   of the GLB.

## Nodes

Unchanged from round 1: root empty `water-works` with 25 children (`well`, `well-water`, `pump`,
`pump-fuel`, `pump-house`, `pump-house-roof`, `pipe-cut`, `pipe-patched`, `valve-missing`, `valve`,
`boiler-cold`, `boiler-lit`, `truck-bay`, `water-truck`, `tower`, `tower-water-1` to `-8`,
`camp-tap`, `tap-running`). Suggested yard placement still (-4, 0, 31), no turn. The truck now
sits in front of the bay rather than inside it; that is the one layout change.

## What to judge

- Does the boiler read as a fire (orange and yellow, no pink or white)?
- Does the tower level read from far away (float marker, red line, water in the slot)?
- Are the chapter changes big enough on the full sheet?
- What to fix in round 3.
