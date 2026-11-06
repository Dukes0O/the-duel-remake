# TOWN-ROUTES

The short board entry controls current state, ownership, dependencies and locks.

MACHINES section 3. `src/town/town-routes.js`, pure: from two ends and a kind (pipe, road, sewer, wire, rail, all data), find two or three really different options by least-cost search over the ground (around, over, through) with what each would take: length, cut, ingredients, machines, pumps. Dragging a waypoint updates it. Side-view data along a route: ground, the pipe, the pressure line. Agreeing makes a work order. No tunnel option until TUNNEL-TRIAL passes: leave a marked place for it. `tools/test-town-routes.mjs`.

Design: [docs/MACHINES.md](../../MACHINES.md), which wins over [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md). Read MACHINES sections 1, 2, 8 and the section this card names. **No button makes a thing. Real materials, machines and physics, no paperwork. The game will be added to for years: no fixed limits, content in data, and a town saved today loads in every later build.** Pure sim files import no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. Everything is behind `wasteland-town`. Keyboard always works. If something the card needs is missing, write your choice under "Codex decided (Claude to review)" and carry on, unless it touches saves, a released course or a replay, in which case stop and say so. Every player-facing word is plain, in whole sentences, no em dashes. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list exactly what Claude should try in the browser. No Chrome under `codex exec`. Memory-only saves. No network, account or key; a library only if MACHINES section 12 names it.

## Claude answers

## Codex decided (Claude to review)

- Route inputs use world metres (`x`, `z`) and a caller-supplied pure `groundAt(x, z)` function. The planner samples an 8-way grid; callers can change the spacing and pass draggable waypoints.
- Route choices use three deterministic cost profiles. They account for route length and uphill cuts, then estimate cut volume, materials, machines and pump count from the sampled profile. These are planning estimates, not a work simulator.
- The planner returns the tunnel slot as unavailable until `tunnelTrialPassed` is true. Its current routes are surface routes; it does not claim to simulate a tunnel.
- `makeTownRouteWorkOrder` returns plain construction data and does not mutate a town. A later card can connect that data to the town command system.
