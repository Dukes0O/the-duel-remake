# SEA-LINES

The short board entry controls current state, ownership, dependencies and locks.

Every line of `docs/story/the-sea-works.md` section 4, in `src/story/sea-lines.js`, built as `src/story/ember-lines.js`. Placeholders `{aground}`, `{name}`, `{child1}`, `{child2}`, `{truck}` and `{warlord}` are filled by the caller from the town.

**Checks:** `tools/test-sea-lines.mjs`: every id is present, none over 260 characters, no em dashes, and every line id in the job data resolves.

Design: [docs/story/the-sea-works.md](../../story/the-sea-works.md), [docs/story/the-long-dry.md](../../story/the-long-dry.md) and [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) sections 2, 3, 10, 11. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Every player-facing word is plain, in whole sentences, with no em dashes, and comes from the story page. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
