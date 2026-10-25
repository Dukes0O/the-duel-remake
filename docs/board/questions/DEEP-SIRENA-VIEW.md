# DEEP-SIRENA-VIEW: questions for Claude

Cloud session, 25 October 2026. Each question has the pick this session is
building with; reverse any of them in review.

1. **Two small hooks outside the card's list.**
   - The dive's 3D scene is private to `createDeepView` in
     `src/deep/deep-ui.js`. Drawing the wreck, the parts, the bags and the
     drop needs a few lines there: an optional `createExtras({scene, zone})`
     that the visit builds, updates each frame and disposes with the scene.
   - The DOM layer for the dive (sonar ring, Ana's caption strip, the log
     card, the Coast Cup title card) mounts in `src/screen-router.js`, the
     same way the Deep choice dialog does. That needs one import, one create,
     one update and one dispose line.

   F and R also need `src/input-contexts.js`: F is already the held
   `interact` key and stays as it is; R becomes `deep-ping` in the car
   context. R is free there, and the action does nothing unless the car is
   under water. On a gamepad, B (button 1) pings and X (the existing
   `interact`) lifts.
   **Pick:** add these small hooks, each marked DEEP-SIRENA-VIEW.
2. **Where the story steps.** The Sirena and the log step in `game.js`,
   right after the dive step, only in the `underwater` phase. A headless
   duel (tests, scenario) plays the story with no screen. `startCampaign`
   takes a `deepSave` snapshot (the player's `profile.deep`), so the story
   knows what is already raised and logged.

   The pay and save stay in `app.js`. It listens for `deepRaised`,
   `deepLogged` and `deepPearl` and calls `raiseFind`, `recordLogged` and
   `recordPearl`, with the same checks as the dive's own settlement (this
   run, this player, switch on). **Pick:** as above.
3. **When Ana speaks (6.2 and 6.7),** one line at a time, in order:
   - `hello` then `legend`: the first dive (no coast found before this dive);
   - `badge`: the badge comes up;
   - `sonar`: the first ping of a dive while no part is raised yet;
   - `bag`: the first time within 10 m of a part that can be bagged, while no
     part is raised yet;
   - `part`: each part raised;
   - `deep`: when the fifth light piece is up;
   - `car`: the first time within 10 m of the Sirena while she can be bagged;
   - `raised` then `lab`: she comes up;
   - `norseman`: on the way back up the ramp after the dive in which the
     first part was raised;
   - `cup`: with the Coast Cup title card;
   - the log lines: from DEEP-LOG's `phoneLineFor`.

   A line never plays over a title card. It waits until the card has gone.
   The only title card in the game is the Coast Cup's: the place title cards
   of section 4 (`deepPlace`) are not built by any card yet. **Pick:** as
   above, and a small card for place titles if you want them.
4. **Sounds.** DEEP-AUDIO (four story cues) has not merged, so this card
   emits the events and plays only Ana's lines and the existing `deep.logged`
   and `deep.pearl`. DEEP-AUDIO maps its cues to these events:
   - `deepSonar`;
   - `deepLift`, `deepLiftCancel`;
   - `deepRaised`.

   **Pick:** as above.
5. **The garage.** The game never lists the Sirena among the garage cars
   (`isShownCar` leaves it out until LAB-RESTORE). So her place is one
   garage panel, under the dive kit:
   - `waiting`: a red car shape under a drawn sheet, "Needs the Lab";
   - `restored`: "Restored · race the Coast Cup at Pacific Canyon";
   - `cupDone`: the plaque, "Coast Cup, 1966 to 2026: finished".

   **Pick:** as above. LAB-RESTORE may later move the plaque onto her own
   car page.
6. **The drop beyond the Drop-off lip.** No zone data covers it, so the view
   draws a near-black cliff face falling away along the lip's seaward side,
   and a deep dark band beyond it, so the lip reads as a drop into dark
   water. **Pick:** as above, judged from the scenario's pictures.
7. **Frame time.** This cloud machine has only a software graphics device, so
   its frame times mean nothing. **Pick:** the change note says so, and the
   laptop measures the forest view.
