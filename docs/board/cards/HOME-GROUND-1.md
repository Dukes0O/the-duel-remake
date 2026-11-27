# HOME-GROUND-1

The short board entry controls current state, ownership, dependencies and locks.

Claude's card. Step 1 of `docs/HOME_GROUND.md` (read sections 1, 5, 6 and 15 first): **the ground, the tin fence, the
gate and the lanes, with the view from above, and sprinting and the third speed on foot.** Behind a new switch `home-ground` (dev), inside the open
Scablands outing (`src/world/open/`), as a new part with its content as data. Nothing of the old town screen is used
but its drawn fence and gate (`public/assets/models/wasteland/town/safety.glb`). Level 1 is tin (Kyle, 27 November):
use the tin or chain fence, and keep the wooden one for the timbered level of a later step.

What a player can do when this is done:

- Walk or drive from Tin Town's gate to a bare patch 40 m square beside the town. The spot is measured on the real
  ground (flat, clear of roads, solids and other sites, a short walk from the gate) and written into the card before code.
- Auntie Solder says the ground is his if he fences it (one short talk, in whole plain sentences).
- Carry fence panels (2 m) and set them where he stands, in quarter turns on a 2 m step, holding the build key to
  hammer each up in about three seconds. Hang a gate (8 m opening). Pick any panel up again and set it elsewhere, free.
- An outline shows where the piece will go and turns red, with a plain sentence, where it cannot (off his ground,
  across the 8 m lane from the gate, on top of another piece).
- Fence and gate are solid to walkers and cars, are drawn at every visit, and are kept in his own save for good. A
  save made before this card loads unchanged (prove it with a saved fixture), and with the switch off nothing of this
  is read or drawn.
- On foot: sprint while the key is held, and a third speed that is far too fast and empties in three seconds, then
  refills. Show it as a small bar that is only on screen while it is in use.
- One key lifts the camera to look straight down on the whole ground, and the same key brings it back. From above he
  can mark where a piece will go (the outline stays on the ground until he builds or clears it); building is still
  done on the ground.
- He names the ground; the name is on a board at its gate.

Not in this card: hens, the real clock, builders, raids, the digger, levels.

**Sound cues:** `home.fence.hammer`, `home.fence.up`, `home.piece.lift`, `home.gate.hang`, `home.place.refused`,
`foot.sprint`, `foot.burst`, `foot.burst.spent`, `home.view.up`, `home.view.down`.

**Checks:** a suite without graphics (placing, refusing, lifting, the lane rule, marks made from above, solids, save and reload, the older
save, the switch off); the rule 23 set; `npm run build`; one browser scenario that fences the ground and hangs the
gate by real key presses; Claude's drive by hand with pictures; then Kyle's and Gratian's try before step 2 is cut.

## Claude answers
