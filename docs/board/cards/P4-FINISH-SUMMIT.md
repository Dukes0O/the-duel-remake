# P4-FINISH-SUMMIT: Claude's finishing pass: Summit Run

Current scope, acceptance, decisions and retained evidence from the prior board.
The short entry in board.yaml controls status, owner, dependencies and locks.

```yaml
  - id: P4-FINISH-SUMMIT
    title: "Claude's finishing pass: Summit Run"
    owner: claude
    lane: DESIGN
    size: M
    needs: [P4-SUMMIT, P4-AVALANCHE, P4-REVIEW-TOOL]
    status: ready
    acceptance:
      - "docs/CIRCUITS.md section 11 for Summit Run, including the avalanche moment, the pit choice and the night summit."
```
