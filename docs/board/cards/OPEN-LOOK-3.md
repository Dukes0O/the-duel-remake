# OPEN-LOOK-3

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Astra** (Kyle, 20 November 2026: Astra builds graphics). Cut by Claude on 26 November 2026 from the
Rats' Nest's round 2 verdict. The Glasshouse passed and is not part of this card.

## What to build

Round 3 of the Rats' Nest. Read [the round 2 verdict](../looks/open-rats-nest/round-2-review.md) first: it says what
passes and must stay (the cart from `rim-middle`, the roofs, the washing, the lamp, the yard at night).

1. **Nothing hangs in the air.** Every loose thing (planks, sheets, tyres, drums, scrap) rests on the cut ground, read
   from `ratsNestGround` in its final form, not the land's height before the cut. Add a check that fails if any
   placed thing's lowest point is more than 0.1 m above or 0.3 m below the ground under it.
2. **The tyre tracks** are two ruts each, curving in from the ramp, bunching at the gate, the fires and the buggies,
   and fading. No straight bars side by side.
3. **The six buggies in a row,** with their noses out, seen from `rim-south` along with the drain.
4. **The smoke** rolls, breaks at its edges and pales as it rises, near; from 1.2 km the three columns are a little
   thicker and paler at the top.
5. **Paths worn pale** between the shacks, the fires and the pen.
6. **The wrecks a player walks past** (at the gate and by the drain) are built with the hull kit
   (`tools/blender/hull_model.py`, `docs/ART_LINE.md`) or are the wrecks Tin Town's yard already uses, not boxes with
   disc wheels.

Keep the site's names, spots, solids and layout as they are: OPEN-BURNED-SCOUT builds on them. Stay inside 12 draws
and 60,000 triangles for each stage.

## Files and locks

`src/world/open/looks/rats-nest-look.js`, `tools/test-rats-nest-look.mjs`, `tools/scenarios/look-rats-nest.mjs`, and a
hull recipe under `tools/blender/` with its output if item 6 needs one. Not `tools/open-look-stand.js`
(OPEN-NEST-GROUND-2 changes it). No lock.

## Checks

1. `tools/test-rats-nest-look.mjs`: each stage within the budget; layout, spots and solids unchanged; the new check of
   item 1.
2. Run `look-rats-nest` in your cloud with software drawing, look at the pictures and mend what they show before
   handing over. Say that this was done, and that Claude has not looked yet.
3. One sheet, `docs/board/looks/open-rats-nest/round-3.jpg` (500 KB at most), replacing `round-2.jpg`, which is removed
   in the same change.

Rule 23: the checks above, then
`node tools/run-tests.mjs --jobs 4 --filter core --filter test-replays --filter test-combat-replays --filter test-world-composition --filter test-rats-nest-look --filter test-site-ground`
and `npm run build`. Claude takes the pictures on the laptop and writes the verdict at the merge.

## Sound cues

None.

## Claude answers (26 November 2026, 15:25)

1. **Wrecks:** Tin Town's scrapyard wrecks (the photographed red and brown crushed cars) at the gate and the drain,
   fitted to the existing footprints, with the site builder kept synchronous: approved.
2. **The six buggies:** draw them at the six bays' headings, and give each parked buggy a solid in the site's solids
   table, as the wrecks have, so that a car or a walker cannot pass through them. They are not actors and do not move;
   OPEN-BURNED-SCOUT and OPEN-BURNED-PEN decide when riders take them. Adding these six solids is the one change to the
   solids this card may make; say it in the change note.
3. **Grounding:** check the lowest drawn vertices against the cut surface as you say, with a thing resting on its
   support (a tyre on a roof, the upper wreck of a stack) checked against that support: approved.
4. **One more picture:** OPEN-NEST-GROUND-2 adds `spots['ground-edge']` to the stand. Add the low daylight view along
   that edge at 0.35 m eye height to `look-rats-nest`'s picture list. If that card has not merged when you hand over,
   leave the view out and say so; Claude adds it at the merge.

## Rules

Behind `story-choices`; nothing the released game does with that switch off may change. Checks use memory-only saves.
Questions go to `docs/board/questions/OPEN-LOOK-3.md` with your pick. Write `docs/changes/OPEN-LOOK-3.md` with a
**Removed** line. After the pull request is open the card is finished: do not wait for review comments.
