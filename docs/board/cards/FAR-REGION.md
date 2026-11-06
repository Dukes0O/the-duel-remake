# FAR-REGION

The short board entry controls current state, ownership, dependencies and locks.

The Far Side as a new region, in files of its own under `src/world/far-side/`: its ground, the Long Bottom's mud as a ground material, the river, the Top Pond and places matching section 5's data, scene from WW-ART-FAR. The join: a car in the tunnel's ring-lit stretch comes out on the other map with speed and damage carried over, as section 2 and section 6 say. `editable`, so machines work here. Before `far-side-open`, the Scablands and every replay stay as they are. Add it as data, so more regions can follow by the same route.

**Checks:** `tools/test-far-region.mjs`: a headless car crosses the join both ways with speed kept; mud slows a narrow tyre more than a wide one; every place in the job data sits on the ground. Claude plays it and checks frames.

Design: [docs/story/the-far-side.md](../../story/the-far-side.md) and [docs/MACHINES.md](../../MACHINES.md). A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Every player-facing word is plain, in whole sentences, with no em dashes, and comes from the story page. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
