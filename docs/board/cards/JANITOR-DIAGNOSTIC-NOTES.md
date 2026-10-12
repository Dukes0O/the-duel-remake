# JANITOR-DIAGNOSTIC-NOTES

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

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
