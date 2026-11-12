# QA-EVERBURN-SCREENS

Partial build; the gate route is blocked and the card is not complete.

The yard's Next up button starts the open story job directly through `everburnStep`. The Story Wall offers the same job. Neither offers free driving; the two `scablandsGateMarkup` buttons have no callers or handlers. The yard route therefore replaces the story entry only, not the free-drive choice. The card names no free-drive job or handler, and wiring one would require other files and a decision about its behavior. The existing markup and its assertions remain untouched. Claude: please re-slice or specify the free-drive route.

The browser scenario now completes job 3 and checks its tick inside the real result panel. Missing caption ids resolve to an empty callout; registered story and job-owned captions still show their words. Job 6 starts on the approach road 30 m from the derrick and faces it. The new headless test checks the live start pose, road, heading, clearance from every well solid, and both caption cases. No new sound event was added. Both feature switches remain off.

## Changed assertions

- `everburn` scenario: old: `typeof window.__qaApp.storyResultLine === 'function'`; new: the actual result panel contains `Everburn: job 3, Run Him Down, complete.` after the job completes. The old hook does not exist; the new check tests the rendered result. Claude's written review is required.
- The gate fact and all its unit assertions remain unchanged, and the gate fact is expected to fail until the blocked route is settled.

## Removed

The scenario's nonexistent `storyResultLine` hook check was removed and replaced by the result-panel check. No gate markup was removed, because free driving has no replacement.

## Checks

- `test-everburn-screens-start`: 8 checks passed.
- `test-ember-lines`: 54 captions and note passed; `test-ember-save`: 117 checks passed; `test-ember-screens`: 23 checks passed.
- `test-old-smoke`: 616 checks passed after fixing an initial error with its shortened job fixture; `test-run-gas`: 1,088 checks passed; `test-field-battle`: 750 checks passed. All three test files unchanged.
- `test-board`: 629 checks passed. `test-repo-hygiene`: passed.
- Browser scenarios `everburn`, `everburn-play`, and `everburn-well` not run: Chrome is unavailable in protected mode; Claude must run them. The gate fact remains an expected failure.
- `test-everburn-easy`: passed; all nine jobs 10/10, all eight gas-run combinations 10/10, battle home and won 10/10.

## Line ids without words

`everburn-job-1-start`, `everburn-job-1-spill`, `everburn-job-1-won`, `everburn-job-2-start`, `everburn-job-2-exit`, `everburn-job-2-won`, `everburn-job-3-start`, `everburn-job-3-falling-behind`, `everburn-job-5-start`, `everburn-job-5-alarm`, `everburn-job-5-key-taken`, `everburn-job-5-won`, `everburn-job-6-start`, `everburn-job-6-wave-restart`, `everburn-job-6-waves-over`, `everburn-soup-spilled`. These are the line-id fields in the six Everburn jobs and their side jobs that do not resolve in the registered story tables or job captions. Claude writes the words.

- Lane tier `--changed --jobs 4 --keep-going`: 68 passed, 2 failed. `test-warlord-tollkeeper` failed its audio subtest because `ffmpeg` could not launch (`EPERM`); standalone rerun: 27/28 subtests passed, same launch failure. Claude must run it. The runner output for the second failing suite was truncated, so its name and cause are not established; Claude must inspect or rerun the lane gate. `test-salt-flats-art` separately passed 35 checks.
- `npm.cmd run build`: passed (751 modules); Vite reported its existing chunk-size and dynamic-import warnings.
- Race replay fingerprints unchanged: 297 checks across 33 cases. Combat replay fingerprints unchanged: 12 checks across four encounters. World composition: 63 checks passed.
- `build-status.mjs` was not run: it inspects the live folder and other worktrees, which the lane instruction forbids touching. No status snapshot is claimed.
