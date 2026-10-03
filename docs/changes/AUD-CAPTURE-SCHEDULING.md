# AUD-CAPTURE-SCHEDULING: keep native QA Chrome active

Status: building. This card owns the browser harness and its unit test only.

## Decision before code

The Balance lane's final gate stopped at the unchanged native crash peak suite. Its third case captured the same 153,600 Float32 frames on mix, engine and impacts, but all three AudioWorklet timelines reported a missing block. The first two cases were continuous; sample and true peaks, onset and contrast still passed. A standalone run passed. The test runner already gives this suite exclusive access, and the earlier direct meter output fix did not make it reliable under the full lane gate.

Run QA Chrome with Chromium's test switches that prevent background timer throttling, renderer backgrounding and occluded-window backgrounding. These target scheduling of the private headless QA browser; they do not change the game, recorder or assertions. Export one launch argument builder so the harness test can check those switches and the existing private profile, muted audio and debugging setup. Do not retry a failed capture, fill missing samples or relax the continuity limit. If repeated native runs still show gaps, keep this card open and investigate the actual worklet timeline before merging.

Chromium source: https://chromium.googlesource.com/chromium/src/+/master/content/public/common/content_switches.cc

## Checks

Run the harness test, repeated native peak captures, the exact changed-file lane tier, and the build. Record every failure as well as passes. Merge only with a passing current-commit gate.

The new launch assertion failed first because the argument builder was absent. After the harness change, its 6/6 tests passed. Three separate native Chrome captures passed 23/23 each, with all three real cases' mix, engine and impacts meters continuous and the original peak, onset, contrast and cleanup limits intact. An initial unprivileged invocation could not create the lane's ignored evidence directory; the same suite ran with the lane's normal write permission.

On source commit e524266, the required changed-file lane tier passed 8/8 suites in 39.21 seconds. The production build passed in 396 ms. The native peak suite is not in the changed-file selection, so its three separate 23/23 runs are recorded above. A final gate and build on this note commit are still required before merge.

## Removed

None. The existing Chrome launch options stay in place.
