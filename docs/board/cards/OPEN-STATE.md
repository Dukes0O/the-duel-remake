# OPEN-STATE

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol** (Kyle, 20 November 2026: Sol builds what is not graphics or physics).
[STORY-OPEN-WORLD](STORY-OPEN-WORLD.md) cut this card from `docs/story/open-scablands.md`.

## Re-cut on 25 November 2026: read this first

**Built at the same time as the other open Scablands cards** (Kyle, 25 November 2026). OPEN-SHARED is merged and
holds what this card once waited for. Where this section and the rest of the card differ, this section wins.

- **Read `src/world/open/open-land.js` first.** It is the contract between the parts of the open land.
- **Use these, and do not write them again:** `isTrue` and `checkFact` (`facts.js`); `applyEffects` (`open-effects.js`),
  which is the only way to change the world; the world and its readers (`open-record.js`); holds (`holds.js`); the
  register (`register.js`; a new name is a row there and in `src/story/people.js`); the table checks
  (`check-tables.js`; load every table through `requireSound`); the sample worlds (`samples.js`; every test of a rule
  starts from one of them).
- **Do not edit** `open-land.js`, `parts.js`, `open-view.js`, `content/people.js`, `content/talk-tables.js`,
  `src/app.js`, or a part, a view or a content file that belongs to another card.
- **Where this card needs something that another card is building today,** use a stand-in of your own inside your own
  files, say so under "Codex decided (Claude to review)", and the laptop joins the two at the merge.
- `node tools/test-open-shared.mjs` must still pass, and is one of this card's checks.

**Already built by OPEN-SHARED, so not this card's work:** the open record's shape in memory
(`src/world/open/open-record.js`), the six new effects and a feud for each group (`open-effects.js`), all of `isTrue`,
and the open land's people in `STORY_PEOPLE`. Items 2, 5 and 6 are done.

**Changed from the card as first cut.** A group's feud other than the Ash Men's stays in the open record
(`open.feuds`), and is not moved into the ledger: `src/story/ledger.js` and `src/story/ledger-replay.js` are not
edited by this card, and a ledger saved today is untouched. The open land's changes stay in the record's own journal.

**This card's work:**

1. **Saving the record,** version 1, beside the ledger in the story's save (`registerStory`): everything
   `newOpenRecord` holds. This card may add to `newOpenRecord` the car's armour and each routine's record (section
   23), and nothing else changes in that file. A save from before this card loads unchanged, and with the switch off
   nothing new is written.
2. **`worldForProfile`** (`src/world/open/open-world.js`) reads the saved record where there is one.
3. **`settleOpenWorld(profile, world)`** writes the ledger, the record and the scrap back when a job that began in the
   open ends, by finishing or by being left from the pause menu, and writes nothing when a mission is lost by
   leaving it. Found sites also go through `rememberWorldFound`. The hook is in `src/app.js`, where a world job's
   result is settled; this card holds `busy-game-files` for it.
4. **`spendScrap(profile, amount, reason)`,** as item 4.
5. **Starting again.** `worldJobAgain` in `src/app.js` restarts a job from its definition, and a roam job's
   definition holds the world as it was when the job began. A roam job that is started again reads the world afresh
   from the profile, so that nothing done in the open is undone.

Files: `src/world/open/open-save.js`, `src/world/open/open-world.js`, `tools/test-open-state.mjs`, a fixture under
`tools/fixtures/saves/`; hooks in `src/app.js` and `src/story/story-save.js` (the registration only);
`tools/test-story-save.mjs`. Locks: `save-shape`, `busy-game-files`.

## What to build

Sections 12, 16 and 17.

1. **The open record,** saved beside the ledger in the story's save (`registerStory`, `src/story/story-save.js`),
   version 1: the land's seed (today the save's own seed, kept as its own number so that two players could one day
   share a land), the car's dirt and armour, scrap spent and earned in the open, sites' stages, favours owed, how many
   times each checkpoint has been crossed and which are resting, each thread's record, rumours heard, the squares of
   ground driven (560 bits) and each routine's record (section 23). Found sites
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

## Claude answers (25 November 2026, evening)

1. **Roaming before the first story ledger: the shared opening ledger.** Your recommendation is right. There is one
   ledger, and Five Cold Nights' story begins at night 2. When a roam job begins and the save has no ledger, it begins
   the ledger with Night 2's opening (its seed, night 2, four embers and its gas; `night2Opening` in
   `src/world/jobs/night-2.js`). Night 2 then starts from the saved ledger when one exists on night 2 and is not yet
   banked, so its rules see what the roam changed. The card now owns that Night 2 start hook, and adds the regression
   test you name: roam, then Night 2, then bank, then replay, in that order, with a memory-only save. It stays a save
   card: the lane tier and one independent review before the merge.
2. **The fixture roster.** Granted. The roster in `tools/test-save-fixtures.mjs` goes from 26 to 27 for the new
   fixture. Reviewed under rule 18: it adds a fixture and keeps every historical one and its checks, so nothing is
   loosened.
3. **Pacific Canyon.** `tools/test-world-composition.mjs` passes on the laptop on `integration/wasteland` (Node 22),
   and passed there on every merge today. The mismatch is your cloud's Node 24, which gives a different hash on the
   base commit too, so it is not this card's fault. Note it in the pull request and carry on; the laptop runs the guard
   at the merge.

## At the merge (Claude, 25 November 2026, night)

The browser scenario `open-find-camp` (OPEN-SITES, merged) ends by opening What people remember and waiting for the
Glasshouse at Friendly. It cannot pass until this card saves the open world when a roam ends, so it is part of this
card's proof: run it after your change, and it must pass.

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
