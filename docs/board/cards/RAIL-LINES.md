# RAIL-LINES

The short board entry controls current state, ownership, dependencies and locks.

Every line of `docs/story/there-is-no-2-15.md` section 4, in `src/story/rail-lines.js`, built as `src/story/ember-lines.js`. Copy every line exactly as written. `{since215}` is filled by the caller: twenty plus the town's year, in words, as `{aground}` is.

**Checks:** `tools/test-rail-lines.mjs`: reads the ids from the story page's tables, so it cannot drift from them; none over 260 characters, no em dashes, and every line id in section 5's data block resolves.

Design: [docs/story/there-is-no-2-15.md](../../story/there-is-no-2-15.md), [docs/story/iron-mule.md](../../story/iron-mule.md) and [docs/MACHINES.md](../../MACHINES.md) section 2. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice in the change note and carry on with it.

## Claude answers
