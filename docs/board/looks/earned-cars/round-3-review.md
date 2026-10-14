# EARN-CAR-1 Ferrari Enzo, Claude's original model: rounds 1 to 3 (14 October 2026)

Sheet: `round-3.jpg` (front three-quarter, side, rear three-quarter, top),
rendered in Blender from the game's own builder (`src/enzo-vehicle.js`,
exported with three.js). 58,100 triangles and 58 draws (budget 73,600 and 66).

- Round 1: four round tail lamps, glass engine cover, side scoops and the low
  red body read right; the beak did not drop between the fenders, the rear deck
  sat high and boxy, two vents landed on top of the nose.
- Round 2: beak drops between raised fenders, lower deck, longer lamps;
  headlamps still read as white panels, mirrors too big.
- Round 3: smaller mirrors; the headlamps still read as flat white shapes.

Verdict (Claude): **not passed after three rounds.** From the rear and side
it is a convincing Enzo-like car; from the front the headlamps read as
stickers and the flanks are too flat for a real Enzo. Stop rule: kept on
branch `claude/enzo-model`, unregistered and unmerged, and Kyle is asked
whether to spend a fourth round (recessed lamp clusters built as geometry,
not surface patches, and a stronger waist line along the doors).
