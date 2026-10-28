# QA-AUDIO-CRASH-PEAK-AGAIN

`tools/test-audio-crash-peak.mjs` failed once in the 26 October release full
tier with no crash-sound change, and passed on the one rerun. This note names
the cause I could reproduce and the fix. No game code, limit or tolerance
changed.

## Cause

There were two load-sensitive spots. Both showed up when I ran the suite
with busy programs keeping the laptop loaded.

1. Recording length. The scenario records the game's real output in a real
Chrome. It decided how long to record with wall-clock timers: `sleep(3200)` for each crash case,
`sleep(1100)` for the quiet reference and `sleep(350)` for the pause check.
The test then counts the recorded audio and asks for more than three seconds
(`actual mix capture spans more than three seconds`).

On a busy laptop the audio clock can fall behind the wall clock. The audio
stays gap-free, but less of it is produced in the same real time. With twelve
busy programs running, the first case once recorded 2.133 s instead of
3.200 s, so the three-second check failed. Nothing about the crash sound had
changed. That is the same shape as the full-tier failure.

2. Slow browser shutdown. After the capture was saved, the browser helper
sometimes stayed alive for between one and seven minutes (twice it only ended
when I stopped it by hand). Chrome's helper programs kept the helper's output
pipes open after the browser was stopped. The suite's setup step has a 120 s
limit, so every test then failed with "failed running before hook" even
though the capture was fine.

## Fix

Recording length: the scenario now waits on the audio clock it is measuring,
not on a timer. A small helper, `untilAudioTime`, waits until the audio context reports the same
3.2 s, 1.1 s or 0.35 s the old timers meant. A 15 s wall-clock cap only stops
a context that never advances; a short capture would then still fail honestly.
Capture lengths in audio time are now the same on a busy laptop and a quiet
one. No retry was added.

Slow shutdown: the test already builds a private copy of the browser helper.
That copy now waits at most three seconds for Chrome to answer
`Browser.close`, then ends the whole Chrome process tree and lets go of its
output pipes, so the helper exits right after it saves the report. The shared
`tools/browser-harness.mjs` is untouched. Its recipe anchors still fail loudly
if that file changes.

Files changed: `tools/scenarios/audio-crash-peak.mjs` and
`tools/test-audio-crash-peak.mjs` (only the private helper recipe). Every
assertion and every limit is unchanged.

## Tests and results

All runs below are `node tools/test-audio-crash-peak.mjs` (23 tests, 98
checks).

Before the fix, with twelve busy programs running (5 runs): 3 passed, 1
failed the three-second check (2.133 s recorded), 1 hit the setup timeout
because the browser helper would not exit. With twenty busy programs (3 runs):
1 passed, 2 failed on browser start or shutdown.

After the fix:

| Machine state | Runs | Result | Time per run |
| --- | --- | --- | --- |
| Quiet | 2 | 2 passed | 44 and 62 s |
| Twelve busy programs | 3 | 3 passed | 37 to 43 s |
| Sixteen busy programs | 8 | 8 passed | 50 to 61 s |

In those runs the browser helper exited 3 to 6 s after saving its report. Of
33 recorded cases, 28 captured exactly 3.200 s and 5 captured 3.157 s (the
last partial block is dropped), well over three seconds.

## Still open

- Under extreme load (twenty busy programs on twenty cores) the browser
  helper can still time out before the scenario starts (`Page.navigate timed
  out`). That needs a load far above a normal full tier. I left it alone.
- The shared `tools/browser-harness.mjs` has the same unbounded wait and
  open-pipe problem at shutdown, so other browser scenarios may be able to
  hang the same way under load. I did not touch it; the Director may want a
  small card for it.
- The check that the crash cue starts within 30 ms of contact reads the audio
  clock twice in one short step. It measured 0 to 10.7 ms in every
  recorded case. A machine stall of 30 ms inside that step could still fail it. I did
  not see this happen and did not change it.

## Changed assertions

None.

## Removed

Nothing is replaced. The three wall-clock timers in the scenario were swapped
for the audio-clock wait, and the helper's unbounded browser stop was swapped
for the bounded one, in the same change.
