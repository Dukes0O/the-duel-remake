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

## Claude answers (26 November 2026, 17:50)

Ready now: OPEN-STATE merged on 25 November. Files have moved since this card was cut. There is no
`src/world/open/open-state.js`: the routine's record goes in the open record (its shape in
`src/world/open/open-record.js`, its saving and loading in `src/world/open/open-save.js`, the same file
OPEN-JOURNAL-SIZE folds). The gas run is still `src/world/jobs/gas-run.js` with `gasRun` in `src/app.js`, and the bank
still runs through `src/story/ledger-save.js` and `settleNight2` in `src/story/night-2-save.js`. Storyline missions now
run through `src/world/open/parts/missions.js` if the lesson needs one. This card also takes the `save-shape` lock,
because it adds to what is saved; it starts when OPEN-JOURNAL-SIZE-2 has let go of it.

## Claude answers (26 November 2026, 18:15)

**The day in the open land (one answer for OPEN-APPRENTICE-RUN, OPEN-T-RUNAWAY and OPEN-T-MARKET).** A roam's day
passes on play time, never while the game is closed or paused: dawn 2 minutes, day 14, dusk 4, then dark until the
player banks the hearth. The player banks at Tin Town's hearth, on foot, at dusk or in the dark, once a day. That is the
open land's repeatable bank: it settles the open record and the ledger together, ends the day, and the next roam starts
at dawn with the morning's lines. The authored Night 2 and its replay stay as they are. OPEN-APPRENTICE-RUN builds both
pieces, the clock as a plain rule in `src/world/open/day-rule.js` giving `view.partOfDay` (`dawn`, `day`, `dusk`,
`dark`) and the bank, because it holds the `save-shape` lock. Every other card reads `view.partOfDay` and supplies it
in its own tests; nothing else keeps a clock of its own.

1. **The load of a hand run.** Under `story-choices`, a repeatable gas road measures its load from Bess's health on
   arrival: a clean run brings home 60 of gas, and a damaged Bess brings home 60 times her health's share, rounded down.
   Road scrap and feud stay as they are. Earlier `emberRuns` count as hand runs for the offer; a lesson needs a run
   measured this way. The Boneyard furnace battle is not a gas run: it does not count and brings no gas. With the
   switch off, nothing about the gas run changes.
2. **The bank:** as above. Build the clock and the bank in this card. A hand run delivers on arrival. On a day the
   player takes Bess out, or teaches, the learner does not also run. At a bank with the routine going, the learner's
   delivery is posted once, before that night's burn, and Cinder says the sum the next morning. A refused or repeated
   save changes nothing twice.
3. **Gas and embers.** The tally records the whole delivery. The kiln bakes one ember for each 20 of gas in the stock,
   and what is left stays in the stock and adds to the next delivery. Under `story-choices` this replaces the gas run's
   present ember award, so a run is never paid twice. These are design numbers: one independent review of them before
   the merge (rule 17), with the lane tier, as the card says.

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
