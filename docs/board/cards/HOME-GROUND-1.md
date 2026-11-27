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

Claude (builder), 27 November 2026, measured on the land before code.

**The place.** The ground's north-west corner is `LAND.at('tin-town', -100, 100)`, world (5900, 100); it runs 40 m east
and 40 m south to (5940, 140), so its middle is `LAND.at('tin-town', -80, 120)`. Measured with
`scablandsSurfaceHeightAt` on a 2 m grid with 6 m round it: the ground is 0.59 m high at its north edge and 1.05 to 1.18 m
at its south edge, a rise of half a metre over 40 m. The nearest road is the Tin Road south from the gate, 35 m from
the ground's middle line, so its edge (14 m half width) is 21 m from the ground's east edge. The nearest solid of
`SCABLANDS_SOLIDS` is Tin Town's own gate fence, 31 m away; the nearest named spot (`LAND.at('tin-town', ...)` anywhere
in `src/`, and every site's `where` in the sites table) is 30 m away. Tin Town's gate stands at (5975, 62), 52 m from
the ground's north-east corner: out of the gate, a short walk south-west, on his right as he goes out. Of 408 flat,
clear spots scanned within 200 m of the town, this was among the nearest to the gate and the clearest of other things.

**Settled before code.**
- Keys on foot: B held hammers (and a press picks a piece up), R turns the piece a quarter, G changes panel and gate,
  V lifts the view and brings it back, X is the burst, F at the board renames. Shift stays the sprint.
- The lane runs from the gate straight across to the far fence, 8 m wide. Panels may line its sides and close its far
  end; nothing may cross it. A gate whose lane a panel crosses is refused.
- The gate hangs only in the outside fence. It opens as he comes within 7 m and is solid when shut.
- 80 panels are stacked by the north-east corner: 76 fence the edge round the gate, and four are over. Picking one up
  puts it back in his hands.
- Auntie Solder's talk replaces her greeting while he has no ground; the ground is marked on the map after it.
- The record is `world.open.home` = `{version, name, pieces, marks}`, written only with the switch on, by a counting
  effect that adds no journal rows.
