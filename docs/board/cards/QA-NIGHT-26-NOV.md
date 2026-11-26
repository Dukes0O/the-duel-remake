# QA-NIGHT-26-NOV

The short board entry controls current state, ownership, dependencies and locks.

The night check of 26 November 2026 (5269a4dc5, `docs/board/checks/night-2026-11-26.md`) passed the full tier
(737/737) and combat balance. It failed 18 of 257 browser scenarios, the frame stage, and the copy check ("Copied
source changed", then "Copy is changed; nonforced cleanup refused").

Claude reruns the 18 once on the current `integration/wasteland`, finds each lasting cause within 30 minutes (rule 4),
cures what is small and in tools or a scenario, and cards the rest for Codex. Nothing here changes an assertion.

## Findings (26 November 2026; 16 reruns on e5eeb9231, two at a time, laptop shared with Codex lanes)

| Failure | Verdict |
| --- | --- |
| copy changed | Cured. At the night's source, `open-map` wrote its sheet over the tracked `docs/board/looks/open-map/round-1.jpg` every run. Now the sheet goes to the output folder, and into `docs/` only with `OPEN_MAP_SHEET=1` (as `SCABLANDS_SHEET` and `FAR_RAIN_SHEET` do) |
| `heli-jobs` | Cured. Each leg (climb, autopilot flight, landing) ran in one browser call with a 60 s limit, as `ski-finish`'s did; now each leg is split into separate calls, at the accepted cruise. It passed afterwards with the laptop free |
| `fire-view` | Cured in part: it times frames but was not on `QUIET_SCENARIOS`, so it ran beside three browsers; now it runs alone in the runner. The rest is QA-NIGHT-TIMING-ALONE |
| `convoy-frames` | Card QA-NIGHT-TIMING-ALONE (Codex, Sol): frame timing with other sessions' jobs on the laptop (its two matched pairs read -18 % and +51 %) |
| `deep-frames`, `frame-pacing` | Standing (QA-STANDING-BROWSER); `deep-frames` moves with QA-NIGHT-TIMING-ALONE. Not rerun: frame timing |
| `audio-baseline` | Card QA-AUDIO-BASELINE-CONTROL; fails again; now on the standing list |
| `everburn-job2`, `ships-decks`, `machine-borer` | Card QA-NIGHT-22-NOV (Codex, ready); same messages; now on the standing list |
| `crash-presentation`, `drive-lesson-run`, `drive-lessons-view-2`, `everburn-ember`, `everburn-job1`, `lab-classroom-projectile`, `lab-navigation`, `onfoot-camera-choice`, `story-kogane` | Pass on rerun with no game change (rule 3): timeouts, a QA panel not yet drawn, a rider that moved, a caption gone; all signs of a busy laptop |
| frame stage | Does not count: 33.3 ms is exactly two screen refreshes, measured while other jobs ran (rule 8). It waits for the next night with the laptop alone; not run now |

The night's copy `C:/Users/kyleb/.codex/worktrees/wasteland-integration/full-check-CIqTvK` was left behind when its
cleanup was refused. It is clean now (someone restored the sheet at 09:19) and can be removed by the night tool's owner.
