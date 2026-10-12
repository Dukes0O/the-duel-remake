# FAC-02: Merge on green: no queue wait, no re-run after a clean merge

Current scope, acceptance, decisions and retained evidence from the prior board.
The short entry in board.yaml controls status, owner, dependencies and locks.

```yaml
  - id: FAC-02
    title: "Merge on green: no queue wait, no re-run after a clean merge"
    owner: codex
    lane: OPS
    size: S
    needs: [FAC-01]
    status: building
    owns: [docs/CODEX_PLAYBOOK.md, docs/OPERATIONS.md, tools/integrate-lane.mjs, tools/test-integrate-lane.mjs, docs/changes/FAC-02.md]
    acceptance:
      - "Playbook and OPERATIONS match AGENTS rules 11 to 15: a green lane with one review merges at once; a conflict-free merge does not re-run the lane tier; the run-log line is one sentence. Remove the 5-merge/2-hour deadline, the four-versus-five lane conflict and the stale integration path. Two green lanes merge within five minutes of each other."
    claimed_by: codex-factory-2026-10-12
    branch: codex/fac-02
    script_scope: "Director before code: implement FACTORY section 5 integrator in the two named tools, using explicit current green lane/build evidence and one review. No post-conflict-free gate, push, release or live access. Only caller-proven newly created clean lane folders may be recycled; retained lanes stay. Record one merge line and commit shared metadata immediately."
```
