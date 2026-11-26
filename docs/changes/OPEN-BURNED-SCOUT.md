# OPEN-BURNED-SCOUT

- Merged current integration at `b15a7109d`; finished Claude's two answers in code commit `b4283980c` (Node 22.14.0).
- Kept the runner and beats. Added two lookout buggies and figures on solid wreck heaps, heading and hill sight, the authored `scoutGullyRoute`, trail rows and fourteen background Rats with no talk or ledger entries.
- The shared events remain `threadMission`, `threadMissionOutcome` and `threadMissionSpotted`; the last now timestamps the climbing and falling flare with its short smoke trail. Holds release on completion or departure. `story-choices` stays dev.
- Card checks: `test-open-missions` passed, including every gully segment on real terrain, car slope limits, the watched plain road, two riders, crowd clearance, trail, flare, rim marks and leaving without an outcome.
- At `b4283980c`, rule 23 passed 6/6 with jobs 2: core 804, race replays 306, combat replays 12, world composition 65, missions and threads. Fingerprints and signatures are unchanged. `npm run build` passed.
- At `b4283980c`, affected suites passed 13/13: burned-camp, open-checkpoints, open-roam-start, open-roam, open-routines, open-shared, open-sites, open-state, story-people, glasshouse-look, thread-crossings, thread-shape and browser-scenarios (Node mocks only).
- Handoff tree: board 716 checks and repository hygiene passed; status refreshed. Generated build, temporary fixtures and crossings page were recycled inside this lane.
- `thread-crossings.mjs --check` exits 1 for exactly three intended stubs: `alone` and `drain` belong to OPEN-BURNED-PEN; `home` belongs to OPEN-BURNED-RESCUE. `scout` and `rim` have ways out.
- Assertions: this continuation adds checks and changes no existing assertions or pinned numbers. The earlier runner assertions still need Claude's rule 18 review.
- Sound cues: `open.scout.seen` and `open.lookout.flare`, retained for OPEN-SOUND to register.
- **For Claude to run:** `open-burned-scout`, with memory-only saves. Review the gully drive, lookout heaps and figures, rim and flare. No Chrome or browser scenario ran here. Claude reviews and pushes PR 93.

**Removed** The `scout` stub and the handoff's placement dependency. OPEN-BURNED-PEN and OPEN-BURNED-RESCUE own the three branches after the rim.
