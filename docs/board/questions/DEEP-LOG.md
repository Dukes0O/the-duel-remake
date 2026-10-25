# DEEP-LOG: questions for Claude

Cloud session, 25 October 2026. Each question has the pick this session is
building with; reverse any of them in review.

1. **Running the log during a dive needs files this card does not hook.**
   The log has to step inside the underwater dive (`src/game.js`), pay and
   save (`src/app.js`), and show the picture card and Ana's caption on screen.
   Those are busy-game-files, held now by GP-PASSING-2, and the card's hooks
   are only `screen-garage.js` and `paint-presets.js`.
   **Pick:** this card builds everything that does not need those files:
   - the rules in `src/deep/deep-log.js`, with three calls for the wiring:
     `stepLog` each underwater frame, `recordLogged` and `recordPearl` to pay
     and save, and `phoneLineFor` to pick Ana's line;
   - the markup for the card that slides in during a dive;
   - the garage log page and the pearl-white finish.

   DEEP-SIRENA-VIEW is the one wiring card that holds busy-game-files, and it
   already wires the Sirena at the same dive step, phone captions and garage.
   Please add "wire the sea-life log (DEEP-LOG's three calls and its card)"
   to that card. It is a few lines beside the Sirena's.
2. **A "place" in the log is a coast.** Each coast is a page: Kelp Coast,
   Wreck Reef and Night Harbour. 6.4 says the Kelp Coast "has seven", and
   Ana's page line says "every animal on the Kelp Coast". Creatures go on a
   page by section 5's "Where" column:
   - Kelp Coast (7): sardines, green turtle, bat ray, sea lion, sea otter,
     kelp crab, gray whale;
   - Wreck Reef (6): reef fish, green turtle, manta, moray, grouper, reef
     shark;
   - Night Harbour (3): kelp crab, jellyfish, octopus.

   A creature is logged once and counts on every page it belongs to, so the
   turtle and the crab each count twice. Each page pays 250 once, when its
   last creature is logged. **Pick: as above.** A page appears in the garage
   once its coast is found (`deep.found`), so the other two coasts stay a
   surprise.
3. **Ana's page line names the Kelp Coast,** so it plays only for that page.
   Other pages use `deep.ana.log` until they have their own line.
4. **Pearl white** is earned from the save itself: all nine pearl ids in
   `deep.pearls`, for every car the player owns. It needs no switch argument,
   so the paint calls in `app.js` stay unchanged. A player who has earned it
   keeps it even if the switch goes off, because we never hide progress.
   Colour: a warm white with a soft sheen (`0xf1ede4`, metalness .25,
   roughness .28). **Pick: as above.**
5. **Pictures** are rendered from DEEP-ART-SRC's working models by a recipe
   tool (headless Chromium with the game's own Three.js) into small images
   in `public/assets/deep/log/`. A grey shape is the same picture darkened by
   the page's stylesheet. The otter has no model (its role is held), so its
   card shows the name and fact with no picture until DEEP-ART-FINAL. A
   comparison sheet goes to `docs/board/looks/deep-log/` for your verdict.
   **Pick: as above.** These are working pictures, like the models.
6. **Seeing a logged creature again** shows no card and pays nothing.
   **Pick: as above.**
