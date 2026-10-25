---
task: MAP-VIEW
status: review
kind: feature
flag: pilot-map
player_facing: yes
---

# The pilot's map screen, scouting names, signs and the Table (25 October 2026)

Card `docs/board/cards/MAP-VIEW.md`, design `docs/PILOT_MAP.md` sections 2, 3 and 5. Behind `pilot-map` (dev), and only with
the helicopter on. With `pilot-map` off nothing changes: the session is created without `pilotMapEnabled`, so the view carries no
`secrets`, `scout` or `destinations`, and no key, button, sign or label exists (pinned in `tools/test-map-view.mjs`).

## What it adds

- **The map screen** (`src/heli/pilot-map-view.js`, `pilot-map.css`): a chart drawn on a 2D canvas from `pilot-map-data.js` and the
  generated outlines: paper, sea with depth lines, forest, desert, city and lake tints, mountain contours with heights, rivers,
  the dashed roads between towns, every course outline in ink (grey when not owned, black when burnt), names, pump signs with
  the price, special cars where they stand, today's jobs (a line with the pay, heavier for the one in hand), found secrets
  (a star by their course), "?" for the Table once seen (its name once found), your helicopter pointing the way it faces, the
  tank's reach as a dashed ring, a 5 km scale bar and a north arrow. With the Lab's moving map (`labOf(profile).owned['moving-map']`)
  there is a 5 km grid and the bearing and distance from the helicopter to the place pointed at. `mapModel` (plain data),
  `hitPlace`, `placeNote` and `drawChart` are exported and tested without graphics.
- **Choosing a destination:** a click on a place calls `app.heliMapPick`, which sets it through the session (`setDestination`),
  exactly as the board's buttons do, and plays `map.pin`. A place with no landing zone (Ardennes Forest), or where you are, says so.
- **Opening it:** the dispatch board's **Pilot's map** button at any pad (`atAnyPad`), a **Pilot's map N** button in the FLY TO panel
  (the board sits far down the side panel and was out of sight in the browser), and the key **N** in flight (free: the
  helicopter's keys are Esc, H, P, C, M, Enter, R and the held W S A D and arrows). **Esc closes the map first**, then pauses as
  usual. The cockpit's key line shows `MAP N`. The flight keeps running behind the map (a chart held in the hand).
- **The map never changes helicopter state** except the destination: opening, closing, drawing and hovering read the frozen view;
  the pick goes through `session.setDestination`. The test compares the helicopter, destination, fuel and credits before and after.
- **Scouting:** over a course you own, each corner's name (or number) hangs as a label over the corner for that flight
  (`view.scout`, MAP-DESTINATIONS), drawn as sprites by `src/heli/pilot-map-world.js` (new, drawing only).
- **The signs:** each sign still to be found (`view.secrets.signs`) is drawn from its MAP-ART model at its place on the ground
  (`sign-logging-arrows`, `sign-start-grid`, `sign-fire-pits`, `sign-chalk-line`, `sign-lighthouse-window`), turned against the lap where the
  sign says "the wrong way round"; a found sign is taken off the ground.
- **The Table:** on `the-table` the course last loaded steps aside (`world.visible = false`, one line in `render3d.js`) and the
  Table is drawn from `createTableWorld()`'s own rules: a flat desert at the floor, the mesa model fitted to the rules, the dirt strip laid
  on the rules' oval, the lookout and the wreck where the rules put their obstacles, and the logbook in the lookout's cab. The
  **logbook's last page** (1966, "Red car on the bottom off the Pacific cove...") shows as a card while the helicopter is on the Table
  once the Table is found.
- **Wiring** (`src/app.js`): `pilotMapEnabled` and `secretCourses` (the secret variants whose own switches are on) are passed to the session;
  `heliMapOpen`, `setHeliMap`, `heliMapPick`, `heliMapAvailable`, `heliMovingMap`, `heliGroundHeight`; the map closes when the visit ends.
- **Sounds** `map.open`, `map.close`, `map.pin` (`heli-audio.js`, sound bank behind the helicopter switch) and the existing `heli.found`. See question 1:
  the three are synthesised (noise and tones), not catalog rows, because the library sounds are on the laptop; the laptop may render
  library versions for the same ids.
- **Browser scenario** `tools/scenarios/map-view.mjs` (private port, memory-only): the Map button on the board, a drawn chart with the
  flight running, a real click on Panorama Ridge setting the destination, N and Esc, the FLY TO panel's button, a cruise there, the corner names
  of an owned course, and a cruise to the Table (seen in the save).

## Files beyond the card's hooks (each is a few lines in a block marked MAP-VIEW)

`src/heli/pilot-map-world.js` (new: the world drawing, a second file beside `pilot-map-view.js` so the renderer hook stays small),
`src/heli/heli-board.js` (the board's Map button and its action), `src/input-contexts.js` (the key), `src/heli/heli-audio.js` (three cues),
`src/heli/heli-ui.css` (one `@import`). The board's button is the card's own words ("the dispatch board's Map button").

## Tests

`tools/test-map-view.mjs` (136 checks): the key and that it is free; the three cues in the sound bank; switch off (nothing of the map in
the view, no button, no key, N opens nothing); switch on (the Map buttons, the cockpit key line, the controls help); N, Esc and the second Esc
(open, close without pause, pause) and N doing nothing while paused; the model (every place but the unseen Table, ownership, pump prices,
the old 25 kg leg and the 290 kg leg, Ardennes drawn but not a destination, the stadium as `titan-arena`, reach follows the tank, the leg
beyond it marked, burnt, found, special cars, jobs, bearings); hit test and the chart's two-way mapping; the chart painted on a recording
context (more than 800 calls; names, prices, scale, north, contour heights, tank ring; no Table until seen); a pick (the destination, the
pin sound, no fuel or credits spent, a no-landing place refused); the page panel with a minimal document (hidden, shown, clicks on a place and on
open sea, the close button, no flight); the world on a real three.js scene graph with stub models (signs on the ground and turned,
a found sign removed, corner names made once and hidden off an owned course, the Table built once and hiding the course, the mesa fitted to the
rules' top and floor, the lookout where the rules put it, the logbook in its cab, the strip on the rules' oval); the nine models exist.

## Changed assertions (none loosened; each needs Claude's written review, rule 18)

- `tools/test-heli-audio.mjs`: the exact list of tone cues gains `map.open`, `map.close`, `map.pin`, and the bus table their entries (pure additions).
- `tools/test-heli-mode.mjs`: the `drawing` set (files exempt from the rules-file purity check, which forbids `document`) gains `pilot-map-view.js`
  and `pilot-map-world.js`, which draw. No hook list changed: no other source names a `heli/heli-*` file it was not allowed to (`render3d.js` gets
  its ground height from the app, not by importing `heli-ground.js`).

## Checks

Run once in the cloud (Linux), on the branch merged with the current `integration/wasteland`:

CHECKS_PLACEHOLDER

## Removed

Nothing.
