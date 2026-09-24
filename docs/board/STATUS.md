# Build status

Observed at: 2026-09-24T19:32:44.041Z

Observation commit: 8d16711567810fcb9ec0c4eec55726c1cfe03dc4

This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.

Integration HEAD: 8d16711567810fcb9ec0c4eec55726c1cfe03dc4

Integration source: clean (only the full-tier evidence ledger is excluded).

Live commit: not checked in this run; last observed `eb879e5457ef9f993970a9e8bfa2e3ef69f7d4f6` at 18:59 UTC.

Live build version: not checked in this run; last observed `20260924002834-86f3e7fb6e36` at 18:59 UTC.

Full tier: stale; exact HEAD passed: no.

Last recorded full run: 2026-09-24T18:26:31.812Z; tested commit: eff5744d4585738fdbdba9c015c566b7bff5c03f.

## Feature switches

| Switch | State |
| --- | --- |
| career-backup | dev |
| wasteland2 | dev |
| hidden-road | dev |

## Lane branches

Age is whole days since the last branch commit. Removal candidates are suggestions only; this tool never removes a worktree.

| Branch | Age (days) | Dirty | Merged | Removable | Folder |
| --- | --- | --- | --- | --- | --- |

## Size targets

Measured after CLEAN-06. Targets are advisory and are not merge blockers.

| Item | Before CLEAN-06 | After CLEAN-06 | Target |
| --- | ---: | ---: | ---: |
| Build `dist/` | 254,802,821 B | 254,802,461 B | 250,000,000 B |
| Wasteland models | 73,978,288 B | 73,978,288 B | 60,000,000 B |
| Rustwall wall GLB | 15,394,464 B | 15,394,464 B | 8,000,000 B |
| Review `looks/` | 158,118 B | 158,118 B | 20,000,000 B |
| All `public/` | 250,741,595 B | 250,741,595 B | — |
| Git pack | 248.63 MiB | 248.63 MiB | — |
| Lane folders | 1 | 0 | — |

The retained GLB imagery and geometry explain the asset/build target gaps in
`docs/ASSET_PIPELINE.md`. Git reported one zero-byte stale worktree-ref garbage
entry; no forced cleanup was attempted.

## Backups

Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.

- Local master: eb879e5457ef9f993970a9e8bfa2e3ef69f7d4f6
- Local main: missing
- Local integration/wasteland: 8d16711567810fcb9ec0c4eec55726c1cfe03dc4

Local rollback build (dist-previous): not checked in this run; last observed `20260923193614-0b1389a185dd` at 18:59 UTC.

Remote-tracking refs are cached locally; no fetch or remote verification was performed.

- Remote origin/master: matches local; cached commit eb879e5457ef9f993970a9e8bfa2e3ef69f7d4f6.
- Remote origin/main: local branch missing; cached commit 34d66fe6605c5b436523727d73c2f06e7ccfe1d7.
- Remote origin/integration/wasteland: behind local; cached commit 30a2ef1868dc0ee6ee6107fe590b784c9039b524.

Live metadata was deliberately not refreshed because this run does not access the live checkout.
