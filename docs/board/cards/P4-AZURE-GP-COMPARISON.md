# P4-AZURE-GP-COMPARISON

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

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
