# P4-AZURE-GP-COMPARISON: Azure Grand Prix comparison in the Team Room

Current scope, acceptance, decisions and retained evidence from the prior board.
The short entry in board.yaml controls status, owner, dependencies and locks.

```yaml
  - id: P4-AZURE-GP-COMPARISON
    title: "Azure Grand Prix comparison in the Team Room"
    owner: codex
    lane: RACE
    size: S
    priority: low
    status: backlog
    needs: [P4-GP-EXISTING]
    owns: [docs/changes/P4-AZURE-GP-COMPARISON.md]
    design_question: "Scope a Grand Prix geometry reference and comparison without replacing the base Azure reference used by Duel and Time Trial."
    acceptance:
      - "Team Room can compare Azure GP laps against a matching GP reference; base circuit records and references stay exact. Claude21:20 accepts base-only until this follow-up."
```
