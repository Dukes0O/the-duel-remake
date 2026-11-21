# OPEN-SITES

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol** (Kyle, 20 November 2026: Sol builds what is not graphics or physics).
[STORY-OPEN-WORLD](STORY-OPEN-WORLD.md) cut this card from `docs/story/open-scablands.md`.

## What to build

Sections 16 and 17.

1. **The sites table and its rule.** Each site lists two or three possible positions; the save's seed picks one by a
   named draw. Claude gives the positions in "Claude answers"; a check proves each is flat, clear of solids and can be
   reached by the way-finder.
2. **Finding.** A site is found when the car or the player on foot is within its `foundWithin` and `sees` it. Once:
   `rememberWorldFound`, the `find` and `met` effects, one line at the top of the screen, and the cue.
3. **The maps.** `landMarks` takes found sites as extra places, so both maps draw a found site as a place is drawn. A
   rumour draws a circle 600 m across with "said to be near here". A burned site keeps its mark with "(burned)". Leave
   the pale drawing of ground never driven until Kyle has answered question 1.
4. **Two camps built:** the Glasshouse (windscreen frames over bean rows, a wind pump, a store tent, a water cart)
   and Radio Hill (a mast, a hut, a generator). Use things in the Scablands' and the town's sets; new things are drawn
   in code. Each has its tell (thin smoke at dusk; the mast, and a voice on the radio within 800 m), residents with
   routines, and a talk table. Claude judges the look in the batch drive.
5. **Needs.** On each visit after a banked night a camp may have one need, by a named draw from its list. A thing to
   mend: walk to it, hold the wrench on it for its seconds, pay its scrap; it gives a favour and a mark. A thing to
   fetch: a promise with its night, kept by bringing the thing.
6. **Goodwill,** exactly as the table in section 17: the first mend makes Strangers Friendly; later mends give a
   favour; a promise kept makes Friendly Sworn; a promise broken and an attack on their people lower the word. A
   camp's people walk out to meet a Friendly driver and watch a Wary one from the fence.
7. **Favours spent:** a tow home, and a car that rides out to a fight within 1.5 km of the camp.

## Files and locks

New: `src/world/open/content/sites.js`, `src/world/open/content/needs.js`, `src/world/open/site-rule.js`,
`src/world/open/goodwill-rule.js`, `src/world/open/site-view.js`, `tools/test-open-sites.mjs`,
`tools/scenarios/open-find-camp.mjs`. Rows in the people and talk tables. Named hooks: extra places in `landMarks`
(`src/world/scablands-picture.js`) and the rumour circle in `src/world/scablands-map.js`; the sites' solids in
`src/world/scablands-solids.js`. No lock.

## Checks

1. `tools/test-open-sites.mjs`: one seed always gives the same positions and two seeds differ; every possible
   position is flat, clear and reachable; a site is found only within its distance and in sight, and not through a
   hill; the found list never shrinks; the maps mark found sites and no others; the goodwill table of section 17, row
   by row.
2. `tools/test-scablands-map.mjs` and `tools/test-scablands-solid.mjs`, brought up to date.
3. Laptop only: the browser scenario `open-find-camp` (drive to the Glasshouse's position for a fixed seed, see it
   join the map, mend the pump, read "Friendly" on the page What people remember).

Rule 23 (behind an off switch): the checks above, then
`node tools/run-tests.mjs --jobs 4 --filter core --filter test-replays --filter test-combat-replays --filter test-world-composition`
with a `--filter` for each suite named above, and `npm run build`. It merges when that is green. Claude drives it in
the merged batch.

## Sound cues

`open.site.found`: a place joining the map. `open.need.mended`: a seized pump turning again. `open.rumour`: a pencil
circle drawn on paper. `open.radio.voice`: a voice through static, for Radio Hill's tell.

## Claude answers

Owed before the build starts: each site's possible positions, the camps' talk tables and needs.

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
`docs/changes/OPEN-SITES.md` with a **Removed** line.
