# Build status

Observed at: 2026-10-29T00:06:45.964Z

Observation commit: 5a3e92ef108e298fe419e81e56b8b7ec220ff70c

This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.

Integration HEAD: 5a3e92ef108e298fe419e81e56b8b7ec220ff70c

Integration source: dirty (only the full-tier evidence ledger is excluded).

Live commit: not checked

Live build version: not checked

Full tier: stale; exact HEAD passed: no.

Last recorded full run: 2026-10-28T21:25:43.258Z; tested commit: 49b773d437a3fa744f1c985f21ae82e6ce81f468.

## Feature switches

| Switch | State |
| --- | --- |

## Lane branches

Age is whole days since the last branch commit. Removal candidates are suggestions only; this tool never removes a worktree.

| Branch | Age (days) | Dirty | Merged | Removable | Folder |
| --- | --- | --- | --- | --- | --- |
| codex/eifel-c2 | 0 | true | true | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/codex-eifel-c2 |
| codex/kogane-c4 | 0 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/codex-kogane-c4 |
| codex/perf-high-night | 13 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night |
| codex/skyline-v2 | 0 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/codex-skyline-v2 |
| codex/skyline-v4 | 0 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/codex-skyline-v4 |
| codex/wild-art-src | 0 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src |

## Unmerged branches for idle review

These branches stay in place. Uncommitted changes may be newer than the last commit, so their exact activity time is unknown. This tool never deletes a branch.

| Branch | Card | Last commit | Age (days) | Activity | Holds |
| --- | --- | --- | ---: | --- | --- |
| codex/kogane-c4 | unknown | 2026-10-28T16:47:07-07:00 | 0 | inspection skipped by request; uncommitted state unknown | docs/board/board.yaml, docs/board/cards/EIFEL-CROWN-C1.md, docs/board/cards/KOGANE-PASS-C1.md, docs/board/cards/KOGANE-PASS-C2.md, docs/board/cards/NISSAN-SKYLINE-GTR-R34-V1.md |
| codex/perf-high-night | PERF-HARBOUR-AO-HALF | 2026-10-15T00:10:54-07:00 | 13 | inspection skipped by request; uncommitted state unknown | docs/changes/PERF-HIGH-NIGHT.md, src/ambient-shading.js, tools/full-check.mjs, tools/scenarios/frame-pacing.mjs, tools/test-full-check.mjs |
| codex/skyline-v2 | unknown | 2026-10-28T16:43:17-07:00 | 0 | inspection skipped by request; uncommitted state unknown | docs/board/board.yaml, docs/board/cards/EIFEL-CROWN-C1.md, docs/board/cards/KOGANE-PASS-C1.md, docs/board/cards/NISSAN-SKYLINE-GTR-R34-V1.md, docs/board/cards/NISSAN-SKYLINE-GTR-R34-V2.md |
| codex/skyline-v4 | unknown | 2026-10-28T16:39:10-07:00 | 0 | inspection skipped by request; uncommitted state unknown | docs/board/board.yaml, docs/board/cards/EIFEL-CROWN-C1.md, docs/board/cards/KOGANE-PASS-C1.md, docs/board/cards/NISSAN-SKYLINE-GTR-R34-V1.md, docs/board/run-log.md |
| codex/wild-art-src | WILD-ART-SRC | 2026-10-28T16:59:56-07:00 | 0 | inspection skipped by request; uncommitted state unknown | docs/board/STATUS.md, docs/board/cards/WILD-ART-SRC.md, docs/board/looks/wildlife/north-woods-round-1.jpg, docs/board/looks/wildlife/north-woods-round-2.md, docs/changes/WILD-ART-SRC.md |

## Size targets

Targets are advisory. Change compares with the previous status observation when available. Git object storage uses Git's KiB estimate.

| Item | Current | Change | Target |
| --- | ---: | ---: | ---: |
| Build `dist/` | unavailable | unavailable | 250,000,000 B |
| Wasteland models | 114,830,428 B | +0 B | 60,000,000 B |
| Largest runtime file | 28,308,656 B | +0 B | 8,000,000 B |
| Largest ordinary tracked file | 2,288,190 B | +0 B | 2,000,000 B |
| Largest review sheet | 495,896 B | +0 B | 500,000 B |
| Review `looks/` | 32,874,545 B | +0 B | 20,000,000 B |
| Added bytes in last merge | 87,887 B | +0 B | 5,000,000 B |
| All `public/` | 348,530,686 B | +0 B | unavailable |
| Git objects | 799,879,168 B | +5,512,192 B | unavailable |
| Lane folders | 0 | +0 | unavailable |

## Backups

Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.

- Local master: c16caedfb776e3645223bcb848939b4c4a1f0f35
- Local main: missing
- Local integration/wasteland: 0d89f56b4a18607c2b46c20a1892bf057dfb8fda

Local rollback build (dist-previous): not checked. Manifest presence does not verify the full rollback build.

Remote-tracking refs are cached locally; no fetch or remote verification was performed.

- Remote origin/master: matches local; cached commit c16caedfb776e3645223bcb848939b4c4a1f0f35.
- Remote origin/main: missing; cached commit missing.
- Remote origin/integration/wasteland: behind local; cached commit fc0e532534d14b432126d4412d069ed8f48afced.

Issue: Circuit manifest eifel-crown.js has unknown or malformed literal metadata.
