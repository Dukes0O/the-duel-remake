# QA-WATER-ROAD-AUTOPILOT: `water-road` ("the autopilot wins Sal's road on Easy within three tries")

**Cause: the scenario, not the autopilot or the rules.** The autopilot and the race are repeatable: the same seed (route A, seed 1989) and the same inputs always give the same race, and the game's loop steps the rules in fixed 1/120 s steps whatever the frame time. What varied was the moment the autopilot took the wheel. The scenario clicked START, waited for the game's own loop to reach GO (polled every 250 ms), and only then stopped the loop and switched the autopilot on, so the race ran with nobody driving for as long as the script took to get round to it. That stretch is real time, so it changes with the load, and Sal's Easy car drives off meanwhile. On the first try the script also took a picture and read the caption first.
Evidence, same commit, idle laptop, the old scenario's race step with the takeover time printed: try 1 took over 1.84 s into the race (the car still on the line) and lost (113.8 s, Sal not beaten); try 2 took over 0.25 s in and won (108.04 s). So try 1 always lost, and tries 2 and 3 lose as soon as the gap grows (as when other jobs run beside it). Without the screen, the same race with the autopilot starting after 0 to 24 s of idle gives wins and a finishing time that moves with the gap (107 s to 185 s).
Nothing random: no `Math.random`, no frame-timed input, and no unseeded draw feeds the race (searched `src/` for `Math.random`, `Date.now`, `performance.now`: only visual effects, saves and audio).

**Cure** (scenario only, `tools/scenarios/water-road.mjs`, step 3): the app's loop is stopped before START; the countdown and the race are stepped by hand, 1/60 s a step, so the autopilot takes the wheel at exactly the first moment of the race, every run. The picture and Hollis's line at GO are taken with the race held still at 0.0 s. A moment when the renderer is not presenting a frame is waited for, never skipped. The fact is not loosened and there are no more tries (still three).

## Checks
- `water-road` browser scenario, new code, idle laptop: won on the first try in 107.82 s, 18 of 18 facts. Run again under four busy processes of the laptop's own: the same race, won on the first try in 107.82 s, 18 of 18 facts. Two loads, one race.
- Run twice, at different loads, the same race: 107.82 s and a first-try win both times. Before the cure the same laptop idle lost try 1 (113.8 s) and won try 2 (108.04 s).
- Lane tier on `99c8b063a` (integration merged in): 29 passed, 0 failed, 0 not run; replay fingerprints 297 checks across 33 cases unchanged (no `src/` change in this card). `npm run build` passes.

## Changed assertions
None. The fact's wording and its three tries are unchanged.

## Removed
The scenario's real-time wait for GO before the takeover. Nothing else.
