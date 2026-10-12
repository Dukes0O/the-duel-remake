# TOOL-02: Feel lab and audio checks

Current scope, acceptance, decisions and retained evidence from the prior board.
The short entry in board.yaml controls status, owner, dependencies and locks.

```yaml
  - id: TOOL-02
    title: "Feel lab and audio checks"
    wave: 0
    lane: TOOL
    size: M
    needs: [FND-08]
    status: backlog
    note: "Diagnostic tools merged as 3c22f41 and cbea2cd; focused feel/analyzer tests pass. Residual scope: exact-source feel report and guaranteed event coverage after BAL-02. Full-mix listening belongs to AUD-03. Future weapon checks belong to the cards implementing those weapons. No current branch or review is active."
    spec: "SPEC.md, task TOOL-02"
```
