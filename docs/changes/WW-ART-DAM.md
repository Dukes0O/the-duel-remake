# WW-ART-DAM: Dry Dam

## Design

Use Claude's offsets from the rail gate origin: the filling hall at about
(-17, -23), the crest walkway and sea wheel at (0, -50), 28 m high, the
gearbox beside it, boilers near (25, 5), spillway near (85, 25), and the
gatehouse on a separate pad near (45, -60), 30 m high. The far side and ocean
stay out of the model.

## Round 4 work

- Rebuilt the front as a straight gravity wall that leans back 0.15 m per metre
  of height. Six tall piers stand proud at the photo's broad spacing.
- Cropped and baked the supplied dam photo into a 2048 x 750 front-face JPEG.
  The wall UVs project the photo from the front, so the waterline, lift joints,
  runoff and central gates line up with the reference. Concrete tiles stay on
  the side structures and rock shoulders.
- Replaced the block-shaped rail lintel with an arched tunnel mouth and paired
  steel doors. Moved the upper gate to the high centre, added the crest hoist
  gantry and two large lift wheels, and kept the handwheel and open gearbox on
  the 28 m walkway.
- Widened and lowered the filling hall. It has rows of long, low tanks and a
  wet back wall with its own sharp dark-runoff and white salt-crust texture.
- Removed the basin bowl and large faceted red hills. Short grey rock shoulders
  frame the wall; the review sheet stands on a plain neutral ground plane that
  is not part of the GLB.
- Added separate close views of the spillway, its wrecks, the gatehouse and
  buried `dam:gear-old`, plus a face comparison beside the photo at matching
  scale and angle. The sheet renders from the exported GLB imported into an
  empty Blender scene.
- Updated texture credits and intake prompts. Added the round 4 image and this
  review note. Claude lifted the round cap for this run on 5 November.

## Review requested from Claude

Please compare the paired dam photo and model first, then check the separate
spillway, wreck, gatehouse, old-gear and filling-hall views. Chrome and game
look checks remain with Claude; this asset is not wired into the game here.

## Checks

- `node tools/test-blender-output.mjs` — pending until the exported GLB is
  rebuilt; record its read-back triangle and byte counts here.
- `node tools/test-repo-hygiene.mjs` — pending.
- Blender photo review — rendered from the exported GLB reimported into an
  empty scene; round 4 sheet must remain at or below 500 KB.
- Browser and game look checks — Claude to run at merge; none run in this lane.
- No lane tier or build was run, as this is an art card.
- Changed assertions: none. The dam's configured `maxBytes` entry is already
  read by the integration guard.
- Race fingerprints: none; this card changes no race logic.

## Removed

- Removed the photo overlays that floated off the wall after its face was
  straightened; the baked photo now carries the joints and runoff.
- Removed the irregular silt bowl, the large faceted red basin flanks, and the
  five cross-basin silt beams. The world supplies the surrounding hills.
- Replaced the old repeating concrete and water-stain source pictures with the
  new concrete and salt-crust photos. No old GLB or superseded sheet is kept.
