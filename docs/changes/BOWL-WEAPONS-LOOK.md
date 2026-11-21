# BOWL-WEAPONS-LOOK

- New `src/bowl/bowl-weapons-view.js`, drawn in code: the hammer (tell, hit flash, miss in the dirt), the saw (spin, sparks over the bonnet, heat), the launcher (plate on air rams, air gauge facing the driver), the rivals' bolt-ons and paint (horn and plough, boiler and chimney, tail, spare tyre, stacks, snout and jet of fire), and the damage (a loose panel at 3/5, smoke at 1/5, fire at 0). It reads `bowlWeapon`, `armor`, `damageZones` and `bowlFlight` and writes no race state; the only thing it changes is a rival truck model's paint.
- Hooks: `bowl-view.js` makes the view and hands it the trucks; `render3d.js` passes `[player, rival, ...extra]` (one line); `bowl-screens.js` shows the three drawn pictures on the weapon card; `armor-kit-meshes.js` and `combat-scene.js` no longer draw the arena's kits, spiked bumper and roof crossbow on a Show Night truck.
- Sound cues: none new (BOWL-WEAPONS's).
- Checks: new `tools/test-bowl-weapons-view.mjs` (real rules, state behind a write-refusing proxy, each truck built once, damage stages) passed. Lane tier and `npm run build`: see the merge's commit message.
- Look: `docs/board/looks/bowl-weapons/round-1.jpg` and its review, from the real game on Easy.
- Changed assertions: none. Removed: the emoji weapon pictures on the card; the arena kits, bumper and crossbow on Show Night trucks.
