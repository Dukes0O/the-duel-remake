# Scablands land, round 10: the realism trial, step 3 (things at every size)

Sheet: `round-10.jpg` (four places, before above and after below: near Tin Town, the East Road,
under the pylon line, the Burn). Pictures from the real game in a visible browser window on the QA
page with memory-only saves, Performance, taken 15 November 2026 with scenario
`tools/scenarios/scablands-things.mjs`. "Before" is the game as players have it; "after" has the
switch `scablands-realism` on: step 1's light, step 2's ground and step 3's things. Codex placed
the things and made them solid; Claude drew each kind in code
(`src/world/scablands-things-look.js`) and judged these pictures.

## Verdict (Claude): passes, merged, switch off

The land is no longer bare. Sage scrub and stones lie across the flats, a fence with sagging wire
runs by the road near Tin Town, telegraph poles carry their wire along the East Road to the
horizon, a lattice pylon stands over the plain with its cables, and burnt stumps stand on the
Burn. The road now has depth and a sense of speed has something to hang on. Every view is inside
the limits: at most 13 more draw calls (limit 40) and 27,508 more triangles (limit 150,000),
counted on the main pass.

## What is drawn, and how

- **Rock** (stones, boulders): a ball broken along flat faces, flat and sunk on its under side,
  wearing the scab rock photograph, darker where it meets the ground. A stone takes the colour of
  the ground it lies on: black on the scab plates and the Burn, pale on the salt.
- **Scrub and dead brush:** three crossed cards wearing a drawn picture of the bush (fine twigs
  from one root, small dusty leaves), lit from both sides.
- **Timber:** telegraph poles with two cross arms and glass insulators, some down; split fence
  posts out of true; squared sign posts. Signs are painted on four planks with an arrow and the
  place's name and distance.
- **Pylons:** four flat lattice faces with the gaps cut out, and cross arms; 40 triangles a tower.
- **Small litter:** bones, dented cans, torn corrugated sheet, salt crystals, burnt stumps.
- Standing things are drawn by distance (a boulder within 800 m, a pole within 1,500 m), small
  things by kind (a stone within 70 m, a bush within 120 m), each growing in over the last part
  of its range.

## Short of right, kept for a later round

- The pylon's steel draws olive in the land's warm light; it should be grey.
- On the black scab plates the bushes are still a little bright.
- The boulders below the scarps are not in any picture: the scenario's scarp view looks at bare
  slope. Not judged.
- The signs are too small to read from the driver's seat until the car is beside them.
- Leaning poles are drawn upright.
- Judged in still pictures only. The drive in real time, and the frame check, are owed before
  this switch is turned on for anyone.
