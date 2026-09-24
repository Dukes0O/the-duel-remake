# Next run (written 24 September 2026)

This is the one current plan for Codex. It replaces the earlier review and
cleanup notes. Rules: `AGENTS.md` (especially the nine working rules) and
SPEC.md sections 0.5, 0.7 and 0.8.

## Where things stand

- **Live game:** `master` at `eb879e5`, unchanged. The previous build is kept
  in `dist-previous` for rollback.
- **Development:** `integration/wasteland`, the only other branch. Full tier
  232 of 232 on the same file contents; build 303 MB with no `.blend`.
- **History:** unpushed development history was rewritten twice on
  24 September: no `.blend` files or raw evidence, and one version of every
  binary. A push would send about 131 MB. Commit IDs from before the rewrites:
  `docs/history/history-rewrite-2026-09-24-map.txt`.
- **Disk:** every lane folder, old branch, backup, QA build, stale log and
  temporary probe file was deleted. Git storage went from 1 GB to 250 MB.
  Codex's own conversation snapshot records (`refs/codex/...`, about 32 MB)
  were left alone.
- **Not pushed.** Pushing `integration/wasteland` waits for Kyle (D8).

## Order of work

Do these in order. No feature, art or balance work until step 1 is done.

1. **Finish the cleanup (SPEC 0.7 and 0.8).** CLEAN-07 (branches and lane
   folders) and CLEAN-09 (history) are done. Do, in order:
   - **CLEAN-01** placement check (fails only for a file in the wrong home),
     `tools/size-targets.json`, and the `repo-audit` report.
   - **CLEAN-02** Blender scripts write `.blend` output to `art-build/`, never
     `public/`; move `public/assets/models/course-landmarks.blend` out the same
     way.
   - **CLEAN-03** tools write raw screenshots, videos and audio captures to
     `.evidence/` by default. Nothing needs moving: the old evidence is gone.
   - **CLEAN-04** bring runtime assets toward the targets (build about 250 MB,
     Wasteland models and textures about 60 MB, `wall.glb` about 8 MB) with no
     visible loss, or record why not.
   - **CLEAN-05** docs and logs: build `docs/README.md`; move still-needed
     facts from the change notes and old handoffs into current docs, then
     delete them; keep 7 days of `run-log.md`.
   - **CLEAN-06** dead code, tests and switches, including `roadside-destruction`.
   - **CLEAN-08** the janitor: the after-merge cleanup and the end-of-run sweep
     in the playbook, and sizes against targets plus idle branches on the
     status page.
   - **CLEAN-10** tested compaction routine for future pushes.
2. **Then resume features (SPEC 0.6), in this order:**
   - **CAR-01** Wasteland career, scrap and territory map.
   - **GFX-01-P1** crew polish with the changed technique the round-3 review
     requires: continuous body meshes and baked textures in Blender, heads
     joined to necks, real hair and faces. Not more stretched projections.
   - **EGG-02-P1** Rustwall and wash polish: natural rock banks, richer wall
     materials and detail.
   - **GFX-03** war rigs and kits on nine cars; **GFX-04** Scrapdome yard as
     the real inside of the gate (today the gate leads to a temporary endpoint).
   - **BUG-06 / BUG-07 balance:** with `wasteland2` on, the Easy CPU lands 6
     hits per race (target 0 to 3) and the player wrecked no CPU car in 30
     scripted races. Combat should pay off without breaking the win-rate bands.

## Rules to watch this run

- Lane folders may link dependencies only to the integration folder's
  `node_modules`, never to the live folder's. Unlink the link before removing
  a lane folder. On 24 September, 7 lane folders linked to the live game's
  dependencies, where a careless delete could have broken the live game.
- Delete a lane folder and branch when its work is merged, replaced or
  dropped with a reason. Never delete a branch for being idle, and never touch
  a branch Kyle created. Sizes are targets for the janitor, not merge blockers.
- Raw evidence goes to `.evidence/` and is deleted after its review.

## Start prompt

Paste into Codex from `C:\Users\kyleb\.codex\worktrees\wasteland-integration\the-duel-remake`.

```
You are the Director in autonomous mode for The Duel. Work in this folder
(integration/wasteland). Read AGENTS.md first, including the nine working rules,
then docs/board/next-run.md, SPEC.md sections 0.5, 0.7 and 0.8, and
docs/board/STATUS.md. Add the cards named in next-run.md to board.yaml and do
them in the order given: finish the cleanup cards before any feature, art or
balance work. Keep every replay fingerprint unchanged during cleanup.
Gates: lane tier and build before every merge; full tier after every 5 merges or
2 hours and at the end of the run; update STATUS.md after every merge.
Delete, do not archive. After every successful merge, run the after-merge
janitor from AGENTS.md: delete that lane's branch, folder and used evidence,
unlinking any dependency link first. Never delete a branch for being idle. Never link to or touch the
live folder, port 5174 or real saves. Do not rewrite history, release or push
unless Kyle approves it in writing.
Budget for this run: <for example "until morning" or "about X% of my usage">.
When the budget is nearly spent: finish cards in progress, run the full tier,
run the janitor sweep (AGENTS.md), update STATUS.md, write a short handoff at the end of
run-log.md with before and after sizes, and stop.
```
