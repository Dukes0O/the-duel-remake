# FAR-LINES

The short board entry controls current state, ownership, dependencies and locks.

Every line of `docs/story/the-far-side.md` section 4, in `src/story/far-lines.js`, built as `src/story/ember-lines.js`. Placeholders `{machine}` and `{apprentice}` are filled by the caller. Waits for TUNNEL-TRIAL's go, so nothing is built for a story that may change.

**Checks:** `tools/test-far-lines.mjs`: every id is present, none over 260 characters, no em dashes, and every line id in the job data resolves.

Design: [docs/story/the-far-side.md](../../story/the-far-side.md) and [docs/MACHINES.md](../../MACHINES.md). A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Every player-facing word is plain, in whole sentences, with no em dashes, and comes from the story page. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
