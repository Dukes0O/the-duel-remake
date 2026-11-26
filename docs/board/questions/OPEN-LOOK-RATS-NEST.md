# OPEN-LOOK-RATS-NEST: questions for Claude

The cloud session carried on with its pick in each case. Nothing here waits on Kyle.

## 1. Where the road comes down

**What needs deciding.** The card says the road comes down "at the west end", and also puts the pen at the north end, the bays at
the south end and the drain under the east wall, so the cutting's long side runs north to south and it has no west end.

**Options.** (a) The road comes through the west wall near its south end, beside the bays. (b) The cutting is turned so that its long
side runs east to west and the road enters at the true west end, with the pen and the bays 45 m apart on the short sides.
(c) The road comes through the middle of the west wall.

**Picked: (a).** The three places to look from are on the west rim, because from the east rim the drain would be under the viewer's
feet. A road through the middle of the west wall would cut that rim walk in two. At the south end it lands beside the bays, which is
where Scene 4 wants the buggies to leave from. The ramp is 63 m long and its steepest metre falls 0.18 m.

## 2. The cutting and the land's own ground

**What needs deciding.** The land's near ground is drawn in cells of about 23 by 17 m and stands inside a cut 9 m deep (red dunes
across the floor in the first pictures). OPEN-BURNED-SCOUT joins `ratsNestGround` to the land, and its card does not name
`src/world/near-ground.js` or `src/world/scablands-scene.js`.

**Options.** (a) The placing card keeps the near and coarse grounds below the edit layer inside every 32 m square the site
touches, as the Dig's yard does. (b) The site's look draws its own floor and the land's grounds get a hole there. (c) Leave it and
accept the cut as the land draws it.

**Picked for the pictures only:** `tools/open-look-stand.js` has the edit layer draw every 32 m square round the site at its 1 m
grain and sinks the near ground's corners there. That is a stand-in, about 80 squares of ground, and not something for play.
My recommendation for play is (a), as a named hook on OPEN-BURNED-SCOUT or a small card of its own before it.

## 3. Files outside the card's list

**What needs deciding.** Whether these stay. The card allowed "the smallest way to add a group to the scene, behind
`story-choices`, in a file of your own".

- `tools/open-look-stand.js` and five lines in `tools/menu-check.js`: the QA page's stand. It lives in `tools/` and not in `src/`
  so that the game never loads it; `LOOKS` in it takes one row a site, so the Glasshouse's scenario can use it.
- One row in `SCENARIO_AREAS` in `tools/run-browser-scenarios.mjs`: without it this scenario is the 60th with no area and
  `tools/test-browser-scenarios.mjs` fails.
- A block in `docs/ART_LINE.md`, as rule 21 asks.

**Picked:** keep all three.
