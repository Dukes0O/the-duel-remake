# EVERBURN-FURNACE-LOOK

Found by Claude on 10 November 2026, on the first look at Old Smoke's furnace after EVERBURN-WELL-ART let it be drawn.

Old Smoke's furnace is the boss of the Everburn story. In the chase it reads as a near-black box about 4 m tall with a row of
orange cones standing out of one end. A player cannot tell the three doors apart, cannot see which door glows, and sees no
change when plates fall after a hit. The chase tells the player to "hit a door while it glows", so the picture has to carry that.

## What the player must be able to read at 30 m, from a moving car

1. Which way the furnace faces, and where its left, right and rear doors are.
2. Which door is being stoked (smoke turning orange) and which door glows (bright, unmistakable, on that side only).
3. Damage: after each hit two plates are gone and the furnace looks more broken; after three it is a wreck.
4. That it is a furnace on wheels built from scrap: firebox, chimney, boiler, wheels or tracks. Gritty, never toy-like.

## Settled so far (Claude)

- First find out why it is black: the model's own colours, the tint in `tintArt`, or the light. Fix the cause before any new art.
- The flame cones at the mouth are stand-ins added in code (`addFurnaceFire`); replace them with fire that sits inside the
  mouth and doors.
- This card is also one of the pieces for the art route test Kyle asked for (Claude builds in one or two turns, against Claude
  designs and a cheaper model builds); scores go in `docs/ART_LINE.md`.
- Six art rounds at most (SPEC 0.11).

## Round 1 (Claude, 10 November 2026)

Sheet: `docs/board/looks/everburn-furnace/round-1.jpg`. Two causes found and fixed in `tools/blender/scablands-vehicles.py`
(both now in `docs/ART_LINE.md`): the model carried no colours, and it was exported standing on its nose. The door lights
are about twice as large. All three vehicles in the file (the furnace, Big Bess, the thief buggy) are rebuilt.

- Reads now: which way it faces, the glowing door (three bright vents on that side only), plates gone after hits.
- Still wrong: the body is close to black on its shaded side; the shape is boxes; the flame cones stand between the cab and
  the boiler; the rear door's vents are small. Smoke turning orange was not judged (the camera was below it).
- Next round: lighter soot and rust with a worn ochre boiler, fire inside the mouth and doors in place of the cones, and the
  view from the chasing car at 30 m. Consider the photo and carve method of the art line for the body.

## Checks

- Browser check `everburn-well` still passes.
- Look (Claude): four sides at 13 m and one view from the chasing car at 30 m, for idle, stoke, glow, one hit and two hits;
  one comparison sheet under `docs/board/looks/everburn-furnace/`.
- No frame check (rule 9): the story is not switched on.

## Removed

The stand-in flame cones in `addFurnaceFire`, when the new fire is in.
