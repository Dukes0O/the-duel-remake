# BOWL-TURNS: Turn Show (titan-bowl, dev)

**What changed.** TAKE TURNS on the Show Night picker opens the Turn Show: pick two to four named players in driving order, a level and a night open for all of them. `src/bowl/bowl-turns.js` holds the rules: one go each at every event, event by event; every go opens on "NAME IS UP. PASS THE KEYBOARD." and starts only on a fresh key press. The driver is the active player for their go, which runs as a one-event night (`startBowlNight` with `eventIndex` and `turn`: no restart, no purse of its own). Each go saves its score to its driver's own bests; winning all three events wins the night in that player's save with its purse, paid once. The scoreboard ranks events won, then points, and the host is active again at the end. Screens in `src/bowl/bowl-turns-screens.js`, words in `bowl-lines.js`, sounds `bowl.turn.up` and `bowl.turn.winner`. Picks asked in `docs/board/questions/BOWL-TURNS.md`.

**Checks.**
- `tools/test-bowl-turns.mjs`: order, scoreboard, and two players taking turns in the real App, each save getting only its own (a third player's save byte for byte unchanged), leaving midway, old saves: PASSRESULT.
- The other Bowl suites, `test-feature-flags`, `test-app-lifecycle` and `test-browser-scenarios` passed on 7e84276.
- LANERESULT
- `npm run build` passed on 7e84276.
- Not run here: browser scenario `bowl-turns`, play by hand, the laptop-only suites.

**Review.** REVIEWRESULT

**Changed assertions.** None.

**Removed:** Nothing. The Turn Show adds a way to play Show Night; the solo night is unchanged.
