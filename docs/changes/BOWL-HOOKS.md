# BOWL-HOOKS: Show Night in the game (titan-bowl, dev)

**What changed.** A SHOW NIGHT button in the yard and on the main menu opens a night picker. A player with no Titan is lent the show's truck at factory settings, and it is never saved. `src/bowl/bowl-night.js` runs the night's three events from `bowl-show.js`: Car Crush, Freestyle with two parked cars to launch off, and Side by Side against one computer truck. The Duel calls it from `step` and `emit`. Its parts are a HUD with the crowd meter and Big Mo's caption, a card between events (a loss is a retry), and the results with the purse, settled once through `settleShowNight`. Every word on screen is in `src/bowl/bowl-lines.js`. The Bowl leaves the circuit list and the course screen, so every drive there is in a truck. Nights three to five wait for BOWL-RIVALS (Last Truck Rolling). The purse amount is asked in `docs/board/questions/BOWL-HOOKS.md`.

**Checks.**
- On d5310a3 (current integration merged in): `tools/test-bowl-night.mjs`, the one scripted night with saves, purse and words (216 checks).
- On the same commit, the other Bowl suites, `test-titan-car-launch` and `test-feature-flags` passed.
- Lane tier on d5310a3: 75 passed and 3 failed, with replays at 297 checks.
  - `test-drive-through` and `test-full-check` are laptop-only, and the first also needs history the shallow clone lacks.
  - `test-race-field` fails with the same hash on unchanged integration/wasteland at 80d6ab9.
- After the review fixes, on efe39b4: the lane suites picked since d5310a3 (32 passed, the same two laptop-only suites failed), and `npm run build` passed.
- Not run here: browser scenario `bowl-night-pay`, play by hand, frame check.

**Review.** An independent review of the pay and save path found and confirmed three faults, all fixed: a Lab lap saved during a night, the menu's seed not restored after a night, and a purse written into a newer Wasteland save.

**Changed assertions.** None. A new check in `test-bowl-night` covers the newer-save refusal added to `bowl-save.js`.

**Removed:** The Bowl's place in the menu's circuit list and the course screen. Show Night replaces it as the only way in.
