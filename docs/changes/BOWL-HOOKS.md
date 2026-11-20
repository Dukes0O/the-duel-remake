# BOWL-HOOKS: Show Night in the game (titan-bowl, dev)

**What changed.** A SHOW NIGHT button in the yard and on the main menu opens a night picker. A player with no Titan is lent the show's truck at factory settings, and it is never saved. `src/bowl/bowl-night.js` runs the night's three events from `bowl-show.js`: Car Crush, Freestyle with two parked cars to launch off, and Side by Side against one computer truck. The Duel calls it from `step` and `emit`. Its parts are a HUD with the crowd meter and Big Mo's caption, a card between events (a loss is a retry), and the results with the purse, settled once through `settleShowNight`. Every word on screen is in `src/bowl/bowl-lines.js`. The Bowl leaves the circuit list and the course screen, so every drive there is in a truck. Nights three to five wait for BOWL-RIVALS (Last Truck Rolling). The purse amount is asked in `docs/board/questions/BOWL-HOOKS.md`.

**Checks.**
- `tools/test-bowl-night.mjs`, the one scripted night with saves, purse and words: 215 checks on d5310a3, 216 on efe39b4.
- On the same commit, the other Bowl suites, `test-titan-car-launch` and `test-feature-flags` passed.
- Lane tier on d5310a3: 75 passed and 3 failed, with replays at 297 checks.
  - `test-drive-through` and `test-full-check` are laptop-only, and the first also needs history the shallow clone lacks.
  - `test-race-field` fails with the same hash on unchanged integration/wasteland at 80d6ab9.
- After the review fixes, on efe39b4: the lane suites picked since d5310a3 (32 passed, the same two laptop-only suites failed), and `npm run build` passed.
- Not run here: browser scenario `bowl-night-pay`, play by hand, frame check.

**Review.** An independent review of the pay and save path found and confirmed three faults, all fixed: a Lab lap saved during a night, the menu's seed not restored after a night, and a purse written into a newer Wasteland save.

**Director's laptop check.** The first picture was taken before the Bowl was drawn (the menu's last frame under the new HUD). The scenario now waits for the stadium and the Titan, and its picture names are lower case. An App-level check (`test-bowl-night`, 226 checks) covers the course, car, save and way out. The lane suites picked since 7c2ef0c pass on 9fde19c (31 of 31), and so does the build. Chromium here showed the Bowl and the Titan. Two faults were fixed: the Car Crush started in the ring's tight bend, so it now starts at 78, and a truck grinding a wall never ended its run. The crowd gains 0.15 a point and loses 6 percent a second, with Freestyle targets at 500, 800 and 1,100.

**BOWL-EXPAND.** Every distance now comes from the course through `bowlLayout(course)`, and the rows each level needs are a share of the course's rows. Today's Bowl gives the same places: a start at 78, parked cars at 62.6 and 73.2, lanes at 3.05 m. On 3f6ff8b: `test-bowl-night` passes 235 checks, the lane suites picked since 7c2ef0c pass (31 of 31), and so does the build.

**Changed assertions.** None. A new check in `test-bowl-night` covers the newer-save refusal added to `bowl-save.js`.

**Removed:** The Bowl's place in the menu's circuit list and the course screen. Show Night replaces it as the only way in.
