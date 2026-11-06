# TOWN-CORE

The short board entry controls current state, ownership, dependencies and locks.

The base every other town card builds on, and the card most able to limit the next ten years, so build it for that. Sections 10 and 11, and `docs/MACHINES.md` sections 1 and 8, which win where they differ.

`src/town/content/registry.js` plus content files for each kind, with a schema check at load: buildings (section 14's table, every row), goods. `src/town/town-world-data.js`: regions as data, sparse 16 by 16 chunks of 8 m cells made when first used; the Scablands region with the Dome's oval and gate reserved, using `scablandsSurfaceHeightAt`. `town-calendar.js`: hour, day, month, season, year as section 11. `town-state.js`: createTown(seed, name, founders), serialize and deserialize; `town-migrate.js`: version number and a migration list kept forever, starting at version 1, with fixtures in `tools/fixtures/town/`. `town-commands.js`: command dispatch, each returning ok or one plain sentence a child can read. `town-sim.js`: `stepTown`, `registerTownSystem(name, order, everyTicks, fn)`, generator from `src/rng.js` with its state inside the town. `index.js`: one import line a system.

`tools/test-town-core.mjs`: placing cells anywhere not reserved, including far from the start; chunks only exist when used; identical commands and seed give an identical fingerprint after 100,000 ticks; saving and loading at any tick changes nothing; every building id in the table matches the art cards' ids; adding a test building by data alone works; 10,000 people and 5,000 building records serialize, load and step within section 10's target.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read sections 2, 3, 10, 11 and the checks in section 15 first. **This game is for years of play and years of building (Kyle, 5 November): no fixed limits on people, buildings, map size or years; content lives in data under `src/town/content/`; a town saved today must load in every later build.** A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Real numbers wherever a real number exists, and note the source of any you add. Every player-facing word is plain, in whole sentences, with no em dashes. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers

## Codex decided (Claude to review)

The town design names the Dome oval and gate as reserved but gives no map
anchor. Use the TOWN-ART-DOME contract's 28 by 20 cell oval (224 m by 160 m)
at the Scablands origin, and its 6 by 3 cell gate (48 m by 24 m) on the -Z
side. This keeps the Dome art footprint clear and leaves the rest of the
region buildable. Keep these shapes as region data so a later world card can
refine their coordinates without changing the chunk or placement rules.
