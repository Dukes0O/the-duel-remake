# TOWN-HEALTH

The short board entry controls current state, ownership, dependencies and locks.

`src/town/town-health.js`, registered. Sickness from bad water, a latrine too close, crowding and cold. It starts where the cause is and spreads along who drinks from what, so the map shows the shape of it (the 1854 story, in play). The clinic treats people and needs clean water. People recover or leave. No one dies of the player's early mistakes; old age is TOWN-PEOPLE's. `tools/test-town-health.mjs`.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read sections 2, 3, 10, 11 and the checks in section 15 first. **This game is for years of play and years of building (Kyle, 5 November): no fixed limits on people, buildings, map size or years; content lives in data under `src/town/content/`; a town saved today must load in every later build.** A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Real numbers wherever a real number exists, and note the source of any you add. Every player-facing word is plain, in whole sentences, with no em dashes. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers

## Codex decided (Claude to review)

The town does not yet record which tap each household drinks from, where each
home sits relative to a latrine, or measured indoor temperature. For this slice,
daily illness pressure comes from the town's delivered water quality and volume,
latrine capacity, shelter capacity, and winter canvas homes. Illness can spread
within a household. The clinic treats up to 40 people per day when clean water
is available. This uses existing town data and can be replaced by local links
when those systems arrive.

The illness probabilities are gameplay tuning values, not measured medical
rates. The design provides no real-world disease rates to use.
