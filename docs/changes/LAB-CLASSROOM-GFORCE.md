# LAB-CLASSROOM-GFORCE

## Changed

- The watch now moves through the starting turn, 128.7 km/h at 50 m, the restored 64.4 km/h setting, and 64.4 km/h at 100 m. The live values drive the board, cord, arrow, meter and formula; the comparison rows match those settings.
- Worked values round displayed km/h first, convert by 3.6, round m/s to two decimals, then calculate from the rounded figures. The sum says about because the meter uses the underlying setting. The lesson and WORDS entry define one g as the rate at which a dropped stone speeds up near the ground, about 9.81 m/s^2.
- Removed KMH_PER_MPH and speedMph. Both older G-force lesson paths now use KMH_PER_SETTING where needed and the neutral setting name. Their lesson text contains no mph.
- Rewrote the wonder step, first-person watch line, formula and prediction explanations. The speed try explains that 96.6 km/h is 1.5 times 64.4 km/h, so the square makes the reading about 2.25 times as large. The radius try explains that 75 m is 1.5 times 50 m, so the reading is two thirds as large. Correct and incorrect outcomes now differ.
- Removed the repeated prediction branch and duplicate say property. Updated the keyboard scenario to use Launch's seven flags, memory-only profile setup, hidden body > details elements, and Lab map walk-room entry. It captures the word steps, open guesses, free-test table and recap for Claude's Chrome run.
- The classroom screen and board share the UI's arrow-glyph keys (`←`, `→`, `↑`, `↓`), including held repeats paced at 0.14 s. The G-force view supplies `pointOnly` and `focus`; board targets have board points, while HTML answer cards stay point-only.
- Replaced the small partial arm drawing with a complete circle that scales with radius and moves the car from `view.time`. The cord inset leans with the meter reading. Speed and radius panels keep values above their buttons; the taught radius uses RADIUS, and the results table appears only after a turn.

## Tests and browser checks

- Screen and board rework: `node --test tools/test-lab-classroom.mjs` passed 27/27; `node --test tools/test-lab-classroom-page.mjs` passed 6/6; `npm.cmd run build` passed. PowerShell blocked `npm` itself under its script policy, so the Windows command launcher ran the same npm script. No lane tier or browser scenario was run; Claude runs the lane tier and plays the lesson in Chrome.
- Added a contract test against the classroom UI's exported `KEY_NAMES`: every G-force key and repeat key is sendable, all lesson views provide the fields the screen reads, every board target has a point while HTML answer targets are point-only, the stand-in canvas receives `fitBoard`'s layout, and each reading card uses the board picture painter. Held arrows now follow the classroom's 0.14 s pacing.
- Reworked the board to show the full overhead turn, moving car, radius, tangent speed and inward push, with a cord inset. Controls have separate label/value and button rows; the results panel appears only after a recorded run and fits three rows. Removed board-side answer drawing and answer hit tests; classroom answer cards remain responsible for answers. Reading cards now show a meter and the cord lean.

- node --test tools/test-lab-classroom.mjs: 27/27 passed after the screen and board rework.
- node --test tools/test-lab-classroom-page.mjs: 6/6 passed; G-force is in the language and formula page checks.
- node --test tools/test-lab-lessons-workshop.mjs: 4/4 passed.
- tools/scenarios/lab-classroom-gforce.mjs: not run here, as requested. Claude runs it in Chrome.
- Earlier lane-tier result, before this screen and board rework: 44 of 46 suites passed. `tools/test-review-evidence.mjs` hit the ffmpeg permission limit (8/9 checks). `tools/test-full-check.mjs` failed one setup case because `spawnSync pwsh` returned EACCES; its same-version rerun failed the same way (45/46 passed). Neither suite was changed. Claude will run the lane tier on this commit.
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
- Removed G-force's duplicate answer-card drawing and board hit tests; `classroom-ui.js` already owns drawing and activating those cards.
