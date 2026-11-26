# OPEN-T-HAULER

- Added the Hauler, its physical sign, people, repair, choices, return news, and reusable fight, escape and escort rules behind `story-choices`.
- The storyline file and page are unchanged. Runtime picks and added hooks are in `docs/board/questions/OPEN-T-HAULER.md`.
- Checked HEAD `4632151bb` plus the staged escort safety and label fix, tests and scenario: tree `7f4c02c4d4191e6929c63d5ffa16778dc2887d84`.
- Passed: Hauler, open missions, threads, shared, thread shape, checkpoint and world HUD suites. Scenario page functions parse without Chrome.
- Rule 23 at `d8233231e`: 7/7 passed with `--jobs 2`; core was 804/804. Later fixes used targeted suites and the three guards.
- Final targeted run: 6/6 passed with `--jobs 2`. Build, board (743 checks) and repository placement passed. No Chrome, browser scenario or frame check ran.
- Fingerprints: 306 race replay checks, 12 combat replay checks and 65 world-composition checks unchanged in the completed runs.
- Crossings: Hauler is sound. The global command exits 1 for the three existing burned-camp beats assigned to OPEN-BURNED-PEN and OPEN-BURNED-RESCUE.
- Changed assertions: none. The older checkpoint fixture finishes the Hauler so the director cannot reserve its test road; its assertions stay unchanged.
- OPEN-SOUND owes: `open.hauler.seen`, `open.trap.sprung`, `open.hauler.mended`, `open.tyres.lost`, `open.hauler.horn`, `open.scout.seen`.
- **Removed:** Generated build and test scratch output sent to the Recycle Bin. No feature replaced. Goods sales remain deferred as the page directs.
- **Look owed:** Patience needs a worn red six-wheel truck, blue door and tyre cart; the trap needs matching red doors, fresh paint and flat cover. Tally, waving, shaft lifting and the slag lookout need their own look.
- **For Claude to run:** `open-stranded-hauler`, the hand drive and independent review, then push and PR. Cockpit sync stays with Claude outside this lane.
