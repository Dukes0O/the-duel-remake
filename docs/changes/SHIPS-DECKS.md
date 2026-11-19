# SHIPS-DECKS: decks, ladders and the night storm

**What changed.** `src/world/deck-plates.js` is the table of still plates (three decks, Patience's mast top, three lighthouse landings, at the job data's heights) and seven ladders. With `climbs:true` an on-foot step (`steps/onfoot.js`) takes one press of F at a ladder's foot up and at its top down, counts a place on a plate only from that plate, points the marker at the next ladder, and turns a fall into the ground beside the ship with every place kept. The mode applies MULE-RAILS's `roofBoard` and a new `deckGround`, and keeps `fighter.deckPlate`, which a small hook in `src/onfoot.js` reads so the fighter can walk a deck and step off its edge. `weather:'dust-night'` is view only: `src/world/dust-night.js` reads it from the step, `dust-night-look.js` draws the beam and dust, and `render3d.js` adds night light and close fog. Sound: climbing up, climbing down and a fall play `vehicle.landing`. Behind `wasteland-town`.

**Checks.** `tools/test-deck-plates.mjs` (ladder, fall, plate heights against the story page's job data, storm and calm runs with identical state), `test-everburn-job2`, `test-onfoot`, `test-onfoot-transition`, `test-iron-line`, `test-rail-steps`, `test-world-jobs`, `npm run build`: pass. Lane tier on c3702d1 (current integration merged): 99 pass, 3 fail. `test-browser-scenarios` was this card's (60 scenarios with no area); `ships-` now joins the world area, and the rerun for that fix on 511e59e passed 18 of 19. `test-arsenal-runtime` needed a commit the shallow clone lacked; it passes once fetched. `test-full-check` fails on its Windows junction subtest, a laptop-only suite. The `ships-decks` browser scenario ran here in headless Chromium: 12 pictures, all facts pass.

**Changed assertions:** none.

**Owed:** the job-level `vehicle` field (`lendIfNone`, `src/world/jobs/job-vehicle.js`), after TOWN-VEHICLES merges. **For Claude:** `tools/scenarios/ships-decks.mjs` and the questions in `docs/board/questions/SHIPS-DECKS.md`.

**Removed:** nothing; this card replaces nothing.
