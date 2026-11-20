# BOWL-TURNS: Turn Show (titan-bowl, dev)

**What changed.** TAKE TURNS on the Show Night picker opens the Turn Show: pick two to four named players in driving order, a level and a night open for all of them. `src/bowl/bowl-turns.js` holds the rules: one go each at every event, event by event; every go opens on "NAME IS UP. PASS THE KEYBOARD." and starts only on a fresh key press. The driver is the active player for their go, which runs as a one-event night (`startBowlNight` with `eventIndex` and `turn`: no restart, no purse of its own). Each go saves its score to its driver's own bests; winning all three events wins the night in that player's save with its purse, paid once. The scoreboard ranks events won, then points, and the host is active again at the end. Screens in `src/bowl/bowl-turns-screens.js`, words in `bowl-lines.js`, sounds `bowl.turn.up` and `bowl.turn.winner`. Picks asked in `docs/board/questions/BOWL-TURNS.md`.

**Checks.**
- `tools/test-bowl-turns.mjs`: order, scoreboard, two players taking turns in the real App with each save getting only its own (a third player's save byte for byte unchanged), leaving midway, old saves: 297 checks on f0217b1, on the 160 m Bowl, every place read through `bowlLayout(course)`.
- On f0217b1 (integration/wasteland 73d40fe merged): the other Bowl suites, `test-feature-flags` and `test-browser-scenarios` passed; lane tier 84 passed and 3 failed: `test-drive-through` and `test-full-check` are laptop-only, `test-test-runner` (81 package commands, 80 expected) fails the same on unchanged integration/wasteland. `npm run build` passed.
- Before the merge, on 7e84276 and 6259171: lane tier 140 passed; `test-race-field` failed with the same hash on integration.
- Not run here: browser scenario `bowl-turns`, play by hand, the laptop-only suites.

**Review.** An independent review of the save path found no go, best or purse credited to the wrong save. It found one fault, now fixed: a held Enter could repeat onto the next player's READY button and start their go. Its two minor notes come from ordinary player selection: picking a player on a new day steps a burning fire, and the host is selected again at the end.

**Changed assertions.** None.

**Removed:** Nothing. The Turn Show adds a way to play Show Night; the solo night is unchanged.
