# SEA-LIFT

The short board entry controls current state, ownership, dependencies and locks.

`src/world/jobs/steps/helihook.js`: Kestrel One's cable and load over the Scablands, with a 1,400 kg gear section, as section 6 says. The first and last sections are jobs. Dune stands in for anyone with no pilot, and nobody is stopped from finishing. `gear-up` runs the other 22 as a dispatch.

**Checks:** `tools/test-sea-lift.mjs`: the autopilot sets a section on the mark; a hard drop lets you hook on again; with no pilot the works still finish. 1,400 kg passes `liftCheck`'s limit with the base hook.

Design: [docs/story/the-sea-works.md](../../story/the-sea-works.md), [docs/story/the-long-dry.md](../../story/the-long-dry.md) and [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) sections 2, 3, 10, 11. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Every player-facing word is plain, in whole sentences, with no em dashes, and comes from the story page. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
