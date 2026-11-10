# EVERBURN-WELL-ART

Found by Claude on 10 November 2026 while playing WW-BOSS (`docs/changes/WW-BOSS.md`).

In job 6 of the Everburn story the buildings at the Everburn well and Old Smoke's furnace are not drawn. The ground, the car,
the HUD and the orange ring that marks the furnace are drawn. This is so in the check runner's browser, hidden and visible, at
the well during the defend step and beside the furnace during the chase, and with the code from before WW-BOSS. Other Everburn
jobs do show buildings behind their result screens.

What is known:

- The car stood at the well's own place (-424, 304) and the place table in `src/world/scablands.js` has the well there.
- `/assets/models/wasteland/scablands/everburn.glb`, `vehicles.glb` and `kit.glb` load with status 200, and `vehicles.glb`
  holds "Old Smoke's rolling furnace".
- `src/world/scablands-scene.js` adds each place's art inside one loading step and records a failure only in the scene group's
  `userData.loadErrors`. Nothing shows that record to a check or to the console. Start there: read `assetStatus` and
  `loadErrors` in the browser.

## Checks

- A browser check that stands the car at the Everburn well in job 6 and fails when the scene group's `assetStatus` is not
  `ready` or the furnace rig is not within 30 m of its actor during the chase.
- Laptop only (Claude): a look at the furnace during the chase, with a door glowing, the smoke turning orange in the stoke and
  plates gone after a hit; then the chase driven by hand on Easy and on Medium.

## Result (Claude, 10 November 2026)

Done by Claude, because Codex was short of quota. The game's model loader renames every part (a space becomes an underscore,
a full stop is dropped), so the scene's search for "Old Smoke's rolling furnace" and "Big Bess gas truck" found nothing and the
loading step stopped for the Everburn well and the Boneyard. The scene now compares names in a plain form. See
`docs/changes/EVERBURN-WELL-ART.md`. The look at the furnace found a new fault, card EVERBURN-FURNACE-LOOK.

## Removed

Nothing.
