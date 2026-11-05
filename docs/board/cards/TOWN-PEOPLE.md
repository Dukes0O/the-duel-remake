# TOWN-PEOPLE

The short board entry controls current state, ownership, dependencies and locks.

`src/town/town-people.js`, registered. Section 3 and 11: arrivals, homes growing tier by tier on painted ground, stepping back, shops on painted ground, jobs filled, moods from the six needs, people leaving and coming back. Up to 300 people as small records with a name from a seeded list of Wasteland names (`src/town/town-names.js`, 80 first names, 80 surnames, plain and a bit funny). Each person's thought in one short plain sentence, from their worst need or their best ("The tap's too far.", "Best soup I've had this year."): at least 40 thoughts in `src/town/town-thoughts.js`, no em dashes. `tools/test-town-people.mjs`.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read section 9 (how it works) and section 13 (checks) first. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
