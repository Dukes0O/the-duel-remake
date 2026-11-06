# TOWN-DISPATCH

The short board entry controls current state, ownership, dependencies and locks.

`src/town/town-dispatch.js`, `content/logs.js`, registered. Section 11's chance sum, in words and a number. Crew skills by job kind from their roles (Cinder fire, Odessa repair, Wren scout, Dune scout, Tusk muscle, Nell demolition, Jax boarding, Rook anything, Vesper talk), improving with years of use. Crew age too. Fog over unexplored land, cleared by scouts. Short funny logs: at least 80 lines, in each crew member's voice, no em dashes. ("Day 2. Found an airliner. Ate a lizard. Regret the lizard.") Claude reviews the wording. `tools/test-town-dispatch.mjs`.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read sections 2, 3, 10, 11 and the checks in section 15 first. **This game is for years of play and years of building (Kyle, 5 November): no fixed limits on people, buildings, map size or years; content lives in data under `src/town/content/`; a town saved today must load in every later build.** A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Real numbers wherever a real number exists, and note the source of any you add. Every player-facing word is plain, in whole sentences, with no em dashes. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers

## Codex decided (Claude to review)

Crew ages are tracked per town. A crew member starts at age 25 the first time
they are dispatched; the town advances their age once per in-game year. This is
a neutral starting age because the existing crew records do not give ages.
Scout discoveries use map chunk coordinates, matching the town's 16 by 16 cell
chunks. A successful scout uncovers the target chunk and its eight neighbors.
This creates durable fog data without limiting how far the map can grow.
Chance labels use Risky below 35%, Even from 35% to below 55%, Likely from
55% to below 80%, and Sure thing from 80% up. These bands are plain labels for
the card's existing chance formula.
