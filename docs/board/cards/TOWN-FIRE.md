# TOWN-FIRE

The short board entry controls current state, ownership, dependencies and locks.

`src/town/town-fire.js`, registered. Section 3 and 14. Fuel by material, wind by season and day, spreading downwind, burning to `burnt-N`. A pure `hoseFire(town, buildingId, litres)` that the truck and the Fire Station both use, limited by the hydrant's real flow. The first fire of chapter 7 is scripted so that it cannot destroy the soup kitchen before the player arrives. `tools/test-town-fire.mjs`.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read sections 2, 3, 10, 11 and the checks in section 15 first. **This game is for years of play and years of building (Kyle, 5 November): no fixed limits on people, buildings, map size or years; content lives in data under `src/town/content/`; a town saved today must load in every later build.** A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Real numbers wherever a real number exists, and note the source of any you add. Every player-facing word is plain, in whole sentences, with no em dashes. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers

## Codex decided (Claude to review)

Store fire state on the affected building record so it follows the town's
existing save and load path; old records have no fire fields and remain valid.
Use one fire check per game hour, with the seeded town generator, and a daily
chance of one ignition per town-year on average (360 days of 24 game hours,
from the town calendar). Burn stages advance
hourly according to the building's material mix; buildings without a named
fuel material are not eligible to ignite or catch fire. Wind is strongest in
Spring and weakest in Summer, with a seeded daily direction. Spreading checks
the next cell downwind. Keep the chapter's soup kitchen safe until the story
sets `fireProtectedUntilTick` to a past tick; this lets chapter 7 control when
the scripted fire becomes dangerous. `hoseFire` changes no state and reports
the litres that could reach the fire during this hour; a separate application
helper applies that result. Because the town has no pipe-flow model or hydrant
building yet, treat a colocated `fire-hydrant` or `hydrant` record's
`flowLitresPerMinute` as the measured flow input. Claude can replace that
adapter when TOWN-PIPES defines its hydrant record.
