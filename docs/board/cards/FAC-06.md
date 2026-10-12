# FAC-06: Lean board with locks

Current scope, acceptance, decisions and retained evidence from the prior board.
The short entry in board.yaml controls status, owner, dependencies and locks.

```yaml
  - id: FAC-06
    title: "Lean board with locks"
    owner: codex
    lane: OPS
    size: M
    needs: []
    status: building
    owns: [docs/board/board.yaml, docs/board/cards/, tools/board.mjs, tools/test-board.mjs, docs/changes/FAC-06.md]
    acceptance:
      - "board.yaml lists open cards only, one short entry each, and loads as standard YAML (fix line 4567). Finished cards leave at merge; details live in docs/board/cards/<id>.md. tools/board.mjs reads locks and shows a card whose lock another building card holds as waiting on that lock."
    claimed_by: codex-factory-2026-10-12
    branch: codex/fac-06
```
