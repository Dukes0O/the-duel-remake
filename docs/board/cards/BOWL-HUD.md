# BOWL-HUD

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol** (the screen). Kyle, 20 November 2026: graphics and physics go to Astra, the rest to Sol.

The Bowl's own screen: room to see the truck, tricks named as they land, and damage that can be read. Design:
[BOWL-SHOW-2](BOWL-SHOW-2.md), sections 2, 5 and 7. Kyle, 20 November 2026: "damage cannot be read until the truck
smokes. Show it plainly."

**Measured before (Claude's hand drive):** the event panel covers the top middle and the mirror; the lap map covers the
left third, where the truck often is; Big Mo's line naming Car Crush came up after Car Crush had ended; the driver's armor
is shown nowhere.

## What to build

The screen reads state and never changes it.

1. **In a Bowl event the lap map, the lap count, the gear and the mirror are not drawn.**
2. **One slim strip along the top:** the event's name, the goal (eight words or fewer; five against the Scrapasaurus), the
   score, the clock, and the crowd meter with its multiplier written on it ("CROWD x1.4"). Car Crush shows its count and
   chain ("CRUSHED 7 OF 10", "CHAIN x3") once BOWL-CRUSH supplies them.
3. **Big Mo's caption at the bottom middle.** His opening lines for a night go on the card before the countdown. At most
   one line starts an event, and a line that has waited 6 seconds unsaid is dropped (`src/bowl/bowl-night.js`, the caption
   queue).
4. **Trick pop-ups:** from `bowlTrick`, the name and points over the truck for a second and a half ("DOUBLE BACKFLIP 200
   x1.4 = 280"), with NEW on the first of a kind.
5. **The trick card:** H, paused, in any Bowl event: each trick's picture, keys as key caps and points, with a tick on
   those this driver has landed tonight. The pictures are drawn in HTML and CSS, one small side view of the truck for each
   trick.
6. **Health, in the fights only:** bottom left, the truck from above in four parts (front, back, left, right) over a bar
   of five large segments; green to yellow to orange to red; the part that was hit flashes and the number lost floats up;
   the last segment pulses with DANGER. Over each rival the same five segments replace "60/60". It shows the one measure
   that knocks a truck out (BOWL-WEAPONS makes health that measure; until then it reads armor).
7. **The result card waits two seconds** after an event ends, so that the last moment is seen (BOWL-CAMERA swings the
   camera in that time). After the Scrapasaurus falls it waits 10 seconds, while the truck drags the last box.
8. **A small plan of the arena** bottom left above the health picture, in the fights and whenever the truck is outside:
   the floor, the Spine, the two gates, each truck, the Scrapasaurus.

## Files and locks

`src/bowl/bowl-screens.js`, `src/bowl/bowl-screens.css`, `src/bowl/bowl-hud.js` (new), the Bowl's branch in
`src/screen-hud.js` and `src/combat-hud.js`, the caption queue in `src/bowl/bowl-night.js`, `tools/test-bowl-hud.mjs`
(new). Lock: `bowl-screens`.

## Checks

1. `tools/test-bowl-hud.mjs`: from a recorded state of each event, the strip's text; the goal never over eight words; a
   caption that waits 6 seconds is dropped and no event starts with more than one; the health picture's four parts and
   five segments follow the state's numbers.
2. Laptop only, Claude runs: a picture of each event's screen at 1282 by 716 with nothing over the truck at the floor's
   centre, at either wall or at either end.

## Sound cues

`bowl.health.hit` (a part is hit; stand-in `vehicle.crash`), `bowl.health.danger` (the last segment; stand-in
`raider.warning`), `bowl.card.open` (the trick card; stand-in `interface.radar`).

Behind `titan-bowl`. Builder's checks, then the lane tier and `npm run build`, recorded in `docs/changes/BOWL-HUD.md` with
a Removed line. Before CARD DONE, search `tools/` for every id and name this card changes and bring each older suite and
scenario that names it up to date. No Chrome under `codex exec`: any browser scenario is "Claude runs". Memory-only saves.
No new dependency, network request or key. Clean up nothing outside this lane.

## Build decisions, 20 November

- The screen shows a short goal and a separate bottom caption. The opening card takes the place of the night's opening caption. Later captions expire against the show's fixed clock. Treat the camera's two-second swing as screen time before showing the result; keep race settlement on the existing result event.
- The card's pause and resume use the existing app actions. The player damage display reads armor for truck fights and remaining scorches for the current Scrapasaurus fight.
- For Claude: please grant a projection hook in `src/render3d.js` (the visible player's truck, using the existing vehicle projector) and one wire in `src/screen-router.js` (pass the projection to the HUD). This pins pop-ups to the truck as the chase view swings and lifts. Please also grant the Bowl condition in `src/rear-view.js` so the mirror render pass is skipped for the whole event.
