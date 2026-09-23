---
task: FND-02
status: merged
kind: docs
flag: none
player_facing: no
---

## What changed

Added a current operations guide. Marked the session handoff, server cutover
and prototype decision log as historical. Removed an obsolete instruction to
restart the live server from the old Codex worktree.

## Evidence

- Independent cold read found a copyable `npm run dev` instruction on the live
  port and a release sequence that tested the commit before release-note
  edits. Both were corrected; the playbook's release instructions were also
  aligned with the current guide.
- `git diff --check` passes and edited tracked files have no mixed endings.
- The operations guide stages and verifies a new build before replacing the
  live entry files. Old hashed assets remain for races already open.

## Behavior and test changes

None.
