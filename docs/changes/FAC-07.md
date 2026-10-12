# FAC-07

Status: ready-to-merge. No game, scenario assertion or save changes.

## Design before code

Keep the existing --all and --output-dir CLI. Add --jobs from one to four (default four) and --scenarios as a comma-separated list of existing simple scenario names. Reject unknown names, duplicate/ambiguous options, malformed job counts and path-like names before any build. All named scenarios remain discoverable; touched-only runs select explicit names.

Build the QA bundle once per suite in a unique owned .qa-dist/browser-suite-* folder. Each child receives --qa-bundle and validates its project-local real path and completed QA marker before using it read-only. Its private port, separate temporary Chrome profile, memory-only page guard, scenario context and report stay exact. Standalone browser-harness keeps its existing build/menu anchors so the native audio fixture still works without changed assertions.

The Director approved an explicit quiet-scenario set from actual existing timing/construction source before code. Timing scenarios drain prior children and run alone, including conditional timing paths; no other scenario starts until they close. Non-timing scenarios run at most four at once. Preserve the barrier even after failures. The set is recorded in the runner and covered by pure tests.

Run at most four non-timing scenario children, retain deterministic discovery/selection order in summary rows, and wait for every child to close before finishing. A scenario launch, exit, missing/malformed report, warning, issue or non-memory report remains a failure and does not discard the other scenarios. Exit 1 means scenario failures; exit 2 means runner setup/build failure. Preserve the existing summary schema and per-scenario acceptance exactly. FAC-03 reads summary.json from its explicit output directory.

Only the suite owns its generated bundle. Recycle that unique folder after every child drains, including failures. Child harnesses never remove a supplied bundle. Do not delete another run's output or touch live saves/port 5174. Existing profile cleanup is unchanged.

The card grants machinery for this runner. Named hooks granted before code: tools/test-browser-harness.mjs and tools/test-browser-scenarios.mjs. Tests first use injected build/child/report/cleanup operations; no browser, balance or frame run during the day. Canonical lane selection is reported before execution if it includes heavy suites.

## Checks

Tests-first RED: new runner tests fail 6/6 against missing API/old CLI; existing harness tests pass 9/9, new shared-bundle test fails on unknown --qa-bundle. No browser was launched. Pure tool GREEN: scenario orchestration 6/6; harness 12/12, including unique completed build, failed-build cleanup, project/marker validation and Recycle Bin target guard. Original nine harness cases stay exact. Named scenario discovery returns all 124 existing names.

The earlier canonical FAC-01 plan had 22 suites, including unchanged real native audio-crash-peak browser capture, and was held before execution. Earlier production build passed in 576 ms; Root ordinary review clears frozen source 4f3d95d3. No selector or assertion bypass was used. The accepted FAC-03 selector is now merged from integration, preserving all incoming changes and routing native browser/audio and Blender child workloads to the night full tier. Freeze this union for one canonical targeted lane jobs 4 and production build, then quick delta review. Real browser/frame/balance acceptance remains night work; no daytime pass is claimed.

## Removed

Replace the suite's per-scenario rebuild and serial-only loop. Existing standalone harness behavior, scenario sources and all acceptance checks remain.

Final source 3b8d72b8: canonical lane19/19, zero failed/unrun,109.49s,jobs4;
production build662ms; one Director review clear. Implementation and four test
files remain byte-exact to reviewed4f3d95d3. Conflict-free merge has no rerun.
No real browser, frame, balance or full pass is claimed; those wait for night.
