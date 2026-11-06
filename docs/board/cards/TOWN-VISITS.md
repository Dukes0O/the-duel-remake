# TOWN-VISITS

The short board entry controls current state, ownership, dependencies and locks.

Kyle, 5 November 2026: "Yes, separate towns", after asking whether he and Gratian could keep separate builds and "maybe we could visit each other's build." Each player has a town of their own, and can look around the other's. Measured cost: a Year 30 town saves at about 3.8 MB, and only the town on screen is in memory.

Read `AGENTS.md`, `docs/WASTELAND_TOWN.md` section 13, `src/town/town-store.js`, `src/town/town-entry.js`, `src/career-backup.js` and `src/town/ui/town-screen.js`.

## Claude answers

Claude, 5 November 2026. Settled. Build it as written.

**Separate towns**

1. Town ids must be unique to their owner. Today a town's id comes from its seed, and every player gets the same menu seed, so two players would collide. A new town's id includes the player's id, and its seed mixes in the player's id too, so that two towns are different places to build in.
2. `town.mayors` holds the owner. Remove the lines in `src/town/town-entry.js` that make whoever opens a town a mayor.
3. THE TOWN opens the town whose `mayors` includes the current player. A player with none gets Hollis's note and names their own. The pointer stays one list of all the town ids on this laptop, so that complete export and import keep carrying every town. Do not add a field the import path would drop: find a player's town by reading the records and checking `mayors`.
4. A town with an empty `mayors` list or an id from an earlier build still loads, and is offered to the first player who opens THE TOWN. No real player has a town yet, but a town saved today must load in every later build.

**Visits**

5. In the town screen's bottom bar, beside THE BOOK: VISIT, which lists the other towns on this laptop by town name and owner name, each with its year and people. A player with no town yet also sees this choice on Hollis's note.
6. A visit is look-only. The same camera and map, the overlays, THE BOOK, a person's card and the reports all work. No build menu, no commands, no BACK UP. A plain banner says: "Visiting Tin Flat, Gratian's town. You can look around. Nothing you do here changes it." Any command is refused by a single check in `town-entry.js`, with that sentence.
7. **A visited town never advances and is never saved.** The rule that a town stops when closed includes while someone else is looking at it. No `stepTown`, no save, no rolling copy, no change to its record, not even `mayors`. Speed buttons are hidden. The player's own town also does not advance during a visit. RETURN goes back to their own town, or to the yard if they have none.
8. Reading a damaged town for a visit shows the store's plain sentence and returns; it never repairs or rewrites someone else's town.

**Checks**

`tools/test-town-visits.mjs`: two players make two towns with different ids and seeds; each opens only their own; a visit steps nothing, and the visited record's bytes are the same before and after, including after trying a build command and leaving; complete export and import keep both towns with their owners; an old town with no mayors still loads; with `wasteland-town` off nothing loads. Update `tools/scenarios/town-opens.mjs` to make two memory-only players, a town each, and a visit, with a picture of each step and a check on the banner. Claude runs it in the test browser. Run `tools/test-town-hooks.mjs`, `tools/test-town-store.mjs`, `tools/test-career-backup.mjs` and `npm run build`. Do not run the lane tier. This touches saves, so it gets one independent review. Write `docs/changes/TOWN-VISITS.md` with a Removed section naming the shared-mayor lines. Every player-facing word is plain, in whole sentences.
