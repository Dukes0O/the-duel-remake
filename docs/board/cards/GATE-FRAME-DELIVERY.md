# GATE-FRAME-DELIVERY

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: GATE-FRAME-DELIVERY
    title: "Explain variable browser frame delivery in fixed native scenes"
    owner: codex
    lane: TOOL
    size: S
    needs: []
    status: backlog
    owns: [tools/scenarios/blackiron.mjs, tools/scenarios/convoy-frames.mjs, docs/changes/GATE-FRAME-DELIVERY.md]
    acceptance:
      - "Identify frame-delivery variability with bounded native evidence. Preserve scene, sample counts, all timing limits and failure behavior. No automatic retries or tolerance changes."
      - "Blackiron first release sweep measured High p95 210.9 ms; one unchanged quiet rerun measured 33.4 ms High and 16.8 ms Performance and passed the original 50 ms limit. Treat this as an unreliable observation, not proof of cause."
    note: "Do not hold feature work after the unchanged passing retry. Spend at most 30 minutes on a future investigation."
```
