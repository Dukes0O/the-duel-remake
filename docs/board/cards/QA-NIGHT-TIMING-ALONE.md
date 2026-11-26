# QA-NIGHT-TIMING-ALONE

The short board entry controls current state, ownership, dependencies and locks. Codex builds it (Sol). Found by
QA-NIGHT-26-NOV.

## The fault

The nightly browser stage (`tools/full-check.mjs`, `nightPlan`, stage `browser`) runs every scenario with `--jobs 4`
while other sessions keep building and testing (rule 13). Three scenarios in it fail on a frame-time limit, and a frame
time measured with company never counts (rule 8):

- `convoy-frames`: "Tanker adds more than ten percent over matched full-loop box". On 26 November, rerun on e5eeb9231,
  the same scene's added cost read -18 % and +51 % (CPU) in its two matched pairs on High: noise from other work, not
  the tanker. It is on the runner's quiet list (`QUIET_SCENARIOS`), so it already runs alone inside the runner, but
  other sessions' jobs still share the laptop. It passed on the 25th.
- `fire-view`: "Frame check over 18.5 ms". QA-NIGHT-26-NOV put it on the quiet list; the company of other sessions
  remains.
- `deep-frames`: "Deep frames require headed mode". Claude's ruling on QA-STANDING-BROWSER (16 November) already says
  it leaves the browser stage and runs in the frame stage. This card carries that item now.

## Claude's ruling (settled before code)

These three leave the nightly browser stage and run in the frame stage, which already refuses to start with company and
runs headed, one at a time (`--headed --jobs 1`), after `frame-pacing`, `tremblant-snow` and `tremblant-views`. Keep
one list of the names, in `tools/run-browser-scenarios.mjs` beside `QUIET_SCENARIOS`, which the frame stage reads and the
browser stage's `--all` and `--changed-since` leave out. A run of them by name (`--scenarios`) is unchanged. A failure of
one of them is then a frame-stage failure, judged by rule 8. Do not change any scenario's measurement, limit or
assertion. A frame stage refused for company says so, as today.

## Checks

- `tools/test-full-check.mjs`: the frame stage's plan names the three; the browser stage's plan leaves them out; a
  failing deep-frames result in the frame stage is classified like the frame-pacing result.
- `tools/test-browser-scenarios.mjs`: `--all` and `--changed-since` leave the three out; `--scenarios` still runs them.
- Rule 1's lane tier and `npm run build`. No browser run is needed; Claude sees the next night.

## Removed

The three items' entries in `docs/board/checks/standing-failures.json` (`convoy-frames`, and `deep-frames` from
QA-STANDING-BROWSER) once the next night has classified them in the frame stage.
