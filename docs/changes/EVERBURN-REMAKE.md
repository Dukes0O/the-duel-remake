# EVERBURN-REMAKE slice 12: Slow Ride
Escort today: the shared actor mover follows path points; health at zero rests her, then returns her to the last point with at least 60 health.
Ambushes today: foot raiders walk to Bess; standing raiders within 30 m wear her health down; a car at 4 m/s within 2.2 m knocks them down.
Job 1 today: flame reports burnable barricade contacts to carry; the first burn event removes the solid; swept car contacts send riders into their existing ram retreat, and weapons damage them.
Job 3 today: bellows rule counts a new car meeting or solid impact at 20 km/h or more, held contact only once.
Job 1 ending today: worldJob.arrivalHold runs nine seconds, catches the forge at five, then finishes through the shared hold path.
Built: part 1 meeting, four queued lines, 60 m car start, Tin Road at 32 km/h, plain Moss/ring/hose drawing; no switches or saved fields changed.
Checks on this part 1 commit: test-everburn-job4 and git diff --check pass. test-run-gas fails its old job 4 speed assertion (9 vs 32/3.6 m/s); no assertion changed. test-field-battle stopped after exceeding three minutes without a result.
For Claude to run: final four-picture browser scenario and hand drive, once written.
Changed assertions: none yet; old job 4 speed assertion needs 9 to 32/3.6 m/s under design point 2. Codex decided: road-entry meeting, radius 6 m, stopped below 1 km/h; details in card.
Sound: meeting uses captions only; later load cues are not built yet.
**Removed:** job 4's Wash/bridge route and automatic start caption; two old ambushes, health rule and old text remain until the next parts replace them.
Next: load, blocks, raids, leaks, plugging, restart, arrival, Easy driver and browser scenario; then merge integration, final lane tier, replays and build. Part 1 is not a release candidate.
