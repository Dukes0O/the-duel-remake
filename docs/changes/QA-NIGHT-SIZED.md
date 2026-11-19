# QA-NIGHT-SIZED: the night check chooses its own size

**Kind:** tools only, no game file. **Flag:** none.

`tools/full-check.mjs` now chooses none, partial or full from the files changed since the last night that passed. None writes one run-log line and records nothing. Full applies for a file in `NIGHT_FULL_FILES`, a Saturday, a last full night more than seven days old, no earlier night, `--full` or `--strict`. Partial is everything else: the wide suite pick, the browser scenarios picked for the changed files plus the saved-progress guards, combat balance only for `src/arsenal/`, `src/combat-*.js` or `src/arena/`, and the frame stage only when the timed scene or its code changed (otherwise reused from the last night that passed it). The `.md` and `.json` reports begin with the size and its reason.
`tools/run-tests.mjs` gains `--tier wide --since COMMIT` and `wideSuitesForChanges`: the lane pick with the reach and hub limits taken off, joined with the lane pick, long suites included. The lane tier is unchanged. `tools/build-status.mjs` reads the recorded size (`nightIsFullTierPass`, the status line); a partial night never writes `docs/board/checks/full-tier.json`, so it never answers the release's "full-tier pass" question.
**Save and physics files:** `run-tests.mjs` has no such list, so `NIGHT_FULL_FILES` in `tools/full-check.mjs` names 33 files once: the five shared files, the career, backup, town, helicopter and Lab save files, and the `src/sim-*.js` and collision files. Claude to review.

## Checks

On commit `7cdd40c13` (tools only; later commits add this note): `test-full-check.mjs` 64 of 64; `test-test-runner.mjs` passed (252 checks); `test-build-status.mjs` passed; `test-board.mjs` and `test-repo-hygiene.mjs` passed (rerun on the note commit). Lane tier `--tier lane --changed --jobs 4`: 649 of 650 passed. `test-town-people.mjs` failed a 30 ms timing limit (50.96 ms) while four suites ran at once; alone on the same commit it passed (rule 3). No browser scenario or build: no game file changed.

**Changed assertions:** none. The older cases in `test-full-check.mjs` gained one setup line (`changedFiles`, a shared game file, so they stay full nights).
**Removed:** the AGENTS rule 13 sentence "Until QA-NIGHT-SIZED is merged ...".
