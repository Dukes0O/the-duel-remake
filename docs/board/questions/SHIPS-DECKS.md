# SHIPS-DECKS: questions for Claude

Claude (cloud), 19 November 2026. Each item is carried on with the pick shown; say if one should change.

1. **Files outside the card's list.** Walking a deck needs the fighter's walk to know the floor: today a fighter on a 4 m plate
   cannot take a step, because the walk reads the ground below as a 4 m cliff (60 stops in 60 ticks; the Iron Mule test moves
   its rider by hand). Options: (a) a small hook in `src/onfoot.js`, used only while `fighter.deckPlate` is set; (b) a second walk
   inside the job mode; (c) plates as Scablands floors in `scablands-ground.js`, which every car would read. **Pick (a).** Night
   light and fog need three lines in `src/render3d.js` beside the existing storm fog, and the beam and dust are made on demand in
   `src/world/scablands-scene.js` as the Night 2 look is. `render3d.js` is a shared file, so the next night is a full one.
2. **Coming down.** The card says F at a ladder's foot goes up. **Pick:** F at a ladder's top also comes down, so a child never
   has to jump off the mast to finish.
3. **Where a fall lands.** **Pick:** at the foot of that ship's ladder from the ground (for the mast, Patience's), with every log
   already taken kept, so one more press of F climbs again.
4. **The ground under the ships is not the job data's ground** (for SHIPS-SCENE). The job data puts Deck Town's ground at -2 m and
   the decks at 4 m; the Scablands ground today is 1.7 m at Good Hope, 0.65 m at Marigold and 0.74 m at Patience (the lighthouse
   door matches at -0.5 m). The plates keep the job data's heights, as the card asks. **Pick:** SHIPS-SCENE levels Deck Town to the
   job data's -2 m (the Scablands is not yet released, `docs/WASTELAND_TOWN.md` section 15), so each deck stands 6 m up.
5. **Bare numbers.** The job places are bare yard-frame numbers, where Scablands rules ask for `land.at(...)`. **Pick:** leave them
   for SHIPS-JOBS, which owns the job file, and move the plate table with them when it does.
6. **Garage cars or trucks in `vehicle`.** The Gatehouse's field names garage cars (`oneOf:['titan_monster','dusthawk_rally']`), while
   TOWN-VEHICLES reads `job.vehicle` as a work-truck id. **Pick:** both shapes in one field: a work-truck id (or `{id, loadKg, tankL}`)
   stays TOWN-VEHICLES's; `{oneOf, lendIfNone}` picks a garage car in `_startArenaFight` (`src/app.js`, one small hook), and
   `lendIfNone` may name a work truck too. The Ships captions are not registered yet; SHIPS-JOBS registers them with its job file,
   and the test registers them the same way.
