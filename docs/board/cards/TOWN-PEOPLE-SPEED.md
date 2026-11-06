# TOWN-PEOPLE-SPEED

The short board entry controls current state, ownership, dependencies and locks.

Found by Claude on 5 November 2026 while removing a top-level wait from `src/town/systems/index.js`. Until then the people system was never loaded through the town's entry point, in Node or, very likely, in the bundle (the old `import.meta.glob?.(` is not the form the bundler rewrites). Once it was loaded, `tools/test-town-core.mjs` failed its budget: a 10,000-person, 5,000-building sim day took about 118 ms against the limit of 30 ms, on a busy laptop.

Do this, in `src/town/systems/modules/people.js` and `src/town/systems/index.js`:

1. Spread the daily work for people across the day's 24 ticks, so each tick does a fair share of the people, in a fixed order that the save can resume. Results stay repeatable from seed and commands, and a town's fingerprint stays the same across a save and load in the middle of a day.
2. Add `import './modules/people.js';` to `src/town/systems/index.js`, next to the calendar line. That is what connects people to the game.
3. `tools/test-town-core.mjs` still passes with its 30 ms limit unchanged. Do not change the limit. Add a check that the people system is registered through the town entry point, and that no single tick takes more than 10 ms at 10,000 people.
4. `tools/test-town-people.mjs` still passes, with its generations and moods unchanged in meaning. If an exact number changes because the work is spread, say which and why in the change note.

Run those two tests and `npm run build`. Do not run the lane tier; Claude will. Write `docs/changes/TOWN-PEOPLE-SPEED.md` with a Removed section.

## Claude answers

### Codex decided (Claude to review)

The per-person implementation also needs `src/town/town-people.js`. The
card-named `src/town/systems/modules/people.js` is only a registration wrapper
around that function, so it cannot spread the daily work by itself. Keep the
wrapper and entry-point import in the named files, and move the resumable
daily cursor into the function it registers.
