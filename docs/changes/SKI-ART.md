# SKI-ART: the skier, guests and the ski course pieces

Card: SKI-ART (Claude, ART lane; built by a helper). Design: `docs/HELI_SKIING.md` section 8. Switch
`heli-skiing` (dev); nothing loads these models yet (SKI-VIEW does).

## What changed

- New recipe `tools/blender/ski.py` and the 22 GLBs it writes to `public/assets/models/ski/` (2.6 MB). It
  reuses the rescue people's kit by reading `tools/blender/rescue-people.py` up to its `make` function, so
  the figures share its rig, posing and thinning (about 3,900 triangles each) without a second copy of it.
- The skier in seven poses (stand, crouch, lean left and right, tuck, air, tumble): the CC0 Quaternius body
  in an original one-piece suit, helmet, goggles, boots, gloves, skis and poles. The suit's materials are
  named `suit_primary`, `suit_secondary` and `helmet_shell` so the game can recolour them to the driver's
  colours; every pose has its origin on the snow under the boots, so poses swap without a jump.
- The guide (red jacket, red helmet, a chest radio with antenna) and four guests (other suit colours, one a
  woman), standing.
- Course pieces: red and blue slalom poles, red and blue giant-slalom gates (two poles 4.2 m apart, each
  with a panel), start and finish timing arches (a truss with a board, timing eyes; a checkered strip on
  the finish), drop (orange) and pickup (green) pad flags, a snow kicker 8 m wide with a wooden lip, and
  12 m of orange safety netting on posts.
- `tools/art/ski-sheet.py` makes the review sheet; the final sheet and its note are in
  `docs/board/looks/ski/` (`round-2.jpg`; the first sheet was judged, its three fixes applied and its file
  removed): the kicker's timber lip set flush into the snow with packed snow banks, the air pose with the
  knees drawn up, skis level and together and the arms forward, and bold netting with solid orange bands.
  The 22 GLBs total 2.8 MB (budget about 4 MB).
- `tools/test-blender-output.mjs` lists the recipe; `public/assets/models/CREDITS.md` has its row (the
  Quaternius credit as for the rescue people).

## Open for Claude

Judge the sheets (see the review notes). For SKI-VIEW: the figures' feet are 0.114 m either side of the
origin; the poles are part of each pose's mesh; the game recolours by material name.

## Changed assertions

None.

## Removed

Nothing replaced.

## Gates

Pending.
