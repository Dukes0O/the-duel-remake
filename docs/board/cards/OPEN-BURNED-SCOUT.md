# OPEN-BURNED-SCOUT

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol** (Kyle, 20 November 2026: Sol builds what is not graphics or physics). Rewritten by Claude on
26 November 2026, after OPEN-NEST-GROUND merged, to fit the open land as it now stands. Design:
`docs/story/open-scablands.md` section 21, Scene 3, and sections 15 and 18.

## What is there already

- The beat `scout` in `src/story/threads/content/burned-camp.js` is a stub (`notes` only), and
  `node tools/thread-crossings.mjs --check` reports it as having no way out.
- The Rats' Nest is drawn (`src/world/open/looks/rats-nest-look.js`, with its named spots), stands in the land
  (`site('rats-nest', ...)` in `src/world/open/content/sites.js`) and cuts its own ground for play
  (`src/world/open/site-ground.js`). Do not move or redraw any of it.
- The Ash Men's turn (`src/story/threads/content/burned-camp-ash-men.js`, beats `grey-scout` and `grey-rim`) is the
  same scene written for another enemy. Write the Road Rats' beats in the same shape, so that the later fold is easy.
- **No mission runs yet.** `src/world/open/parts/threads.js` emits `{type: 'threadMission'}` and takes the hold when a
  beat with a `mission` is entered, but nothing plays the mission or reports how it ended, so `outcomes` are never
  reached. Three other storylines (`mall-road-toll`, `dry-pump`, `dace-goes-looking`) wait on the same thing.

## What to build

1. **The shared mission runner,** a new part `src/world/open/parts/missions.js`, added to the parts list where
   `threads.js` is. It starts on `threadMission`, plays the mission in the open land, and ends with one named outcome
   that the threads part reads to apply that outcome's `effects` and `next` (a shared request or event; name it in the
   change note). It lets go of the hold when it ends, fails or is left (section 15). A mission's kind is a row in a
   table (`src/world/open/content/mission-kinds.js`), so a later storyline adds a kind without changing the runner.
   This card adds one kind, `reach` by car, with the rule fields `seenAfterSeconds`, `lookouts` and `riders` that
   the burned camp and the Ash Men's turn already use: a car in a lookout's view (the hills block the view, as the
   furnace's rule has it) for `seenAfterSeconds` is seen; seen sends `riders` rider cars through the existing
   `rider-fight` rule; the mission ends `seen` or `unseen` on reaching the place. Leaving a mission halfway is
   leaving it, as section 14 says, with no outcome.
2. **The scouting drive (`scout`),** as `grey-scout` is written: the bean pods last to the Girder Bridge road and the
   tracks go on; two lookout buggies on heaps of wrecks watch the two roads into the wreck fields (place them from the
   look's spots with `land.at`); seen is a flare (`open.lookout.flare`), two buggies, and the mark "The Road Rats know
   somebody was looking."
3. **The rim, on foot (`rim`),** as `grey-rim` is written: three places to look from (`north-end`, `middle`,
   `south-end`), each with what is seen, the thought and the mark exactly as section 21's table has them, and the cue
   `open.scout.seen`. "You found the Rats' Nest." puts the Nest on the map for good.
4. **The decision at the rim:** drive in alone (next `alone`), the drain on foot (only after `south-end`, next
   `drain`), and slip away home (next `home`). `alone` and `drain` are stub beats for OPEN-BURNED-PEN, written with
   `notes` as `scout` is today; the crossings check lists them as that card's, and nothing else is left open.

## Files and locks

New: `src/world/open/parts/missions.js`, `src/world/open/content/mission-kinds.js`, `tools/test-open-missions.mjs`,
`tools/scenarios/open-burned-scout.mjs`. Changed: `src/story/threads/content/burned-camp.js` (the beats above),
`src/world/open/parts/threads.js` (reading the outcome), the parts list, and the shared request in
`src/world/open/open-land.js` and `src/arena/modes/world-job.js` if the runner needs the host to place lookouts and
riders (marked OPEN-SHARED). Add the scenario's row to `SCENARIO_AREAS` in `tools/run-browser-scenarios.mjs`. No lock.

## Checks

1. `tools/test-open-missions.mjs`, with no graphics: the mission holds the checkpoints and the signs from start to
   end and lets go after; a car kept out of both lookouts' view is not seen, and one left in view for eight seconds
   is; seen brings two riders; each place on the rim writes its mark; the drain can be chosen only after the south
   end; the Nest is found afterwards; leaving halfway gives no outcome and lets go of the hold.
2. `node tools/thread-crossings.mjs --check`: `scout` and `rim` have their ways out; only `alone`, `drain` and
   `home` remain, named as later cards'. Every older suite that names `burned-camp`, `threads.js` or the holds.
3. Laptop only: the browser scenario `open-burned-scout`, the gully way, not seen (this card's one scripted drive). It
   waits for the buttons and the yard before it starts, as `open-map.mjs` does.

Rule 23 (behind an off switch): the checks above, then
`node tools/run-tests.mjs --jobs 4 --filter core --filter test-replays --filter test-combat-replays --filter test-world-composition --filter test-open-missions --filter test-open-threads`
and `npm run build`. It merges when that is green. Claude drives it in the merged batch.

## Sound cues

`open.scout.seen` (in hand): a held breath, for each thing seen from the rim. `open.lookout.flare` (new; OPEN-SOUND
registers it): a flare going up.

## Claude answers (26 November 2026, 15:25)

1. **Lookout posts:** they belong to the mission, not the site's look. Write the two posts as rows in this card's own
   content (on a heap of wrecks beside each of the two roads into the wreck fields, outside the Nest's radius, placed
   with `land.at`), each with the heading it watches. Draw each with an existing rider buggy and figure; give the heap a
   solid. Do not edit `rats-nest-look.js` (OPEN-LOOK-3 is changing it).
2. **The Rats in the yard:** the rim's thought says "about fourteen", so a player must be able to count roughly that
   many. Place ten to fourteen figures as background people with no talk and no ledger entry, at the named spots the
   look already has (the bays, the fires, `warm-hands`, the gate, Sump's shack), standing, sitting or walking short
   rounds by the routine rule. Use the existing rider figures. OPEN-LOOK-3 adds six parked buggies with solids at the
   bays; stand people beside them, not on them.
3. **The rim's decision** through the existing roam interaction, on foot, with the drain gated by `south-end`:
   approved. The choice is asked only once the player has looked from at least one place, so that walking up to the rim
   does not end the scene before it starts.

## Rules for every open Scablands card

Everything is behind `story-choices`, and nothing the released game does with that switch off may change. A rule is a
plain function that returns new data and reads no graphics. Every draw is a named draw from the save's seed. Every
position is written with `land.at` or `land.between` (`src/world/scablands-names.js`). Content is rows in tables.
Every word a player reads is a whole plain sentence with no em dash. Stay inside the files named here. If another file
is needed, write the choice under "Codex decided (Claude to review)" and carry on, unless it touches saves or a
released course; then stop and say so. Checks use memory-only saves. Questions go to
`docs/board/questions/OPEN-BURNED-SCOUT.md` with your pick. Write `docs/changes/OPEN-BURNED-SCOUT.md` with a
**Removed** line. After the pull request is open the card is finished: do not wait for review comments.
