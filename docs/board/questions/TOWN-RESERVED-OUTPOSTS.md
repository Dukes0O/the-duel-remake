# Question on TOWN-RESERVED-OUTPOSTS: where the outposts' reserved ground lives

**What needs deciding.** The card says the outposts join the town's reserved ground in `src/town/town-world.js`. That file only
reads the old roads out of the reserved ground to make the drive's roads. The reserved ground itself is the region's
`reservedShapes` in `src/town/town-world-data.js`, which `cellIsReserved` reads for planning (`placeBuilding`), home plots, the
placement preview and the old home-plot migration. `town-world-data.js` cannot import `town-world.js` (that file imports it back,
and the region is built when the module loads).

**Options.**
1. Make the outposts' ground in `src/town/town-outpost-world.js` (where each outpost is already placed, so the ground moves with
   it) and join it to `reservedShapes` in `town-world-data.js`. Planning and home plots answer with the outpost's sentence.
2. Keep a second list in `town-world.js` and make every planning path read both lists.

**My pick: option 1.** One list of reserved ground, read the same way by every path. `town-world.js` is unchanged; its roads
are still only the old-road strips. Claude to confirm or reverse.
