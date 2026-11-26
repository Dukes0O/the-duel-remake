# OPEN-MAP

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Astra** (Kyle, 20 November 2026: Astra builds graphics). Cut on 25 November 2026 for the two days on the
open Scablands. Design: `docs/story/open-scablands.md` section 16 ("Driven ground", "A rumour is half a find", "When a
site is found").

**Built at the same time as the other open Scablands cards.** Read `src/world/open/open-land.js` first: it is the
contract between the parts of the open land. Use `isTrue` (`facts.js`), `applyEffects` (`open-effects.js`), the world's
readers and `squareAt` (`open-record.js`), the register (`register.js`) and the sample worlds (`samples.js`), and do
not write them again. Do not edit `open-land.js`, `parts.js`, `open-view.js`, `src/app.js`, or a file that belongs to
another card. `node tools/test-open-shared.mjs` must still pass.

## What to build

1. **Driven ground is recorded.** The part `src/world/open/parts/ground.js`: while the player is in the car, the square
   under the car (`squareAt`) is marked once with the effect `{type: 'ground', square}`, through a choice. The part
   keeps the last square in its own state, so that it asks once for each new square and not on every tick.
2. **What the maps should show,** as one plain function in `src/world/open/map-marks.js`:
   `openMapMarks(world, positionOf)` returns the driven squares, the rumours and the found sites.
   - *A found site:* its name from the register, at `positionOf(siteId)`. A site whose stage is `burned` reads "The
     Glasshouse (burned)". Nothing found is ever left out.
   - *A rumour:* a ledger mark `rumour/<site id>` for a site that is not yet found. It is a circle 600 m across with
     the words "Said to be near here." The circle's centre is moved off the true place by a named draw, 200 m at most,
     so that the circle does not give the place away.
   - `positionOf` is given by the caller. OPEN-SITES, built today, gives `sitePosition(siteId, landSeed)`; the laptop
     joins the two at the merge. Until then the maps pass a stand-in that knows the first position of the Glasshouse
     and of Radio Hill from "Claude answers" in `docs/board/cards/OPEN-SITES.md`.
3. **The big map draws it.** Ground the player has driven over is drawn in full, and ground never driven is drawn
   paler, with its hills still showing (ruled by Kyle, 21 November 2026). Rumour circles and found sites are drawn as
   above; a found site is drawn exactly as one of the eight places is. The small map draws found sites and rumours and
   leaves the ground as it is.
4. **Only in the open.** The maps draw this when the running job began in the open (`worldJob.open`). In every other
   job, and with the switch off, both maps are drawn exactly as they are today.

## Files and locks

New: `src/world/open/map-marks.js`, `tools/test-open-map.mjs`, `tools/scenarios/open-map.mjs`. Fill in
`src/world/open/parts/ground.js`. Named hooks: `landMarks` in `src/world/scablands-picture.js`, and the drawing of the
pale ground and the rumour circle in `src/world/scablands-map.js`. No lock.

## Checks

1. `tools/test-open-map.mjs`: driving across three squares marks three, each once; on foot marks none; from the sample
   world `helped-camp` the Glasshouse is a named site, and from `after-the-smoke` it reads "The Glasshouse (burned)";
   a rumour's circle holds the true place and is not centred on it, and is the same for one seed; a found site has no
   rumour; with no open world the maps' marks are exactly today's.
2. Every older suite that names `scablands-map` or `scablands-picture`.
3. Laptop only: the browser scenario `open-map` (a fixed seed; start a roam job, drive 1.5 km east, open the big map).
   Claude judges one sheet, `docs/board/looks/open-map/round-1.jpg`.

Rule 23 (behind an off switch): the checks above, then
`node tools/run-tests.mjs --jobs 4 --filter core --filter test-replays --filter test-combat-replays --filter test-world-composition --filter test-open-shared --filter test-open-map`
with a `--filter` for each older suite found, and `npm run build`. It merges when that is green. Claude drives it in
the merged batch.

## Sound cues

None. `open.site.found` is OPEN-SITES's.

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
`docs/changes/OPEN-MAP.md` with a **Removed** line.
