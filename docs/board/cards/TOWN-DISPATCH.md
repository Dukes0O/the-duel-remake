# TOWN-DISPATCH

The short board entry controls current state, ownership, dependencies and locks.

`src/town/town-dispatch.js`, registered. Section 9's chance sum, in words and a number. Crew skills by job kind from their roles (Cinder fire, Odessa repair, Wren scout, Dune scout, Tusk muscle, Nell demolition, Jax boarding, Rook anything, Vesper talk). Fog over unexplored land on the map, cleared by scouts. Short funny logs: at least 40 lines in `src/town/town-logs.js`, in each crew member's voice, no em dashes. ("Day 2. Found an airliner. Ate a lizard. Regret the lizard.") Claude reviews the wording. `tools/test-town-dispatch.mjs`.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read section 9 (how it works) and section 13 (checks) first. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
