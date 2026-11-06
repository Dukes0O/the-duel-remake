# TOWN-PEOPLE-SUPPORT

The short board entry controls current state, ownership, dependencies and locks.

Found by TOWN-PACE on 6 November: `src/town/town-people.js` reads `town.peopleConditions.shelterPlaces`, `paintedHomePlaces`, `waterLitresPerPerson` and `waterNeedLitresPerPerson`, but only tests write the first three, and `town-weather.js` writes a water need under a different name. So in a real town no newcomer ever arrives and nobody counts as housed or watered. Food is connected (`town-food.js`).

Connect them, in a registered pure system (`src/town/town-support-people.js`, or the system that already owns each fact), read each month:

- `shelterPlaces` and `paintedHomePlaces` from finished homes and their beds, using the homes table in `src/town/content/`. A home being built, burned or ruined gives nothing. The founders' camp gives the first twelve places.
- `waterLitresPerPerson` from the water actually delivered: wells and pipes as measured by the water system, shared by the people served. A dry well gives nothing. Connect `waterNeedLitresPerPerson` to the summer need so the two names agree.
- Whatever else `hasMeasuredSupport` asks for.

No number is set by hand, and a player's work is what changes these. A town saved before this card gains them on its first month and loses nobody on that month. Reads do not change the town: a look-only visit stays look-only.

`tools/test-town-people-support.mjs`, using `dispatchTownCommand` and `stepTown` only: a new town with no work keeps its twelve and gets no newcomers; finishing homes and a working well brings arrivals; burning those homes stops arrivals and moves people to canvas; a dry well lowers water per person; an old save loads. Then finish TOWN-PACE on top: rewrite `followNextAndBuildStarterSupport` in `tools/test-town-pace.mjs` on `codex/town-pace` so its player builds real homes and food with real commands and sets no conditions by hand, and tune `src/town/content/pace.js` to section 2 of `docs/WASTELAND_TOWN.md`: about 30 people through the first winter (TOWN-PACE's hand-set run reached only 20 to 21) and about 100 by Year 2.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md). A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Memory-only saves. Run the card's own checks, every `tools/test-town-*.mjs` that imports what you change, and `npm run build`. Claude runs the lane tier and browser checks. Write `docs/changes/TOWN-PEOPLE-SUPPORT.md` with a Removed section.

## Claude answers

