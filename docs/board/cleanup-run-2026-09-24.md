# Cleanup run – 24 September 2026

Kyle's direction after reviewing the first v3 run: clean up before any more
feature work. The rules and cards are in SPEC.md section 0.7 and the "Where
files live" and "Clean up as you go" sections of AGENTS.md.

## Measured at `463eac0`

| Item | Size or count |
| --- | --- |
| Added to Git by the v3 run | about 745 MB (Git pack 657 MB before the run's final commits) |
| `docs/board/looks/` | 417 MB of screenshots, videos and audio captures |
| `public/assets/models/` added | about 318 MB, including 22 `.blend` files (185 MB) |
| Shipped build | 487 MB, against 176 MB for the live build |
| Largest runtime file | `public/assets/models/wasteland/rustwall/wall.glb`, 15 MB |
| Lane branches on the status page | about 130; about 100 lane folders |
| Change notes | 121 |
| `docs/board/run-log.md` | about 1,400 lines |
| Full tier | 232 passed, 0 failed (independently rerun) |

## Start prompt

Paste into Codex from the integration folder.

```
You are the Director in autonomous mode for a cleanup-only run. Work in this folder
(integration/wasteland). Read AGENTS.md, SPEC.md section 0.7, then section 0.5,
docs/board/cleanup-run-2026-09-24.md and docs/board/STATUS.md.
Add CLEAN-01 to CLEAN-08 (SPEC 0.7), then CLEAN-10 (SPEC 0.8) to board.yaml and do them
in order. Follow the nine working rules in AGENTS.md: delete, do not archive.
Start no feature, art-fidelity or balance work in this run. CLEAN-09 is done;
do not rewrite Git history again
without Kyle; rebase any held lane onto the rewritten branch using docs/history/history-rewrite-2026-09-24-map.txt.
Every change must keep all replay fingerprints unchanged and pass the lane tier
and build before merge. Copy and hash-check anything before removing it from the
tree. Never force-remove a worktree, never touch the live folder, port 5174 or
real saves, and do not release or push.
Run the full tier after every 5 merges and at the end. Update STATUS.md after every
merge. When the budget is nearly spent: finish cards in progress, run the full
tier, write a short handoff at the end of run-log.md with before and after sizes,
and stop.
Budget for this run: <for example "until CLEAN-08 merges" or "about X% of my usage">.
```
