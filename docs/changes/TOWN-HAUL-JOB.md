# TOWN-HAUL-JOB: the town's first drive, hauling salvage (switch `wasteland-town`, dev)

**What changed.** A haul step (`src/world/jobs/steps/haul.js`): at the pile the gang lifts a piece on every 3 s while the truck stands still, the player drives off when they have enough, each tonne lowers the knock that throws a piece off, rough ground taken fast rattles pieces loose, and unloading at the drop ends the job with what was delivered and lost. The weight on the bed is put on the flatbed (TOWN-VEHICLES' sums). `src/world/jobs/town-jobs.js` holds Chapter 3 ("What We Can Find"), the repeatable salvage run and the steel run, and the run that ticks the town once each 10 real seconds, sends serious news to the radio at most once a minute, and settles one mission result per run id (`src/town/town-missions.js`) before saving the town. Mission card in the town screen (`src/town/ui/town-mission-card.js`). Hooks: `world-job.js` (town-job kind, weight, captions, cues), `app.js` (`startTownJob`, clock, settle, retry), `world-hud.js` (line, LOAD gauge), `screen-arena.js` (result sentence), `work-vehicle-view.js` (stack on the bed, fallen pieces). Cues: `world.bellows.load` (piece on or off), `vehicle.crush` (piece thrown off), `interface.bonus` (delivered); radio news uses the story radio's click.

**Checks.** `node tools/test-town-haul-job.mjs`: 10 of 10 (child-pace driver on Easy finished 10 of 10). Lane tier on `a079219` (128 suites); see the pull request for its result and reruns. `npm run build` passed.

**Changed assertions.** None in older suites.

**Race fingerprints and world signatures.** Unchanged: no course, ground or released replay is touched; the replay guard runs in the lane tier.

**Save review.** One independent review of the save path; its faults are fixed and listed in the pull request.

**Removed:** nothing; this card adds the first town job and replaces nothing.
