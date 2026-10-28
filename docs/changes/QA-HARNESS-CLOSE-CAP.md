# QA-HARNESS-CLOSE-CAP

`tools/browser-harness.mjs` now stops its browser in a bounded way, and
`tools/test-audio-crash-peak.mjs` no longer carries its own copy of that logic.
No game code, test limit or assertion changed.

## What changed

- `tools/browser-harness.mjs`: a new `stopBrowser` step replaces the old
  unbounded `Browser.close` wait. It asks Chrome to close and waits three
  seconds at most. Then it ends the browser this harness started and that
  browser's helper programs (`taskkill /T /F` on its own child's process id on
  Windows, a plain kill elsewhere) and destroys the browser's output pipes, so
  the harness exits right after the report is saved. It only ever touches its
  own child; it never looks for or ends any other browser.
- `tools/test-audio-crash-peak.mjs`: the two private shutdown substitutions in
  its harness recipe are gone. It still builds its own private copy of the
  harness (port, build folder and evidence paths), and that copy now carries
  the shared shutdown. Behaviour is the same.
- `tools/test-browser-harness.mjs`: one new test with a stand-in browser that
  ignores `Browser.close` and has a helper program sharing its pipes. It checks
  that the harness returns within a few seconds, the pipes are released and, on
  Windows, the helper program is ended too.

## Numbers

Time from the report being saved to the harness process exiting, on private
ports with memory-only saves. The 1 to 7 minute hang did not reproduce on this
laptop, even with 16 busy programs running, so these numbers show only that the
new step costs about a quarter of a second.

| Scenario | Laptop state | Before | After |
| --- | --- | --- | --- |
| deep-life | quiet | 0.30 s, 0.30 s | 0.53 s, 0.52 s |
| lessons-v2-view | quiet | 0.29 s | 0.58 s |
| deep-life | 16 busy programs | 0.84, 0.30, 0.29 s | 0.66, 0.88, 2.36 s |
| lessons-v2-view | 16 busy programs | not run | 1.30, 1.21 s |
| drive-lessons-view-2 | quiet and loaded | 0.33 to 0.41 s | not run |
| audio-crash-peak (suite) | quiet | not measurable, it already had the private cap | 0.68 s |

`drive-lesson-run` and `drive-lessons-view-2` fail with a scene timeout on the
unchanged base ("Timed out waiting for native lesson panel and cone scene" for
the first). That is a lesson-area matter, separate from this card; they only
served to time shutdown, so I used `lessons-v2-view` for the "after" lesson
runs. A stand-in browser that never answers `Browser.close` is ended 3.1 s
after the stop request, which shows the cap directly.

## Checks

- `node tools/test-browser-harness.mjs`: 17 of 17 passed.
- `node tools/test-audio-crash-peak.mjs`: 23 of 23 passed (25.7 s).
- `node tools/run-browser-scenarios.mjs --scenarios deep-life,lessons-v2-view`: both passed.
- Lane tier (`--changed --jobs 4 --keep-going`): 22 suites passed, 0 failed.
- `npm run build`: built.

## Changed assertions

None.

## Removed

The private copy of the bounded shutdown inside `tools/test-audio-crash-peak.mjs`
(two recipe substitutions and their comment), because the shared harness now
does it.

## Still open

The long hang itself was not reproduced here, so the cap is proved by the
stand-in test, not by a live hang.

## Claude's review (27 October 2026, night)

Caps only its own child's tree, never another browser; the crash-peak recipe now shares it; costs about 0.3 s per run. No assertion changed. Verdict: merge.
