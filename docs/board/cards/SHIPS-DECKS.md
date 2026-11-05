# SHIPS-DECKS

The short board entry controls current state, ownership, dependencies and locks.

`docs/story/ships-in-the-sand.md` section 6. `src/world/deck-plates.js`: the table of still plates and ladders (three decks, the mast top, three stair landings), reusing the plate code from MULE-RAILS, with `climbs:true` on `onfoot`; `weather:'dust-night'`, view only; the job-level `vehicle` field through `src/town/work-vehicles.js` or the garage, with `lendIfNone` leaving the save alone.

**Checks:** `tools/test-deck-plates.mjs`, headless: F at a ladder's foot moves the fighter up; falling keeps your place and puts you on the ground beside the ship; a plate's height matches the job data; the weather changes no rule and no replay.

Design: [docs/story/the-long-dry.md](../../story/the-long-dry.md), [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) sections 2, 3, 10, 11 and the checks in section 15. Read `docs/story/ships-in-the-sand.md` first. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
