# OPEN-STATE

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol** (Kyle, 20 November 2026: Sol builds what is not graphics or physics).
[STORY-OPEN-WORLD](STORY-OPEN-WORLD.md) cut this card from `docs/story/open-scablands.md`.

## What to build

Sections 12, 16 and 17.

1. **The open record,** saved beside the ledger in the story's save (`registerStory`, `src/story/story-save.js`),
   version 1: the car's dirt and armour, scrap spent and earned in the open, sites' stages, favours owed, how many
   times each checkpoint has been crossed and which are resting, each thread's record, and rumours heard. Found sites
   go through `rememberWorldFound`, which never shrinks.
2. **Six new effects** in the ledger's journal, each recorded with the choice that caused it: `find`, `site`,
   `favour` (two owed at most for one people), `scrap`, `thread` and `town` (a posting only; the bridge is a later
   card, so today it is journalled and does nothing else).
3. **One feud for each group.** `ledger.feuds`, with the Ash Men's still read and written by the old name `feud`, so a
   ledger saved today loads unchanged.
4. **The spending function** `spendScrap(profile, amount, reason)`: it never takes the scrap below nothing, and
   returns what was taken and what is still owed. Every price and ransom goes through it.
5. **The rest of `isTrue`:** `found`, `stage`, `favour`, `thread`, and `town` (which answers that nothing stands).
6. People from the open land's tables join `STORY_PEOPLE`, so the ledger accepts a camp's people.

## Files and locks

New: `src/world/open/open-state.js`, `src/world/open/open-save.js`, `tools/test-open-state.mjs`, a fixture under
`tools/fixtures/saves/`. Named hooks: the six effects and `feuds` in `src/story/ledger.js`; the replay's reading of
them in `src/story/ledger-replay.js`; the people list in `src/story/people.js`; `src/world/open/facts.js`;
`tools/test-story-ledger.mjs` and `tools/test-story-save.mjs`. Lock: `save-shape`.

## Checks

1. `tools/test-open-state.mjs`: a save from before this card loads unchanged, and with the switch off nothing new is
   written to it; the record survives a save and a load exactly; the found list never shrinks; a third favour for one
   people is not added; `spendScrap` never goes below nothing.
2. `tools/test-story-ledger.mjs`: the old `feud` effect and the new per-group one agree for the Ash Men; each new
   effect is journalled with its choice and replays to the same ledger.
3. Every suite that names `ledger`, `story-save` or `world-save`.

Not rule 23, because this card adds to what is saved and spends the player's scrap. The checks above, the lane tier
(`node tools/run-tests.mjs --tier lane --changed --jobs 4`), `npm run build`, and one independent review of
the save shape and the spending function before the merge (AGENTS rule 17).

## Sound cues

None.

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
`docs/changes/OPEN-STATE.md` with a **Removed** line.
