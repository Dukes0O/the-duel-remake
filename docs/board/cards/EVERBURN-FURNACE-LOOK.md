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

## Round 2 (Claude, 10 November 2026)

Sheet: `docs/board/looks/everburn-furnace/round-2.jpg`, note `round-2-review.md`.

- The near-black body had a third cause, in the game: `tintArt` darkened a shared material once for every part that
  used it. Fixed, with a test; it also lightens the well's buildings, the Dead Mall and the Boneyard.
- New shape (firebox, banded drum, barred fire doors on both flanks and the rear, steam dome, taller chimney, ram),
  the first reviewed colours a little darker, fire over the glowing door in place of the cones, plates that fall by
  side: left pair, right pair, rear corner shields.
- At 30 m the facing, the doors, the stoke (orange smoke) and the glowing door all read.
- **Kyle's verdict, 10 November: "this art looks toy like."** Not accepted as the look. The model stays in as the
  working piece so the chase can be driven by hand.
- **Round 3 changes the method** (two rounds of box art, and Kyle's rule is gritty, never toy-like): build the furnace
  from photos with the art line's kits, with `rail-trains.py` (the steam engine) as the example. The part names the
  game reads stay the same: the nine door lights, the six plates, the root's name.

### Round 3 photo requests (Claude)

Claude's session has no image tool; Codex's built-in one makes these, one call per view (ART_LINE, "Photos and
masks"). Keep them in `public/assets/models/wasteland/scablands/textures/` as `old-smoke-side.jpg`, `-front.jpg`,
`-rear.jpg`, `-top.jpg`, credited in that folder's `CREDITS.md`. Every request starts with the same description:

> A photograph of one original post-apocalyptic vehicle: a heavy six-wheeled scrap truck, about 8 m long, 4 m wide
> and 5 m tall without its chimney, carrying a riveted steam-boiler furnace behind a small armoured cab. A dark iron
> firebox with one wide barred fire door in the middle of each flank and one across the rear; a horizontal banded
> boiler drum on top; a steam dome; one tall crooked chimney behind the cab; a scrap ram across the front. Thick soot
> above every door, heat-blued and rust-streaked plate, dented faded ochre armour skirts over the wheels, weld beads,
> chains, patched plates. Fire doors shut and dark. Flat overcast light, plain pale grey studio background, even pale
> floor, no people, no logos, no text. Dead-on orthographic view, no perspective, the whole vehicle in frame.

Then one of: "Exact left side elevation, front of the vehicle at the left of the picture." "Exact front elevation."
"Exact rear elevation." "Exact plan view from straight above, front of the vehicle at the top of the picture."
Check each picture is one view of the same vehicle before carving; regenerate any that is not.

**Changed assertion, reviewed by Claude (rule 18).** `tools/test-scablands-scene.mjs` no longer checks that fire stands
at the furnace's front face, because the stand-in cones there are removed. It now checks more: two tongues of fire
per door, placed over the left, right and rear doors, hidden outside the chase and during the stoke, and shown only
over the door that glows. Nothing is loosened.

## Checks

- Browser check `everburn-well` still passes.
- Look (Claude): four sides at 13 m and one view from the chasing car at 30 m, for idle, stoke, glow, one hit and two hits;
  one comparison sheet under `docs/board/looks/everburn-furnace/`.
- No frame check (rule 9): the story is not switched on.

## Removed

The stand-in flame cones in `addFurnaceFire` (removed in round 2).
