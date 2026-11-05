# BOWL-SHOW

The short board entry controls current state, ownership, dependencies and locks.

Design section 7. `src/bowl/bowl-show.js`, no graphics: Car Crush, Freestyle, Side by Side, Last Truck Rolling as rules; five nights; crowd meter; scoring from events the game already makes (landed jumps with air time and distance, crushes, launches off cars). Big air off a car scores most. Donuts count by turning on the spot; flips by landed pitch (BOWL-AIR gives the number).

Follow `tools/test-stunt-trial.mjs`'s pattern. Scoring reads events only and never changes physics. Numbers are for feel: Claude tunes them in the browser, so tests check behaviour (a bigger jump scores more; a crowd meter climbs and falls) rather than exact scores.

**Checks:** new `tools/test-bowl-show.mjs`: a run scored from scripted events; the same events give the same score at 30, 60 and 144 frames; a launch off a car outscores an equal jump off a ramp; a night needs its events in order; losing just lets you try again.

Design: [docs/WASTELAND_WORLD.md](../../WASTELAND_WORLD.md). Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/BOWL-SHOW.md` with a Removed section. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key.
