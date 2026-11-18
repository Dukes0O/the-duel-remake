# EVERBURN-REMAKE slice 12: Slow Ride
Escort today: the shared actor mover follows path points; health at zero rests her, then returns her to the last point with at least 60 health.
Ambushes today: foot raiders walk to Bess; standing raiders within 30 m wear her health down; a car at 4 m/s within 2.2 m knocks them down.
Job 1 today: flame reports burnable barricade contacts to carry; the first burn event removes the solid; swept car contacts send riders into their existing ram retreat, and weapons damage them.
Job 3 today: bellows rule counts a new car meeting or solid impact at 20 km/h or more, held contact only once.
Job 1 ending today: worldJob.arrivalHold runs nine seconds, catches the forge at five, then finishes through the shared hold path.
Built: parts 1 to 4, meeting, Tin Road, GAS gauge, blocks, four alternating raids, holes and loss, map marks, permanent ram retreat and plain spray. No switches or saved fields changed.
Checks on parent a5c584972 plus this part: test-everburn-job4, test-everburn-job1, test-world-jobs, test-field-battle (4702 checks) and git diff --check pass. Final lane tier, replays and build not run yet.
Not green: test-run-gas stops at line 141 expecting job 4's removed two ambushes; later gas-run checks are not reached. Update its job 4 cases for the remake while retaining every gas-run and battle assertion.
For Claude to run: final four-picture browser scenario and hand drive, once written.
Changed assertions: job4 health-isolation check gas 73 becomes 72.95 with one hole for 0.1 s (point 5); historical audio projection excludes only the new world.bess.leak cue, keeping its old hash. Pending: old job4 speed 9 to 32/3.6 m/s (point 2), two old ambushes to four car raids (point 5), old health/restart assertions to gas rules (points 3, 7, 9).
Codex decided: meeting, gauge wording, clear raid posts and tank working range are in the card. New checks add no changed older tolerances.
Sound: raids use world.ashmen.horn; holes use world.bess.leak from a bank recipe. Block burning and ram movement keep their existing events. Plug and flash are next.
**Removed:** job 4's Wash/bridge route, automatic start caption, health display, health wear and rest rule, and its two old long-road ambushes; old step text remains until the later parts replace it.
Next: flash, plugging, restart, arrival, Easy driver, old job4 suite cases and browser scenario; then integration merge, final checks and build. This is not a release candidate.
