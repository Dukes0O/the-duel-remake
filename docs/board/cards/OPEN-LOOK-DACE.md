# OPEN-LOOK-DACE

The short board entry controls current state, ownership, dependencies and locks.

Claude's card, built by a local Claude Opus session, round 1 (graphics is Claude's line). Dace Goes Looking (merged at `46ec73022`) draws its things with boxes in
`src/world/open/looks/dace-goes-looking-look.js`. Replace them with real-looking things, drawn in code first
(`memory/code-drawn-art-first`), and with `tools/blender/photo_model.py` or `hull_model.py` only where code cannot carry
the shape. Gritty and worn, never toy-like.

What a player must read at a glance:

- **Moss's old pickup:** a weathered work truck, not the race car body. Faded paint with rust at the arches, a canvas
  cover over the bed that hangs loose on one side, Rell's red blanket tied to the aerial, the bonnet that opens for the
  radiator repair, and the key on its nail at the shed.
- **The Walker stones and the tracks:** three stacked stones a player can spot from the car at 40 m; tyre ruts that
  read as one vehicle's line in the dust.
- **The Deep Sign:** a strainer (a rusted grille or drum sieve) and wet, darker gravel round it.
- **The Hangar:** a collapsed roof, one end down on the ground, the frame showing.
- **The Crow's Step:** a low timber lookout on the rocks, a ladder, a platform a person could stand on.

Keep every name the scenario and suites read (`truck.name`, the group names), the positions in
`dace-goes-looking-places.js`, and the day and dusk views.

**Checks:** a look stand and scenario on the pattern of `tools/open-look-stand.js` and
`tools/scenarios/look-radio-hill.mjs` (`look-dace`: the pickup at the forge by day, the pickup at the gate at dusk, the
stones from the car, the Deep Sign, the Hangar, the Crow's Step); `test-open-dace-goes-looking`; a small
`test-dace-look.mjs` that the named parts exist; the rule 23 set and `npm run build`. One comparison sheet, JPG at most
500 KB, in `docs/board/looks/open-dace/round-1.jpg`, then `waiting_on: claude` for the verdict. No frame check (rule 9).

**Cues:** none new.

## Claude answers
