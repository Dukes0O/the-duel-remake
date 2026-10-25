# QA-AUDIO-RACE-LAUNCH

## Staging decision and result

Keep the crossbow at 1 s to preserve its isolated real hit. Move only the
bomb from 1 s to 4 s, with a separate one-shot trigger. The gentler launch
then has time to build speed and reach the bend. Native bomb flight and the
turning listener put the real blast clearly to the right, without moving
cars, projectiles or sound coordinates by hand.

No src files, assertions, thresholds, decode checks, marked probes or the
14 s recording window changed. Native simulation still emits the race-source
blast. Replay checks passed unchanged.

## Checks

Three consecutive runs of:

`node tools/run-browser-scenarios.mjs --scenarios audio-race,audio-listening,audio-crash-peak --jobs 1`

| Run (UTC, 25 October 2026) | Result | First real blast pan | Isolated real hit pan |
| --- | --- | --- | --- |
| 09:00:20 | PASS, exit 0 | 0.635345 | -0.156394 |
| 09:00:53 | PASS, exit 0 | 0.634556 | -0.156503 |
| 09:01:33 | PASS, exit 0 | 0.634555 | -0.156394 |

Each run executed audio-race and audio-listening: 2/2 passed, no warnings or
errors. The runner explicitly delegates audio-crash-peak and does not execute
it. Its native wrapper was therefore checked separately: first two runs
passed 23/23 tests (98 acceptance checks each). The third, alongside the lane
gate, passed 22/23: fuel-contact recorded non-contiguous AudioWorklet blocks.
Its peak checks passed. The one isolated rerun passed 23/23 (98 acceptance checks), following
the project's busy-laptop retry rule. This capture issue is outside the
owned probe file; no assertion was changed.

- Lane: 16 passed, 0 failed, 0 not run; jobs 4, 115.12 s. Replay fingerprints unchanged.
- Production build: PASS; existing chunk-size/dynamic-import warnings only.
- Independent code review: CLEAR, no findings (staging_review).
- Initial sandbox-only attempt could not write Vite's shared dependency cache;
  rerunning with authorized cache access resolved it before the three green runs.
- Cockpit sync: 0 task changes; QA-AUDIO-RACE-LAUNCH has no linked task. Director follow-up.

## Removed

Removed the simultaneous 1 s bomb staging. Consumed recordings, screenshots,
private wrapper scratch files and the local build are recycled after their
results are recorded. No runtime assets were replaced.
