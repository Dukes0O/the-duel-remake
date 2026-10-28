# HELI-VIEW-FRAMES

## What was added

Two opt-in options in `tools/scenarios/frame-pacing.mjs`, built like
`SUMMIT_FRAMES_ONLY`. Each measures High and Performance (in that order), 120
delivered frames per quality, with the same guards (headed, idle, alone) and
rule 8's limits: delivered p95 at most 18.5 ms and Summit's world build under
1 s. A Summit world that takes over 5 s to be ready is a warning only.

- `SKI_FRAMES_ONLY=1`: the moguls run at Summit, seen from the skier on the
  default chase camera. A scripted skier skis the run in the game's own loop;
  timing starts after the first 6 seconds of the run.
- `RESCUE_FRAMES_ONLY=1`: the helicopter hovering about 40 m over the Summit
  avalanche slide with the rescue line hanging below, default chase camera.

No game code changed. The two options reuse the hooks the existing ski-view and
rescue-view scenarios use: the helipad visit button, the ski drop button, the
radio, autopilot and cruise actions, the run menu and the line fitting call.
The long flight to Summit is flown fast by a page-side pilot and is not timed.
Only the 120 frames in the finished view are timed. Every frame checks that the
view has not changed (same quality, same run or hover, no world rebuild, not
paused). The sound is muted during the run. Saves are memory-only.

Results go in `frame-pacing.json` in the output folder. Packet modes are
`ski-simple` and `rescue-simple`. Each row carries p50, p95, max, world build
and world ready times, and what proves the view (run name and skiing, or
avalanche, line out and metres from the slide).

## Commands for Claude (run alone, laptop screen off, nothing else heavy)

    $env:PATH="C:\Windows\System32;$env:PATH"
    $env:SKI_FRAMES_ONLY='1'; $env:DUEL_NIGHT_FRAMES='1'; $env:DUEL_NIGHT_IDLE_AWAKE='1'
    node tools/run-browser-scenarios.mjs --scenarios frame-pacing --timing-only --headed --jobs 1

and the same with `RESCUE_FRAMES_ONLY='1'` in place of `SKI_FRAMES_ONLY`
(do not set both; the scenario refuses if both are set).

## Checks run

- Dry run, headless, not timing (throwaway scenarios, deleted afterwards): each
  option reached its view and sampled 120 frames with every guard passing.
  Ski, High and Performance: skiing the moguls at Summit, run time advancing,
  no world rebuild during the sample. Rescue, High: hovering 0.4 m from the
  avalanche slide at Summit with the line out and the rescue clock running.
  The headless frame and world build numbers mean nothing (the laptop was
  busy with other lanes); only Claude's headed run counts.
- Not dry run: Rescue at Performance (same code path as High).
- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4`): 23
  passed, 0 failed, 0 not run.
- `npm run build`: passed (chunk size warnings only, as before). Output
  deleted from the lane.
- No assertions changed, no tests weakened, no new test machinery.

## Notes for the timed run

- Getting to each view takes about 1 to 2 minutes of fast flying per quality
  (ski took 65 to 115 s here), then 120 real frames.
- The first page load in a fresh browser occasionally timed out at 45 s in the
  dry runs when the laptop was busy. Rerun it once if that happens (AGENTS
  rule 3).
- Summit's world build was 1.2 to 3.4 s in the busy headless dry runs. Rule 8
  needs it under 1 s on the quiet laptop, as for the Summit race option.

## Open points

- The existing Summit option sends its packet through the night checker, which
  expects Harbour Lights, so its packet check fails for Summit even when the
  frames pass; read its `frame-pacing.json` rows directly. The new options use
  their own checker and do not have this problem.

## Removed

Nothing replaced. The throwaway dry-run scenario and its evidence were deleted.
