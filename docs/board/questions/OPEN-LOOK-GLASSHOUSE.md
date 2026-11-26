# OPEN-LOOK-GLASSHOUSE: questions

Written by the cloud session on 26 November 2026. Each has the pick the work went on with. Claude answers by message,
and this file is deleted when the card merges.

## 1. Is the water cart driven by a motor or pulled by a goat?

- **What needs deciding.** This card says the cart is "small, three-wheeled and motor-driven". The words in
  `docs/board/cards/OPEN-SITES.md` say a goat pulls it (Finch: "it goes at the speed of the goat that pulls it";
  Marigold: "brought the goat cart out"). Section 21 says only that the buggies were "pulling a cart".
- **Options.** (a) Motor-driven, as this card says, and the two lines are changed by the card that owns them.
  (b) Goat-pulled: the engine comes off and shafts go on, in round 2.
- **Pick: (a).** It is drawn with a small engine under a tractor's seat, a tiller, and a tow eye at the front, which is
  how six buggies could drag it away. No goat is drawn. The lines are OPEN-SITES's to settle.

## 2. How does the scenario put the camp into the page?

- **What needs deciding.** Nothing in the game draws a site yet, and the QA page gives a scenario no way to load a file
  of the game by name. The card allows "the smallest one behind the switch `story-choices` in a file of your own".
- **Options.** (a) The scenario bundles the look file itself, as `tools/scenarios/tollkeeper.mjs` bundles its helpers,
  and loads it into the page as a module of its own. No shared file is touched. The bundle carries its own copy of
  Three.js (0.4 MB after unused parts are dropped). (b) Two lines in `tools/menu-check.js` that load the look behind a
  query word and the switch. One copy of Three.js, but every cloud look card would edit the same lines of a shared file.
- **Pick: (a).** It stays inside this card's three files. The pull request says what a run of it showed.

## 3. What does the burned camp's smoke belong to?

- **What needs deciding.** Scene 1's dark column "stands where the Glasshouse is" for a day and a half. The card's table
  for `burned` lists no smoke.
- **Options.** (a) The look draws none when burned, and the thread stands its own column. (b) The look draws it while
  `fresh` is true.
- **Pick: (a),** so that two columns never stand in one place. `GLASSHOUSE_LAYOUT.things.tent` is where it belongs.

## 4. What is a named spot, when the thing it is named after is solid?

- **What needs deciding.** The check asks that every named spot is clear of every solid, and `pump`, `stove`, `tent` and
  `cart` are named after solid things.
- **Pick.** A spot is where a person stands at the thing (for `pump`, where the wrench is held; for `lamp`, at the
  tent's mouth beside the lamp in the ash). Where the thing itself stands is in `GLASSHOUSE_LAYOUT.things`.

## 5. How far must the smoke and the glint be seen?

- **What needs deciding.** OPEN-SITES draws the tell "from 1,500 m". At the first position the nearest road (the Salt
  Road) is 1,033 m away, where the whole camp is a few pixels wide.
- **Pick.** The stove's smoke is a thin pale thread 50 m tall, and a glint keeps about the same size on the screen
  however far off the viewer is. In the pictures taken in the cloud (see the pull request) the glint reads from 250 m by
  day, and the smoke does not read from the road at dusk: the land's haze takes it. A thicker, darker column would read,
  and would no longer be thin pale smoke. So the far tell is left for OPEN-SITES, which draws it "from 1,500 m", or for
  round 2; both are one line each in the look file.
