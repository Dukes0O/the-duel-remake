# EVERBURN-REMAKE slice 12: Slow Ride
Escort today: the shared actor mover follows path points; health at zero rests her, then returns her to the last point with at least 60 health.
Ambushes today: foot raiders walk to Bess; standing raiders within 30 m wear her health down; a car at 4 m/s within 2.2 m knocks them down.
Job 1 today: flame reports burnable barricade contacts to carry; the first burn event removes the solid; swept car contacts send riders into their existing ram retreat, and weapons damage them.
Job 3 today: bellows rule counts a new car meeting or solid impact at 20 km/h or more, held contact only once.
Job 1 ending today: worldJob.arrivalHold runs nine seconds, catches the forge at five, then finishes through the shared hold path.
Built: parts 1 to 3, meeting, Tin Road, hose, GAS gauge and three mapped blocks; shared barricade flame contacts and car retreat, four-second burns, 20 km/h knock, 25 m stop and eight-second restart. No switches or saved fields changed.
Checks on parent ad46571c2 plus part 3: test-everburn-job4, test-everburn-job1, test-world-hud, test-world-jobs, test-field-battle (4702 checks) and git diff --check pass. test-run-gas still fails its old job 4 speed assertion (9 vs 32/3.6 m/s); later gas checks are not reached.
For Claude to run: final four-picture browser scenario and hand drive, once written.
Changed assertions: none yet; old job 4 speed assertion needs 9 to 32/3.6 m/s under design point 2. Codex decided: meeting details and hole-count sentences are in the card.
Sound: meeting uses captions only; blocks reuse the existing burn event and car ram movement; later load cues are not built yet.
**Removed:** job 4's Wash/bridge route, automatic start caption, health display, health wear and health rest rule; two old ambushes and old text remain until the next parts replace them.
Next: raids, leaks, plugging, restart, arrival, Easy driver and browser scenario; then merge integration, final lane tier, replays and build. This is not a release candidate.
