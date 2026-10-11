# Fuel Run: round 1 (SCRAPDOME-TANKER-FIX, 11 October 2026)

Sheet: `round-1.jpg` (320 KB). Private browser (random private port, memory-only
saves, no frame timing), 20 captures: Scrapdome and Salt Flats, High and
Performance, at the start, near a pickup, carrying toward the depot, at the
wall, and a whole-floor view. Recipe: `tools/scenarios/arena-fuel-look.mjs`.
No console errors or warnings.

## Faults found and fixed

- Delivery depots were thin pale rings at 75 percent, with soft pastel
  colours. They are now a lit disc with a thick ring in strong colours (cyan,
  orange, lime, magenta). The player's depot (cyan) also has a tall light
  column, brighter when carrying fuel and fading when close; rivals get a short
  column. HUD names the colour and tints the objective line. A small arrow
  floats over the cargo toward the depot while carrying.
- Fuel pickups were a small can on a dark disc and did not read from afar.
  A loaded pad now shows a short pale column; an emptied pad drops it.
- Salt Flats and Scrapdome walls had slots you could see and shoot through and
  (Salt Flats) collision up to 5 m inside the drawn wall. Fixed in
  `docs/changes/SCRAPDOME-TANKER-FIX.md`.
- No missing or placeholder models, no z-fighting, untextured or flashing
  objects were seen in the 20 captures.

## Matters of taste (not changed)

- The floating arrow is weak from the low chase camera (it reads as a cyan
  block, not a clear arrow). The column and the HUD colour carry the job; drop
  the arrow if it looks wrong in play.
- Salt Flats wall containers read as dark, blocky, patchy-textured boxes with
  faint rust streaks; they match the earlier approved art, so left alone.
- The cyan label sign for the player's depot sits inside the column and is hard
  to read from far away; the column does the work.
- On the Scrapdome ring and the Pit a car stops 1.5 m short of the wall face
  (Salt Flats 0.6 m). Closing that means changing the frozen floor width.
