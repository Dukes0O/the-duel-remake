# OPEN-T-MARKET

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol** (Kyle, 20 November 2026: Sol builds what is not graphics or physics; on the Codex command line,
`gpt-6.1-sol`). Cut by Claude on 26 November 2026, day 2 of the open Scablands: bring Market Day into the game.

## What is there already

- The storyline is written in full in `src/story/threads/content/market-day.js`, and every line a player reads is exactly
  as its page has it: [docs/story/threads/market-day.md](../../story/threads/market-day.md). Nothing loads it yet:
  `src/world/open/parts/threads.js` loads only the burned camp.
- A storyline's mission runs through `src/world/open/parts/missions.js`, and each kind of mission is a row in
  `src/world/open/content/mission-kinds.js` (OPEN-BURNED-SCOUT built the first, `reach` by car with lookouts). Read
  both and `tools/test-open-missions.mjs` before starting; a new kind is built the same way.
- The design is `docs/story/open-scablands.md`, sections 13 to 18 and the shape of a storyline's file in section 18.

## What to build

1. **Load the storyline** in the threads part's list, behind `story-choices`, so that the director can begin it.
2. **Its sign** (`words`). `src/story/threads/signs.js` knows `smoke`, `words` and `call`; add the kind if it is
   missing, as a plain function beside them, and draw it through the open land's sign view if it is seen.
3. **Its places, people and talk** as rows: a place in the sites table or with `land.at`, the people its beats name in
   the people tables, their lines in the talk tables. Reuse figures and art the game already has (Tin Town's people,
   the riders, wrecks, shacks, the Rats' Nest's kit). A place that needs a look of its own is built from those pieces
   for now and named under **Look owed** in the change note, for a later Astra card; say what it should look like.
4. **The mission kinds it uses that do not exist yet:** market (on foot). Each is a row in `mission-kinds.js` with its own
   pure rule and its own checks, written so that any storyline can use it. 
5. **No beat left without a way out:** `node tools/thread-crossings.mjs --check` reports nothing for this storyline.

Do not change the storyline's words. If a line or a beat cannot be played as written, write the question with your pick
in `docs/board/questions/OPEN-T-MARKET.md` and carry on with the pick.

## Files and locks

New: `src/world/open/content/market-day-places.js` (or rows in the existing tables), `tools/test-open-market-day.mjs`,
`tools/scenarios/open-market-day.mjs` with its row in `SCENARIO_AREAS` (`tools/run-browser-scenarios.mjs`). Changed: one
line in the threads part's list; rows at the end of `mission-kinds.js`, the sites, people and talk tables, and
`signs.js` if its sign kind is new. Other storyline cards add rows to the same tables at the same time: add, never
reorder, so the merges stay clean. No lock.

## Checks

1. `tools/test-open-market-day.mjs`, with no graphics: the sign is seen where and when the page says; every beat can be
   reached; every mission ends in each outcome it names; ignoring the sign does what the page says; marks, words and
   favours are written as the page says.
2. `node tools/thread-crossings.mjs --check` (nothing for this storyline), `tools/test-open-missions.mjs`,
   `tools/test-open-threads.mjs`, `tools/test-open-shared.mjs`, `tools/test-thread-shape.mjs` (its counts must not move:
   the words are not changed), and every older suite that names this storyline's file.
3. Laptop only, Claude runs it: the browser scenario `open-market-day`, one scripted drive of one way through. It waits
   for the buttons and the yard before it starts, as `open-burned-scout.mjs` does, and starts the car clear of bridges
   and decks.

Rule 23 (behind an off switch): the checks above, then
`node tools/run-tests.mjs --jobs 4 --filter core --filter test-replays --filter test-combat-replays --filter test-world-composition --filter test-open-market-day --filter test-open-missions --filter test-open-threads`
and `npm run build`. It merges when that is green. Claude drives it in the merged batch.

## Sound cues

The cues the storyline's file names. Any that are not in the sound bank keep their ids for OPEN-SOUND to register;
list them in the change note.

## Claude answers (26 November 2026, 18:15)

**The day in the open land (one answer for OPEN-APPRENTICE-RUN, OPEN-T-RUNAWAY and OPEN-T-MARKET).** A roam's day
passes on play time, never while the game is closed or paused: dawn 2 minutes, day 14, dusk 4, then dark until the
player banks the hearth. The player banks at Tin Town's hearth, on foot, at dusk or in the dark, once a day. That is the
open land's repeatable bank: it settles the open record and the ledger together, ends the day, and the next roam starts
at dawn with the morning's lines. The authored Night 2 and its replay stay as they are. OPEN-APPRENTICE-RUN builds both
pieces, the clock as a plain rule in `src/world/open/day-rule.js` giving `view.partOfDay` (`dawn`, `day`, `dusk`,
`dark`) and the bank, because it holds the `save-shape` lock. Every other card reads `view.partOfDay` and supplies it
in its own tests; nothing else keeps a clock of its own.

1. **Dawn, noon and the beats that run side by side:** read `view.partOfDay` from the shared day (noon is the middle of
   `day`). Your Market Day rows may show the hearth's rules during the invitations, start the yard mission after the
   stakes, and let the day offer the rider, the quarrel and dusk, as you pick. Keep the deadline and refusal branches
   explicit, and keep the authored text and counts.
2. **Trade and pay:** no change to pay or prices in this card. The quarter off and the day's trade are written as
   ledger outcomes and words. The later stock at the gate goes under **Owed** in the change note for a card of its own.
3. **The quarrel:** cast the Bus Ring as the odd camp as you say, ending when the glass timer runs out: approved.

## Claude answers (26 November 2026, 19:10)

The Bus Ring now has a look being drawn (OPEN-LOOK-BUS-RING, a Claude cloud card). Its `BUS_RING_LAYOUT.spots` and
`busRingSolids('camp')` are the true spots: your stand-in's `workbench` and `car-stop` points lie inside the ring or under
its buses. Keep your names, and when the look merges read its spots through a plain-data copy for the rules held equal to
the look by a test (as `src/world/open/site-rule.js` does for the Glasshouse). The leader's place is `gasket`, the
meeting place `workbench`, Gasket's bed `bunk`. The site stays where you put it, on the salt below the ridge, gate toward
the Ridge spur. Merge `origin/integration/wasteland` before handing over: OPEN-T-PUMP and OPEN-T-FLAG have merged and
changed the mission runner and threads part; keep both sides, and direct only your own storyline in your test
(`threadsAtBankedHearth({world, view}, [marketDay])`).

## Rules for every open Scablands card

Everything is behind `story-choices`, and nothing the released game does with that switch off may change. A rule is a
plain function that returns new data and reads no graphics. Every draw is a named draw from the save's seed. Every
position is written with `land.at` or `land.between` (`src/world/scablands-names.js`). Content is rows in tables.
Every word a player reads is a whole plain sentence with no em dash. Stay inside the files named here; if another file
is needed, write the choice under "Codex decided (Claude to review)" and carry on, unless it touches saves or a
released course; then stop and say so. Checks use memory-only saves. Write `docs/changes/OPEN-T-MARKET.md` with a **Removed**
line. After the pull request is open the card is finished: do not wait for review comments.
