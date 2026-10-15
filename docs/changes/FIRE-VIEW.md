# FIRE-VIEW: drawing H2 Fire

Card: FIRE-VIEW (Claude, UI lane; holds `busy-game-files` for its one
renderer line). Design: `docs/HELI_FIRE.md` sections 6.1, 8.4, 9 and 14;
the burnt-course answers on `docs/board/cards/FIRE-VIEW.md`.

Needs: FIRE-HOOKS (this lane is cut from it and merges after it),
HELI-FIRE-BUCKET, FIRE-ART-FX and FIRE-BURNT-LOOK (all merged). The H1
dependency is met by HELI-FINISH's code at 64198f94.

## What changed

- `src/heli/heli-fire-view.js` (new, drawing only): flames, embers, smoke,
  steam and falling spray as sprites from the fire atlas
  (`public/assets/heli/fire-fx.png`, FIRE-ART-FX). Flames sit and flicker
  by each cell's own number, more and taller where hotter; smoke rises and
  leans downwind, thick grey-brown at the base; steam rises where water has
  just cooled a cell; spray follows each falling parcel. Hotter cells are
  drawn first, so the cap trims the faint edge: at most 400 sprites on High
  and 200 on Performance. The bucket model (`fire-bucket.glb`) hangs at its
  ring with the clean or crumpled body by damage and the water disc by fill;
  the aim ring is a 12 m ring, white, orange when locked. Nothing loads
  until a fire or the bucket first shows.
- `src/heli/heli-scene.js`: the helicopter view carries the fire view; the
  cable ends at the bucket's ring.
- `src/burnt-look.js` (new, outside `src/heli/`): the burnt course on the
  drawn pines, in races and from the air. On burnt trees the crowns go and
  the trunks turn charcoal (linear 0.012, 0.011, 0.010); about one tree in
  six becomes a snag (tall, broken or leaning) or, now and then, a fallen
  log from `burnt-props.glb`; the forest floor over burnt cells gets the
  stage's ground (`ground-black`, `-shoots`, `-fireweed`) draped on the
  course's own ground; shoots and fireweed clumps by stage; thin smoke on
  days 0 to 2. The whole course for a burn, cell by cell for scars and for
  the fire being fought. A healed course is put back exactly as it was.
- `src/render3d.js` (`busy-game-files`, one line): each frame the burnt look
  is given the drawn course and `app.fireLookFor(courseId)`, and the fire
  view the graphics quality.
- `src/app.js`: `fireLookFor(courseId)` (stage, smoke, scars and the live
  fire's burnt cells; null when normal, and always null with the switch off).
- `src/heli/heli-fire-run.js`: the view's fire picture also lists each
  burning and burnt cell's middle and ground height, and the wind's
  direction.
- `src/heli/heli-ui.js`, `heli-ui.css`: the fire line under the instruments
  ("FIRE 045° 0.8 km · 40% out · wind NW 7"), the answer prompt with its
  seconds, "Bucket: full" (orange when the ring locks), "POUR (hold) H"
  with the bucket on, and notices for the call, answer, bucket, fire out
  and fire lost.
- `tools/scenarios/fire-view.mjs` (new): the browser look and frame check.

## The packet's 60-cell fire

Since FIRE-SPREAD's tuning a fire is lost at 45 cells, so a 60-cell fire
cannot burn. The frame check flies over the biggest fire that can: 44
cells, grown by the game's own rules.

## Tests

- `node tools/test-fire-view.mjs` (new): 50 checks, loading the real props (the bucket model's
  nodes; no download before a fire; the sprite caps on High and Performance
  for a 60-cell picture; a fresh one-cell fire a few sprites; another
  course's fire not drawn; the same frame drawn the same; the bucket's body,
  dent and water by fill; the aim ring's place and colours; the cable end;
  the fire line, prompt and notices; the burnt look's crowns, charcoal,
  snags, healing back exactly, scars by cell, stages by cell).
- `test-heli-view` (98), `test-heli-mode` (150): passed.
- Browser look and frame check, lane tier and build: below.

## Files beyond the card's list (for the Director)

The card names heli-fire-view.js, heli-scene.js, heli-ui.js, heli-ui.css and
burnt-look.js. Drawing the fire also needed: `src/render3d.js` (one line
each frame, under `busy-game-files`, which this card holds), `src/app.js`
(`fireLookFor`, the look for the course being drawn), `src/heli/heli-fire-run.js`
(FIRE-HOOKS' file: the fire picture lists burning and burnt cells and the
wind's direction for drawing), `tools/test-heli-mode.mjs` (the drawing file
list), and the new test and browser scenario. None of them changes race
state. Please confirm the re-slice when merging.

## Review

One independent review (rule 17). Fixed: the burnt look placed from the
pines' own positions (no ground sampling, so no stall and nothing on the
road); every mesh of a prop drawn (fireweed's petals); a knocked-down burnt
tree keeps its crown off; a tree becomes a snag only once the snag is in;
shared art kept; the trunks' colour readied when a fire starts; the fire
layers hidden and uploading nothing with no fire or bucket; the aim ring
drawn over slopes; the app remembering the look while the save is
unchanged; the renderer freeing the look and reporting its state; tests
with the real props; the browser check flying a drop, timing the fireweed
stage and failing over 18.5 ms. After it: thicker smoke at the base, so
the fire reads from straight above.

## Changed assertions

- `tools/test-heli-mode.mjs`: `heli-fire-view.js` joins the drawing files
  (the import guard's rules-file checks do not apply to drawing).

## Removed

Nothing.
