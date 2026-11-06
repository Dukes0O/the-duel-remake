# TOWN-ROUTES-UI

The short board entry controls current state, ownership, dependencies and locks.

`src/town/ui/town-route-tool.js`. Routes drawn on the real ground, options side by side, drag points, the side view under the map with the ground, the line and the pressure, in plain words. AGREE. Then flags appear on the ground, and the valve moment at the end: the camera follows the water down the pipe to the town.

Design: [docs/MACHINES.md](../../MACHINES.md), which wins over [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md). Read MACHINES sections 1, 2, 8 and the section this card names. **No button makes a thing. Real materials, machines and physics, no paperwork. The game will be added to for years: no fixed limits, content in data, and a town saved today loads in every later build.** Pure sim files import no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. Everything is behind `wasteland-town`. Keyboard always works. If something the card needs is missing, write your choice under "Codex decided (Claude to review)" and carry on, unless it touches saves, a released course or a replay, in which case stop and say so. Every player-facing word is plain, in whole sentences, no em dashes. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list exactly what Claude should try in the browser. No Chrome under `codex exec`. Memory-only saves. No network, account or key; a library only if MACHINES section 12 names it.

## Claude answers

## Codex decided (Claude to review)

- `src/town/ui/town-route-tool.js` owns a pure model and markup renderer plus delegated keyboard and pointer controls. The host supplies route ends, kind, `groundAt` and tunnel trial state; the tool uses `planTownRoutes` and keeps all measurements in world metres.
- The map shows the real ground profile and the three route choices. Every supplied waypoint is draggable and replans every option; when there are none, a midpoint handle can add the first one. The lower profile shows ground, pipe or route depth, and pressure for pipes.
- Agreeing returns `makeTownRouteWorkOrder` data and the sampled route points for survey flags. The tool does not mutate town state. After the host reports the pipe laid, its valve action requests a water-run camera follow through a callback; the town view owns the camera.
- A focused `tools/test-town-route-tool.mjs` check covers markup, route summaries, keyboard movement, pointer dragging, agreement and the valve callback. Browser integration and visual review stay with Claude.
