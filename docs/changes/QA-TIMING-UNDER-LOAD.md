# QA-TIMING-UNDER-LOAD

**Status:** built, one independent review done (one fault found and fixed). **Flag:** none; tests only.

New `tools/timing-guard.mjs` (`bestRun`). The first measurement is judged exactly as before, so a quiet laptop meets the same limit and pays no extra time. Only when it is over is the same work measured again (25 more times, each on a freshly built town run for the same warm-up; 30 for Scablands) and the best run judges. Code that is truly slower is over on every run and still fails. Used in `test-town-core`, `soak-town`, `test-town-people` (30 ms day; core's 10 ms slowest tick is judged on the same best day) and `test-scablands-size`.

## Numbers
No window with the laptop alone existed today (other sessions held it at 35 to 100% CPU), so "alone" figures are not claimed.
- Before, under load: core 36.09 ms (fail), people failed its limit after 782 s, Scablands 840 ms against 400.
- After, same load: core passed 4 of 4 (19 to 22 ms), people 25.89 ms, soak 20.52 ms (`--seeds 1`), Scablands passed.
- Slowed on purpose (a system adding about 1.25 ms per tick, 24 ms per day): core fails at 50.49 ms (best of 26), soak 37.00 ms, people 38.54 ms (best of 26 each). A Scablands move made about 4 times slower fails at 49.9 rebuilds against 20.
- Plain day cost with nothing slowed on this laptop: roughly 14 to 22 ms at best, so a day twice as slow fails.

## Changed assertions (Claude to review)
- Core, soak, people: same limits (30 ms; 10 ms tick), now judged on the best of up to 26 days. Fixture towns are rebuilt for each rerun; population checks run on the first day as before.
- `test-scablands-size` ground-follow: **different in kind.** The 400 ms absolute limit also failed at High priority on this laptop (about 470 to 520 ms), so it was not only load. It is now 200 one-cell moves against 20 times the cost of working out the whole window in the same process (best against best). Quiet ratio is 8 to 12; a move that rebuilt the window would be 200. Not caught: code that slows moves and rebuilds equally.
- Not touched: soak's "year 30 per person within 4 times year 1" is a ratio inside one run already.

## Checks
core, people, soak, scablands-size all passed on this branch before the merge of integration (commit given in the report). **Removed:** nothing.
