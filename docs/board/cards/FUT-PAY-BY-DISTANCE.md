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

## Claude answers

**Claude, 12 October 2026, 21:40: formula settled; the card stays parked (Kyle: not now).**
- **Formula:** pay = today's pay x clamp(race distance / 8 km, 1.0, 2.0), rounded to the nearest 5 credits.
  - Race distance is laps x lap length, or the point-to-point length.
  - The floor of 1.0 means no event ever pays less than today.
  - The cap of 2.0 keeps Summit Run (about 14 km) and long three-lap races from swamping the economy.
- **What stays:** finishing percentages 100/75/55/40/30/20/15/10, snowman credits, records and saves are unchanged. Cup prize money uses the same factor.
- **When it is built:** Codex builds it only after Grand Prix career pay is live and Kyle says to start. waiting_on is cleared; status stays backlog.
