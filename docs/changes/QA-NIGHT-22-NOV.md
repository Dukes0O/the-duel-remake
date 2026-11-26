# QA-NIGHT-22-NOV: four browser scenarios behind dev switches (Claude cloud, 26 November 2026)

**Causes.** `everburn-job2`, `ships-decks`: `app.advance` re-reads the held keys every step and cleared `setInput({interact:true})`, so F was never
held; both now hold `app.keys.KeyF`. `the-dig`: the page draws ~1 frame/s here and a frame gives the game at most 0.1 s, so wall-clock holds moved
the arm a tenth as far and the bucket never touched the ground; holds and waits now run on a game-time clock, waits stretched by the measured slowdown.
`machine-borer`: a game fault (QA-NIGHT-18-NOV): since the cab view, Mabel's second view sat in rock while she cuts; `updateBorerCamera` now uses
the mouth view once she has cut (question and pick: `docs/board/questions/QA-NIGHT-22-NOV.md`). `far-rain`: passes on this tip, not reproduced, no change.

**Checks** (headless Chromium, `DUEL_CHROME_PATH`; code at 6bd96fb; `npm run build` passed): `everburn-job2`, `ships-decks`, `far-rain` PASS; lane tier
`--changed --jobs 2` 39/39 on eaff039 plus these edits; `test-machine-borer`, `test-machine-view`, `test-the-dig` pass.
**For Claude to run:** `the-dig` passed to Mabel's cab picture (17 pictures, the excavator digs) before the 30 minute limit; `machine-borer` (10 minutes
on the laptop) was not run at 1 frame/s, so its mouth pictures are unproved in a browser. `standing-failures.json` is left to the night tool.

**Changed assertions.** None weakened; one added in `test-machine-borer.mjs` (mouth view with her model drawn; fails without the fix).
**Removed.** Nothing replaced a job: only the wall-clock key holds in `the-dig` and the overwritten `setInput` presses in two scenarios.
