# LAB-HELI-CHALLENGES

The Lab's six helicopter challenges (docs/LAB.md 4.1 and 4.2), as goals in the helicopter session checked like flying lessons. Switch `lab` (dev); nothing here is reachable by a player yet (LAB-VIEW draws the board button and the pad menu). With the Lab off, or on with no challenge started, the session behaves exactly as before.

## What was added

`src/lab/lab-challenges.js`: the pure rules. `challengeSpots(id, world, site)` picks where things go from the course alone, `createChallenge`, `stepChallenge(ch, view, dt)` (running, passed or retry, with a cue, events and a reason), `challengeProps` (what the scene draws) and `challengeBriefing` (what the board shows). It uses the helicopter's own rule functions (`spreadStep` and `applyWater` for the fire, `clearCircle` for the pendulum target), never copies.

| Challenge | Start | Passes when |
| --- | --- | --- |
| Lift | the Dusthawk waits by the pad; tank must be full | the Dusthawk is on the hook 2 to 5 m off the ground within 6 m of the pad, 10 s in a row |
| Projectile motion | the bucket, three buoys on the home lake | each buoy has a drop land within 5 m; the pass moves the Lab drop ring down one (`passLesson`) |
| Fire triangle | a practice fire (6 by 3 cells) on the lake shore, lit at one end, one spread step every 30 s | it has not reached the far column ("the road") after 180 s, or is out. Water and the retardant line act on it |
| Pendulums | the Falcone waits by the pad, a target about 500 m away | set down within 25 m of the target with a swing under 1 m at let-go; dropping it from height or letting it swing sends the pilot back |
| Air and altitude | a 300 kg crate; Summit Run must be open | the crate set down in Summit Run's landing zone, helicopter landed with at least 30% of the tank; fuel bought or sent by the truck after the crate was lifted ends the try |
| Headings | a smoke marker 550 m from the pad at 70 degrees; no arrow, no autopilot | the helicopter is within 30 m of the marker and under 20 m above the ground |

The session (`src/heli/heli-session.js`) offers `challengeBoard()`, `startChallenge(id)` and `stopChallenge()`, and `view().challenge` (`{id, elapsed, briefing, props}`) only while one is active. Starting needs the Lab, the home pad on the ground, an open challenge, no lesson and a free hook (the bucket may stay on for the two water challenges and the heading flight). Leaving, crashing, starting a lesson or leaving the course ends the try with no cost beyond the usual repair, and removes the Lab's cars and crate; the Air and altitude crate alone goes with the pilot on the cruise. A failed try starts again on the pad with a fresh load or fire. A pass saves `lab.done[id]` through the Lab's own save call. Lab loads are never owned cars or jobs, so they cannot be placed, delivered or paid for.

`src/lab/lab-heli.js` re-exports the challenge API and adds `passLabChallenge`, `labChallengesDone` and `labChallengeOpen`, because `src/heli/` imports the Lab only through that file. `tools/test-heli-mode.mjs` gained one entry in its hooks object letting `src/lab/lab-challenges.js` import helicopter rules files (flight, fire, search) and no drawing file. No assertion changed.

Sound: `heli.buoy-hit` is emitted as a `cue` event when a buoy is hit. The cue is made and registered by LAB-RADIO; the board button, pad menu and scene drawing of the props are on LAB-VIEW (both cards carry a line about it).

## Decisions (approved by Claude, 24 October; see "Claude answers" on the card)

The practice fire first sat beside the pad at 9 by 5 cells and one step every 20 s. Flown with a scripted pilot it could not be won: the nearest water is 494 m from the pad, so the first drop lands after 110 s, by when about 25 cells are alight and a 540-litre drop puts out four. It now lies on dry ground on the lake shore, 6 by 3 cells, one step every 30 s: left alone it reaches the road at 150 s, and a scripted pilot who scoops and drops keeps it back for the 180 s. The mission fire is untouched. The 30% fuel rule for Air and altitude stays (an efficient flight to Summit Run lands with about 37%). Lift measures the load's height above the ground, not the helicopter's.

## Tests

`tools/test-lab-challenges.mjs` (23 tests). Rule numbers match the design; the spots are over water, clear, at the stated heading and distance, and the same every time. Each goal passes for a scripted good flight and fails for a bad one (rules driven by scripted views). Flown through the real session: the heading flight, the Dusthawk lift, the Air and altitude flight through the cruise to Summit Run (an efficient flight passes; 110 s of dawdling at the pad sends the pilot back for fuel), the Pendulum (carried across the woods and set down passes; released from height sends the pilot back), Projectile motion (scoop from the lake, aim with the ring, drop on three buoys; an unaimed drop hits none) and the Fire (scoop from the lake and drop on the practice fire passes; staying away sends the pilot back at 150 s). Lifecycle: Lab off offers nothing and the view has no `challenge` key; start and stop on the pad; a lesson ends the try; no arrow or autopilot in the heading flight, and the arrow comes back only if the pilot did not change it meanwhile; leaving costs nothing and passes nothing. Mutation checks: undoing each review fix below makes its test fail.

Existing helicopter suites and `test-lab-*`, `test-save-fixtures` pass with no assertion changed (`test-heli-mode` 178 checks after merging integration).

## Independent review

A fresh reviewer read the code and flew scripted sessions. It found four real faults and a few nits, all fixed and tested: (1) a fitted bucket blocked every start, including the two that need it, and Projectile and Fire could be started with forest fires off though they cannot be passed (now the bucket is allowed for Projectile, Fire and Headings, refused with "Take the bucket off first." for the others, and the board shuts the water challenges without forest fires); (2) Air and altitude could be passed with a full tank after running dry and taking the fuel truck (any refuel after the crate was lifted now sends the pilot back); (3) the Pendulum matched a let-go car by id, so releasing the player's own car of the same make reset the try (now only the Lab's car on the hook counts); (4) every challenge swallowed bucket water meant for a real fire (now only Projectile and Fire take it). Nits fixed: an unused helper, a refused carry lesson still ending the try, and the heading flight losing the pilot's destination (now given back unless the pilot changed it, which a second review round caught for a dropped job). It also asked whether the Fire could be flown at all, which led to the practice fire change above. Its check that, with the Lab off or on with no challenge, a 6,000-step scripted session gives the same events, views, profile and lesson board as `origin/integration/wasteland` came out identical. Nits left as they are: a Lab car dropped from height is charged the usual repair; the practice fire's cells all carry one height for drawing (LAB-VIEW can look the ground up).

## Lane tier and build

Run once on the branch after merging current `origin/integration/wasteland` (25 October): `node tools/run-tests.mjs --tier lane --changed --jobs 8 --keep-going`: 39 passed, 3 failed. The three fail identically on an untouched integration checkout and are laptop-only suites: `test-earned-cars-ui`, `test-course-kit`, `test-medals`. `npm run build` passes. Card checks, passing: `tools/test-lab-challenges.mjs` (23 tests), `tools/test-heli-mode.mjs`. Not run in the cloud: browser scenarios and the full tier.

## Removed

Nothing.
