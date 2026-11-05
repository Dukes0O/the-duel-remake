# LAB-CLASSROOM-GFORCE

## Changed

- The watch now moves through the starting turn, 128.7 km/h at 50 m, the restored 64.4 km/h setting, and 64.4 km/h at 100 m. The live values drive the board, cord, arrow, meter and formula; the comparison rows match those settings.
- Worked values round displayed km/h first, convert by 3.6, round m/s to two decimals, then calculate from the rounded figures. The sum says about because the meter uses the underlying setting. The lesson and WORDS entry define one g as the rate at which a dropped stone speeds up near the ground, about 9.81 m/s^2.
- Removed KMH_PER_MPH and speedMph. Both older G-force lesson paths now use KMH_PER_SETTING where needed and the neutral setting name. Their lesson text contains no mph.
- Rewrote the wonder step, first-person watch line, formula and prediction explanations. The speed try explains that 96.6 km/h is 1.5 times 64.4 km/h, so the square makes the reading about 2.25 times as large. The radius try explains that 75 m is 1.5 times 50 m, so the reading is two thirds as large. Correct and incorrect outcomes now differ.
- Removed the repeated prediction branch and duplicate say property. Updated the keyboard scenario to use Launch's seven flags, memory-only profile setup, hidden body > details elements, and Lab map walk-room entry. It captures the word steps, open guesses, free-test table and recap for Claude's Chrome run.

## Tests and browser checks

- node --test tools/test-lab-classroom.mjs: 26/26 passed.
- node --test tools/test-lab-classroom-page.mjs: 6/6 passed; G-force is in the language and formula page checks.
- node --test tools/test-lab-lessons-workshop.mjs: 4/4 passed.
- tools/scenarios/lab-classroom-gforce.mjs: not run here, as requested. Claude runs it in Chrome.
- Lane tier (node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going): 44 of 46 suites passed. tools/test-review-evidence.mjs failed on the ffmpeg permission limit (8/9 checks). tools/test-full-check.mjs failed one setup case because spawnSync pwsh returned EACCES; its one same-version rerun failed the same way (45/46 passed). Both failures are environment setup issues; neither suite was changed. The lane run passed the workshop suite and the 799-check src/test.js suite.
- npm run build: passed. Vite reported its existing dynamic-import and large-chunk warnings.
- node tools/build-status.mjs completed; STATUS reports the full tier stale for this lane commit.

## Changed assertions

- The formula sweep now parses the rounded two-decimal m/s value and displayed about result, then calculates that result from those exact displayed inputs. It covers every speed and radius reachable on the dial, separately checks the meter against lateralG, and checks displayed km/h conversion.
- Added timed watch assertions for speed, radius, meter and formula values at each stage.
- Added a wonder assertion for its short introduction and retained closing question.
- Wrong-prediction checks now verify the actual readings and the 1.5 x 1.5 speed ratio and the 75 m radius ratio.
- Added G-force to the page test's rewritten-lesson list for its existing language and formula checks. Renamed the legacy workshop fixture fields from speedMph to setting without changing its assertions.

## Race fingerprints

- No race simulation code changed. No race fingerprint was recorded.

## Proposed Brian voice lines

- Intro: A car on an arm goes around a marked circle with a cord hanging from it and a meter showing the reading. The words come next.
- Closing question: Which change could make the meter show a larger reading?
- Explain: A turning car keeps changing direction, so it needs a sideways push that the driver feels. In this game, the rule squares the speed and divides by the turn radius. The G-force lap asks you to reach at least 2 g in three different corners without leaving the road.
- Pass: You have passed G-force. Drive a lap on a course you own and reach 2 g in three different corners without leaving the road.

## Removed

- Removed the obsolete precise-setting note, duplicate prediction branch and duplicate say property. No files were removed; the legacy G-force path remains for its fallback.
