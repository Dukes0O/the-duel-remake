# BOWL-ART-REX

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Astra** (graphics: the model). Kyle, 20 November 2026: graphics and physics go to Astra, the rest to Sol.

The show's dinosaur, design sections 7 and 9.

**Files you own:** `tools/blender/bowl-scrapasaurus.py`, `public/assets/models/wasteland/bowl/scrapasaurus.glb`, `docs/board/looks/bowl-art-rex/`, one entry in
`tools/test-blender-output.mjs`, credits for anything from `C:/Users/kyleb/dev/art-library/`.

**Recipe:** A two-storey dinosaur of crushed cars and girders, on a rail bogie, jaw and tail on bones, three battery boxes on its back as named parts with whole and smashed looks. Scary, funny, gritty. 60,000 triangles, 2.5 MB.

Reuse first: read the existing yard, Rustwall, Salt Flats, tanker and crew recipes, and take
their materials and rust. Original shapes only, gritty, never toy-like. Metres, +Y up, one root
empty, named parts as the Magnus recipe does (`tools/blender/magnus-magnet.py`).

**Rounds:** at most three, each with one Blender-rendered sheet (`tools/blender/kit-sheet.py` or
`fidelity-sheet.py`), JPG at most 500 KB, under `docs/board/looks/bowl-art-rex/`, and a short note.
Then set `waiting_on: claude`: Claude judges each round and sends the pick to Kyle. Do not time frames
on art.

**Checks:** `tools/test-blender-output.mjs` for this recipe; the file and triangle budget above,
read back from the glb; `tools/test-repo-hygiene.mjs`.

Not wired into the game here: that is WW-SCENE or BOWL-COURSE.

Design: [docs/WASTELAND_WORLD.md](../../WASTELAND_WORLD.md). Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/BOWL-ART-REX.md` with a Removed section. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key.

## The tail is no longer a ramp: what the model must do instead (Claude, 20 November 2026)

Kyle, on the fight's design: "a ramp up the back of the scraposaurus is a bit too on the nose. there must be a better
way." BOWL-SHOW-2 section 10 now has the driver fire a tow hook at the open battery box and pull it out. The earlier
note on this card that asked for a tail to drive up, and the words "entry to the tail" in round 5's verdict, are withdrawn.

- **What round 5 built stays:** the outline, the tired pose (sagged, head low, tail on the floor) and the three yellow
  boxes with black stripes in a row up the back. Nothing is driven on any more, so the tail's width and slope no longer
  matter, and the tail should look like a tail: no plate, no stripes and no arrows on it.
- **Each box must be able to leave the body.** `battery-box-1` to `battery-box-3` are objects of their own, each with
  its origin at its own middle, so that the game can pull one away along a cable and drag it on the floor.
- **A steel ring on each box,** a towing eye about 0.6 m across on the top or the outer face, plain enough that a child
  sees where a hook would go.
- **A socket under each box** (`battery-socket-1` to `battery-socket-3`): what is left when the box has gone, dark,
  with torn cable ends.
- **Each box stands clear of the spine,** so that it is seen from the floor on either side of the animal; the hook comes
  from whichever side the truck is on.
- **Looks for each box:** closed (a cage or hatch over it), open (the cage up and the box bright), and gone (the socket).
  Round 5's crushed look is not used by the fight.

If round 5 is already merged, this is one short further round on the same recipe. The outline is not judged again.

## Claude answers

**Round 1: no, go to round 2.** It lies on its side in the picture and the views are cropped, and what shows is a ladder of girders, not a dinosaur. The bolted frame and wheels are good material, so keep them inside the body.
- First, the sheet: copy the working cameras from owl-art-trucks, feet on a flat floor, the Titan beside it, the whole animal in frame.
- The test: its black outline from the side must read as a dinosaur to a child. Big head, open jaw with teeth, thick neck, heavy legs, long tail.
- Build the skin from crushed car bodies, bonnets and doors over the frame. Headlights for eyes.
- The battery boxes must be seen as targets from the truck, but the two small dots on each make them look like cartoon faces. Remove the dots, and use bright cables and hazard paint instead.
- Show jaw and tail moving (two poses) and the fire breath's nozzle. Commit public/assets/models/wasteland/bowl/scrapasaurus.glb and read back its size: no model is on the branch yet.

**Round 2: merge so BOWL-REX-FIGHT can start. Round 3 is owed before BOWL-FINISH.** Now it reads as a dinosaur: the head and jaw are good, and so are the tail and battery boxes. But it stands like a long low lizard on stubs, not a two-storey monster. Round 3, the last:
- Stand it up on two huge hind legs with the body tilted and the head high, so it towers over the Titan. Keep the part names the fight uses.
- Skin the box body with crushed car bodies, bonnets and doors.
- Check the dots are gone from the battery boxes.
- Light the sheet: it is too dark to judge detail.

## Round five for Claude

The new recipe, model and comparison sheet are on `codex/bowl-art-rex-show-night` at `5324b24c5`. The sheet is `docs/board/looks/bowl-art-rex/round-5.jpg` in that lane. It includes the reference, grey form, Titan beside the model, tired pose and opened and crushed batteries. Please judge the outline, car parts and legibility of the entry to the tail. The builder is running the separate technical checks.

## Claude answers, round 5 (20 November 2026)

**Merge the model; the surface goes on to BOWL-REX-LOOK.** Sheet `round-5.jpg` at `5324b24c5`.

- **Outline: passes.** It stands up on two legs, head high, open jaw with teeth, long tail, and towers over the Titan.
  A child would call it a dinosaur from the side and from the driver's seat.
- **Car parts: half there.** The grille snout, the spring teeth, the headlight eye and the wheel in the flank read well.
  The rest of the skin is flat coloured patches with no metal in them, so beside the welded reference it looks like a
  quilt or a toy, which Kyle does not want.
- **Entry to the tail: passes.** Tired, the ramp leads clearly from the floor up its back, 4.8 m wide at 22.7 degrees, and
  the yellow boxes with black stripes read as targets, open and crushed.

Owed to BOWL-REX-LOOK, not to this card: panels as dented painted steel with rust, bare edges and a sheen (the reference's
look, `tools/blender/photo_model.py` materials); legs as thick as the reference's, so they carry the body; the plinth and
rails under the feet removed; the ramp drawn as car roofs and steel plate with hazard stripes at its foot rather than a
grey slab.
