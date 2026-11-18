# EVERBURN-REMAKE slice 12: Slow Ride
Escort today: the shared actor mover follows path points; health at zero rests her, then returns her to the last point with at least 60 health.
Ambushes today: foot raiders walk to Bess; standing raiders within 30 m wear her health down; a car at 4 m/s within 2.2 m knocks them down.
Job 1 today: flame reports burnable barricade contacts to carry; the first burn event removes the solid; swept car contacts send riders into their existing ram retreat, and weapons damage them.
Job 3 today: bellows rule counts a new car meeting or solid impact at 20 km/h or more, held contact only once.
Job 1 ending today: worldJob.arrivalHold runs nine seconds, catches the forge at five, then finishes through the shared hold path.
Built: parts 1 to 8, meeting, Tin Road, GAS gauge, blocks, four raids, holes, loss, map marks, permanent ram retreat, spray, flame flash and six-second plugging with a two-hole stop, existing furnace pacing and gas checkpoint restarts. No switches or saved fields changed.
Checks on this restart commit (parent 54e2f784a): test-everburn-job4, test-world-jobs, test-repo-hygiene and git diff --check pass; test-field-battle passed 4702 checks on part 5; not repeated after part 6 because it ran over three minutes. Final lane tier, replays and build not run yet.
Not green: test-run-gas stops at line 141 expecting job 4's removed two ambushes; later gas-run checks are not reached. Update its job 4 cases for the remake while retaining every gas-run and battle assertion.
For Claude to run: final four-picture browser scenario and hand drive, once written.
Changed assertions: job4 health-isolation check gas 73 becomes 72.95 with one hole for 0.1 s (point 5); historical audio projection excludes the new world.bess.leak, world.gas.flash and world.bess.plug cues, keeping its old hash; hole-only drawing count excludes the added flash mesh. Pending: old job4 speed 9 to 32/3.6 m/s (point 2), two old ambushes to four car raids (point 5), old health/restart assertions to gas rules (points 3, 7, 9).
Codex decided: meeting, gauge wording, clear raid posts, tank working range and a 0.35-second flash are in the card. New checks add no changed older tolerances.
Restart: cleared blocks keep their gas reading; a dry tank uses the shared restart at that block, or the start at 100, with holes plugged.
Sound: raids use world.ashmen.horn; holes use world.bess.leak from a bank recipe. Block burning and ram movement keep their existing events. Flash uses world.gas.flash and plugging uses world.bess.plug, both bank recipes.
**Removed:** job 4's Wash/bridge route, automatic start caption, health display, health wear and rest rule, and its two old long-road ambushes; old step text remains until the later parts replace it.
Next: arrival, Easy driver, old job4 suite cases and browser scenario; then final checks and build. Integration 9c7509e3a is merged; the scene conflict keeps both gas drawing and the new lamp surface. This is not a release candidate.
