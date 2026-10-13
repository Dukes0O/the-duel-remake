# FUT-PAY-BY-DISTANCE

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: FUT-PAY-BY-DISTANCE
    title: "Rewards scale with race distance"
    owner: claude
    lane: DESIGN
    size: M
    status: backlog
    priority: future
    needs: [P4-CAREER-PAY]
    waiting_on: claude
    design_decision: "Kyle, via Claude 12 October 12:00: park this card; do not build it now. Claude designs, then Codex builds after Grand Prix career pay is released. Credits and later cup prize money scale with total race distance. Proposed shape to settle when it starts: today's mode and difficulty base times race distance divided by a reference near 8 km, with a floor at today's pay and a gentle cap. Longer three-lap, 6 to 7 km per-lap and Summit events reward their extra time. Keep finishing percentages 100/75/55/40/30/20/15/10, old saves and records; additive only."
    acceptance:
      - "Settle the distance formula and its floor, cap and reference before code. This is future work, not an update for the current run."
```
