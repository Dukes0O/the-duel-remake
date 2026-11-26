# OPEN-T-RADIO

- The Voice on Radio Hill plays behind `story-choices`: calls and two bearings, the night climb, the Pocket, taking the set, fuel and peace. The authored dialogue and thread shape are unchanged.
- Rule 23 on Node 22.23.5, memory only, passed 7/7 on `d8fc7a461`: core 804, race replay 306, combat replay 12, composition 65, Radio Hill, open missions and open threads.
- Related checks passed 13/13 on `d8fc7a461`: open shared, thread shape, browser registration, crossings unit tests, open sites, checkpoints, Hauler, Dry Pump, Flag, open roam/start, routines and burned camp.
- `node tools/thread-crossings.mjs --check` finds Radio Hill sound. Its exit 1 is the same two burned-camp findings (`alone`, `drain`) as on `158b4ee6d`, for OPEN-BURNED-PEN.
- Focused checks on `2645c9c55` cover the shared day contract. Final Radio Hill, open threads, all three pin guards and `npm run build` passed on `d6bdb89ae`. Board and placement passed on the handoff tree.
- Changed assertions: `test-open-sites` checks the Pocket's opposite bearing, authored road distances and the clear west approach. The original site assertions still cover every older row.
- Claude’s published day ruling applies. The thread reads `view.partOfDay` and requires OPEN-APPRENTICE-RUN for the roam clock and bank UI. The memory-only scenario supplies both. Codex’s remaining placement and mission choices are on the branch.
- For Claude to run: `node tools/run-browser-scenarios.mjs --scenarios open-radio-hill-voice --jobs 1`, batch hand drive and code/assertion review, then `npm run build` on the merged result. Regenerate status with the laptop's integration checkout.
- Look owed: check the Pocket's reused wrecks, lamp, wheels and Parrot model. OPEN-LOOK-RADIO-HILL owns the final mast, hut, second set and ramp lighting. Spots are `ramp-foot`, `bend-1`, `bend-2`, `broken-ledge`, `last-rise`, `top` and `hut`. No picture or audio was reviewed here.
- OPEN-SOUND owes `open.radio.voice`, `open.radio.second-voice`, `open.radio.cut-in`, `open.lamp.blink`, `open.ramp.edge`, `open.trap.sprung`, `open.wheels.off`, `open.set.taken`, `open.news.evening`, `open.site.found` and `open.clue.found`.
- Merge settled on `3c07c36a7` with all 11 mission kinds, 8 storylines and both sides of each shared table; the Radio Hill hearth check directs `[voice]` only. Node 22.14.0, memory only: Radio Hill, Dry Pump, Flag, Hauler, Apprentice Run, Market Day, Runaway, checkpoints, world HUD, burned camp, open missions, threads, shared, sites, thread shape, roam and state all passed (17/17), as did the extra Mall Road Toll check, core (804), race replays (306), combat replays (12), world composition (65), and `npm run build`; no browser scenarios ran.
- **Removed**: None.
