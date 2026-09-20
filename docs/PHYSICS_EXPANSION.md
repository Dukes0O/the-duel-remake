# Wall scrapes and natural jumps

Tunnel lining and guardrails now allow a shallow sliding hit without consuming a crash slot. Incidence is measured between travel and the contacted wall face: below 35° scrapes and slows the car; at 35° or above the existing impact-speed crash threshold still applies. Reverse travel and sideways pushes count. Rail ends, ordinary buildings, rocks, trees and posts remain solid. Vehicle-to-vehicle responsibility rules are unchanged.

Courses marked `airborne: true` use the existing gravity-based jump model for the player, rival, traffic and pursuit car. A fast car can leave a convex crest; the same crest remains grounded at low speed. No launch impulse is scripted. Other road courses keep their former behavior. Natural jumps do not award arena ramp points or satisfy stunt objectives. Pause freezes flight, and recovery clears height, vertical velocity and scoring history.

Natural-road flight uses the authored smooth road height and the tangent velocity between simulation steps. This avoids false hops at the old 8 m sample boundaries. A descending convex crest can also launch; landing rejoins the road's tangent instead of creating another hop. The existing arena launch threshold, gravity and scoring timing are unchanged. Across all seven new crests, tests keep cars grounded at 30 and 70 mph and produce one launch and landing at 150 mph, with peaks of about 3.2–5.3 m.

Specialist drivers modify only their documented car-specific acceleration, grip, braking or loose-surface grip after garage upgrades. The neutral driver and off-specialty pairings retain exact original stats and timing keys. Active modifiers are included in the record signature. Rivals do not inherit player driver bonuses.

`tools/test-physics-expansion.mjs` checks the 35° boundary, rotated walls, both approach sides, reverse/side-push contacts, ordinary solids, low/high-speed crests, NPC flight, reset safety and identical 30/144 FPS input-driven flight. Existing arena, reverse, contact and no-ram tests remain regression guards. Visual airborne placement uses the existing `airHeight` and `airborne` state; this change adds no route geometry or rendering work.

## Traffic heading recovery

The full-race baseline exposed a real traffic defect on Alpine Serpent. One sedan kept a 0.65-radian contact angle (about 37°) while travelling straight along its lane. Its permanently diagonal collision shell was wider than the demo driver's passing clearance. The F42 automatic then hit the same car five times on lap two. The contacts happened on the road, not during flight; changing the crest or forgiving player impacts would not address the cause.

Moving traffic now eases its heading toward its actual lane-return path, at no more than 0.95 radians per second. The rate scales down with speed, and a stopped car does not pivot into the player. Oncoming recovery uses the correct travel direction. Existing lane positions, forward integration, acceleration, braking, player-impact responsibility and yielding rules remain intact.

The exact failing race became a clean two-lap win at 141.23 seconds. Its flight measurements were unchanged: 3.375 seconds airborne and an 8.946 m peak gap above the road. Focused checks passed: 43,170 NPC yielding/recovery assertions, 195 contact-damage assertions, 241 reverse assertions and 16,755 NPC route assertions. These include stationary player protection, both travel directions, gradual recovery from either contact angle and unchanged straight-lane movement.

## Full-race driving method

`node tools/test-expansion-driving.mjs` runs all six expansion circuits with the Falcone F42 and Stuttgart 959-S, automatic and manual transmissions, at 30 and 144 display FPS: 48 complete-race attempts. Every run starts through App with the neutral Club Driver, no upgrades, the default Easy CPU, and a fresh in-memory account. It never reads or writes a real player's save.

The fixture enables the existing demo input controller and sets `_scriptedCrashDone` after starting. This skips only its deliberate shoulder excursion so the test measures the track line. Steering, pedals, gear shifts, collisions, traffic, jumps, checkpoints and results all pass through the normal fixed-step simulation. No position, progress, lap, score or result is fabricated. Read-only observers measure every physics step and hash the actual input and movement sequence for exact 30/144 FPS comparison.

`--baseline` limits the test to six F42 automatic runs at 30 FPS. `--course=alpine-serpent --baseline --diagnose` also captures the actual pre-impact poses and controls when investigating a contact. Completion, two laps, a default-CPU win, finite state and no checkpoint/boundary resets remain strict assertions.

## Unskipped core verification

The full `node src/test.js` run, with `DUEL_SKIP_CAMPAIGNS` explicitly unset, passed **550 checks with zero failures** in **799.052 seconds**. All 60 original campaign combinations completed, winning all 180 stages. There were no catastrophic or life-exhaustion losses. The run also covered the standalone-event replays at both display rates and the Hard chase after three forced recoverable crashes.

The old mixed-biome assertion now applies to the original mixed routes. The six standalone circuits instead have explicit unique-ID and named-sector checks, allowing deliberately single-biome Alpine Serpent and Red Mesa. Existing special-event fixtures select their recommended vehicle explicitly; ordinary standalone circuits use the F42. No crash, lap, win, finite-state or display-rate comparison was relaxed.

This core run used the frozen gameplay, tunnel and terrain code before the final Neon gantry sightline clearance change. That later change affects roadside scenery, not the road line or handling. The final expansion matrix below uses the later source.

## Final expansion matrix

The final-source rerun passed **48 of 48 complete two-lap races**, with **48 wins**, **648 checks** and **zero failures**, in **194.026 seconds**. All 24 car/transmission pairs produced identical per-step input and motion hashes at 30 and 144 FPS. There were no missed-checkpoint resets, boundary resets or landing-caused crashes.

Times below are two-lap result times, including any crash penalties. Air gap is height above the road beneath the car, not altitude above sea level. Each row includes two cars, two transmissions and two display rates.

| Circuit | Wins | Result time (s) | Total airborne time (s) | Peak air gap (m) |
| --- | ---: | ---: | ---: | ---: |
| Eifel Crown | 8/8 | 161.25–229.83 | 2.608–2.733 | 4.339–5.485 |
| Alpine Serpent | 8/8 | 134.73–141.27 | 3.200–3.383 | 8.412–8.946 |
| Azure Riviera | 8/8 | 125.80–160.48 | 3.058–3.108 | 7.846–8.133 |
| Red Mesa Corkscrew | 8/8 | 114.09–120.08 | 2.217–2.333 | 2.502–3.456 |
| Neon Docks Circuit | 8/8 | 118.08–121.03 | 2.617–2.692 | 2.397–2.727 |
| Cloudbreak Skyway | 8/8 | 143.65–145.51 | 5.167–5.225 | 6.137–6.396 |

The Stuttgart manual had two head-on traffic impacts on Eifel and one on Azure, identically at both display rates; it still completed and won. All other tested setups were clean. These legitimate player/demo-initiated impacts were not disabled or excused. The tests demonstrate input-driven track usability and deterministic simulation for these two cars, not that every car or every driving line has had a complete-race review.
