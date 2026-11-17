# QA-STANDING-BROWSER

Run alone in a visible window on 16 November 2026, then again after each cure. No game file changed.

| Item | Kind | Evidence | Done |
| --- | --- | --- | --- |
| `arena-shove` | check wrong | "reading 'commit'" at once: the retired-baseline path read `provenance.commit` with no provenance. | Added `?.`. Passed twice. |
| `drive-lesson-run` | check out of date | The board opens with its first corner selected, and a selected radio sends no change. | That choice must stay checked. Passed twice. |
| `ski-finish` | check wrong | The page was not stuck. Each flight of the group visit took 44 to 47 s inside one 60 s browser call, because every helicopter step reads the ground at 85 points. | Every flight goes in pieces of 6000 steps (40 pieces at most, then a clear error). Passed alone, and while `test-test-runner` ran beside it. |
| `p4-audio` | check out of date, plus load | After the race, `medal` and `earnedCars` differ (earned cars released 3 November). The 128-frame gap of two nights did not recur alone. | Both fields join the pay fields; a failure names the fields. Passed twice. Entry kept for the gap. |
| `arsenal-wave1-audio` | passes alone | Real-time sound; fails only when the laptop is busy (rule 3). | Nothing changed. |
| `frame-pacing` | check wrong | `reuseNightFrames` looked for `frames/frame-pacing.json`; the frames stage writes `frames/frame-pacing/frame-pacing.json`. | Path and test fixture corrected. It still fails while the frames stage fails; entry reworded. |
| `deep-frames` | cannot pass at night | Needs headed mode; the nightly browser step is not headed. | Left. Taking it out of that step also means changing the frames stage's three-name checks in `tools/full-check.mjs` and a deep-frames packet check, so it is a card. |
| `frames` | not run | High read 34.3 and 35.1 ms, Performance 18.2 and 35.3 ms. Readings near 33 to 35 ms are two refreshes of the screen, the known sign that the screens were not set to one screen (rule 8). | Entry kept. |

## Changed assertions, for Claude to review
- `drive-lesson-run`: each choice must move the course; the already selected one must stay checked. Ruling: `driveLessonBoardModel` selects the first course by default.
- `p4-audio`: `medal` and `earnedCars` may differ from the unpaid replay. Ruling: earned cars released 3 November 2026.
- `ski-finish`: the thin-air radio text is looked for right after the piece that said it, not only at the summit pad, because the screen is drawn between pieces.
- `test-full-check.mjs`: the fixture's frame packet path is now `frames/frame-pacing/frame-pacing.json`, the real place.

## Checks
Each scenario touched, alone (`arsenal-wave1-audio` once). Lane tier `--changed --since 7acd93c3c` on the commit before this note: 312 passed, 0 failed (11 long suites left to the night). `test-full-check` 53 passed, `test-board` and `test-repo-hygiene` passed. Timeouts stay unmatched in the standing list on purpose: a timeout usually means a busy laptop, and `test-full-check` pins that.

## Removed
Standing entries `arena-shove`, `drive-lesson-run`, `ski-finish`; the one-call group flight.
