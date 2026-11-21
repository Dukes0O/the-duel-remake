# OPEN-APPRENTICE-RUN

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol** (Kyle, 20 November 2026: Sol builds what is not graphics or physics).
[STORY-OPEN-WORLD](STORY-OPEN-WORLD.md) cut this card from `docs/story/open-scablands.md` after Kyle's ruling of
21 November 2026 on the ransom. It is the first built piece of [RUN-FIRE-LINE](RUN-FIRE-LINE.md), whose other parts
stay a future idea.

## What to build

Section 23, exactly as written.

1. **The routines table,** with one row: the gas run for Cinder's kiln. Its rule is plain functions: whether the
   routine may be offered, who is willing (from the ledger, and a townsperson always), the learner's share from the
   lesson's load, and what a banked night brings home.
2. **The offer.** Cinder's two lines at the hearth with the player's own name in them, the three questions, and the
   two answers. No word of loop, automate, schedule or set up reaches the player; a check reads every line for them.
3. **The lesson.** The next gas run by hand carries the learner as a passenger, with the bar and its line. The gas
   that reaches home is the lesson's load. A better lesson replaces a worse one.
4. **The routine running.** Each time a hearth is banked with the routine going, the learner's run brings home the
   share of the lesson's load, the kiln bakes at twenty of gas to the ember, and Cinder says the sum the next morning.
   Nothing moves while the game is closed. The player's one large outing that day is free.
5. **By hand again.** Speaking to Moss takes any day's run back. Speaking to the learner stops or starts the routine
   and gives the tally.
6. **With a short store.** Cinder's line when the routine is running; the offer that evening when it is not.
7. A learner in trouble is not built here. The routine's record leaves room for it.

## Files and locks

New: `src/world/open/content/routines.js`, `src/world/open/routine-run-rule.js`, `src/story/scenes/routine-offer.js`,
`tools/test-open-apprentice-run.mjs`, `tools/scenarios/open-apprentice-run.mjs`. Named hooks: the passenger and the
lesson's load where the gas run ends (`src/world/jobs/gas-run.js`, and `gasRun` in `src/app.js`, which needs the
`busy-game-files` lock while it is edited); the
routine's turn where the hearth is banked (`src/story/ledger-save.js`); the routine's record in
`src/world/open/open-state.js`; Cinder's and Moss's rows in the talk tables. Lock: `busy-game-files`. Build after OPEN-STATE
has merged.

## Checks

1. `tools/test-open-apprentice-run.mjs`: the offer is not made before one run by hand, is made when the store falls to
   one ember after a loss, and returns no sooner than three nights after "not yet"; a townsperson is always willing;
   the share is drawn once between .6 and .85 and a better lesson replaces a worse; a banked night with the routine
   going adds the gas and the embers section 23 says, and a hand run on the same day brings more; nothing is added
   when no night is banked; no line holds a developer's word.
2. `tools/test-story-ledger.mjs`, and every suite that names the gas run.
3. Laptop only: the browser scenario `open-apprentice-run` (a hand run with a learner aboard, a banked night, Cinder's
   sum in the morning).

Not rule 23, because this card adds to what is saved and changes the town's embers. The checks above, the lane tier
(`node tools/run-tests.mjs --tier lane --changed --jobs 4`), `npm run build`, and one independent review of the
routine's record and the embers it bakes before the merge (AGENTS rule 17).

## Sound cues

`open.routine.learnt`: a second pair of boots climbing into a cab. `open.routine.home`: Bess's engine heard coming in
at the gate, far off.

## Rules for every open Scablands card

Design: [docs/story/open-scablands.md](../../story/open-scablands.md), the sections this card names; it wins over this
card where they differ. Everything is behind `story-choices`, and nothing the released game does with that switch off
may change. A rule is a plain function that returns new data and reads no graphics. Every draw is a named draw from the
save's seed (`src/rng.js`, as `namedThrow` in `src/story/ledger.js`). Every position is written with `land.at` or
`land.between` (`src/world/scablands-names.js`). Content is rows in tables: adding a person, a building, a checkpoint, a
site or a thread must need no change to a rule. Every word a player reads is a whole plain sentence with no em dash.
Stay inside the files named here. If another file is needed, write the choice under "Codex decided (Claude to review)"
and carry on, unless it touches saves or a released course; then stop and say so. Before CARD DONE, search `tools/` for
every older suite and scenario that names what this card changes, and run them. Checks use memory-only saves. Do not
clean up anything in Claude's scratchpad. A commit from the lane needs approval: rerun git and ask for it. Write
`docs/changes/OPEN-APPRENTICE-RUN.md` with a **Removed** line.
