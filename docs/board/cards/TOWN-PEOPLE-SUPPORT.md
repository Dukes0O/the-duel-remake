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

Claude, 6 November: **how homes work, settled (design in `docs/WASTELAND_TOWN.md` section 3: "You paint ground for homes and shops and people build there themselves").** No such tool exists yet, though Chapter 4 already asks for it.

1. **Painting.** A paint tool in the Homes and Shops menu: drag across clear ground and each 8 m cell becomes a home plot, with the same drag feel as `src/town/ui/town-route-tool.js`. Painting is free and can be undone on any empty plot. Roads, pipes and buildings cannot be painted over. Sim command `paintHomeGround {cells}` and `clearHomeGround {cells}`. Store plots in the town in a form that holds no fixed limit.
2. **People build.** A household in canvas with a free plot moves onto it and builds with its own hands, taking goods from the nearest store. Tent: canvas 20 kg, 2 days. Shack: tin 40 kg and timber 30 kg, 10 days. Tin stack: tin 120 kg and steel 60 kg, 30 days. Container home: steel 400 kg, 60 days. Brick home: brick 2,000 kg and timber 200 kg, 120 days. Short of goods, the plot waits and the Reports panel says so in a sentence ("Shacks going up, 3 of 8. Short of tin."). Moving up a tier keeps the existing rule: six supported months with good mood.
3. **Places.** Founders' camp: 12 places, always, in canvas. A plot's places by what stands on it: tent 4, shack 4, tin stack 8, container home 16, brick home 8. `shelterPlaces` is the camp plus the plots. `paintedHomePlaces` counts homes standing on painted plots. A plot under way gives nothing yet. A burned plot gives nothing until it is rebuilt: fire, when it reaches a plot, works as it does on a building, and the family goes back to canvas.
4. **Newcomers** arrive only when there is water for them and a free place, so a player who paints plots and keeps the goods coming sees a town grow, and one who does nothing keeps the twelve.
5. **What you see.** Each plot draws its home from `public/assets/models/wasteland/town/homes.glb` by tier (`tent-a`, `shack-a` and so on, chosen from the plot's position so a street varies), with the scaffold stages while it goes up, and painted empty plots show pegs and string.
