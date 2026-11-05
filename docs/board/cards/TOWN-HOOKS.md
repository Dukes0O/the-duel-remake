# TOWN-HOOKS

The short board entry controls current state, ownership, dependencies and locks.

Switch `wasteland-town` (dev, with its Preview launcher line). One new button in `src/screen-yard-home.js`, THE TOWN; a route in `src/screen-router.js`; `src/town/` by dynamic import, so with the switch off nothing loads. Hollis's note, naming the town, the camera rising over the Dome. Save on leaving, each game week and before each mission. Pause when leaving. The town never runs while the yard or anything else is on screen. `tools/scenarios/town-opens.mjs` (Claude runs it). With the switch off the game is exactly today's.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read section 9 (how it works) and section 13 (checks) first. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
