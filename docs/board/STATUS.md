# Build status

Observed at: 2026-09-24T18:18:41.938Z

Observation commit: c3d5c8cf718d70dbe555112cff3596905600e703

This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.

Integration HEAD: c3d5c8cf718d70dbe555112cff3596905600e703

Integration source: clean (only the full-tier evidence ledger is excluded).

Live commit: eb879e5457ef9f993970a9e8bfa2e3ef69f7d4f6

Live build version: 20260924002834-86f3e7fb6e36

Full tier: stale; exact HEAD passed: no.

Last recorded full run: 2026-09-24T16:30:46.600Z; tested commit: e2077357f4c95479edd1c455fc85be76f3f42c10.

## Feature switches

| Switch | State |
| --- | --- |
| career-backup | dev |
| roadside-destruction | on |
| wasteland2 | dev |
| hidden-road | dev |

## Lane branches

Age is whole days since the last branch commit. Removal candidates are suggestions only; this tool never removes a worktree.

| Branch | Age (days) | Dirty | Merged | Removable | Folder |
| --- | --- | --- | --- | --- | --- |

## Size targets

Measured on this integration source after CLEAN-04. Targets are advisory.

| Item | Bytes | Target | Difference |
| --- | ---: | ---: | ---: |
| Build `dist/` | 254,802,821 | 250,000,000 | 4,802,821 over |
| Wasteland models | 73,978,288 | 60,000,000 | 13,978,288 over |
| `rustwall/wall.glb` | 15,394,464 | 8,000,000 | 7,394,464 over |
| `docs/board/looks/` | 2,826,636 | 20,000,000 | 17,173,364 under |
| All `public/` | 250,741,595 | — | — |

The remaining model excess is embedded texture and geometry data. The
byte-preserving duplicate removal and reasons for the target gaps are recorded
in `docs/ASSET_PIPELINE.md`.

## Backups

Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.

- Local master: eb879e5457ef9f993970a9e8bfa2e3ef69f7d4f6
- Local main: missing
- Local integration/wasteland: c3d5c8cf718d70dbe555112cff3596905600e703

Local rollback build (dist-previous): 20260923193614-0b1389a185dd. Manifest presence does not verify the full rollback build.

Remote-tracking refs are cached locally; no fetch or remote verification was performed.

- Remote origin/master: matches local; cached commit eb879e5457ef9f993970a9e8bfa2e3ef69f7d4f6.
- Remote origin/main: local branch missing; cached commit 34d66fe6605c5b436523727d73c2f06e7ccfe1d7.
- Remote origin/integration/wasteland: behind local; cached commit 30a2ef1868dc0ee6ee6107fe590b784c9039b524.
