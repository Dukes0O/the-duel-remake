# JANITOR-DIAGNOSTIC-NOTES: Resolve remaining unindexed diagnostic notes

Current scope, acceptance, decisions and retained evidence from the prior board.
The short entry in board.yaml controls status, owner, dependencies and locks.

```yaml
  - id: JANITOR-DIAGNOSTIC-NOTES
    title: "Resolve remaining unindexed diagnostic notes"
    lane: TOOL
    size: S
    needs: []
    status: backlog
    owns: [docs/board/checks/, docs/ARCHITECTURE.md, docs/AUDIO_ITERATION.md, docs/changes/JANITOR-DIAGNOSTIC-NOTES.md]
    helpers: [reviewer]
    acceptance:
      - "Review remaining September 23 balance-hold and opponent-audio diagnostic notes against current guides. Fold still-needed facts, remove proven superseded notes and pass the docs lane gate."
      - "Preserve required immutable look/listening verdicts, Kyle's AUD-12 selections, pending AUD-17 auditions and receipts; an unindexed path alone is not deletion proof."
    note: "End-run audit retains uncertain historical diagnostics for review. Current P1/P2/BETA task facts have already been folded and consumed."
```
