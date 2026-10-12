# GATE-FRAME-DELIVERY: Explain variable browser frame delivery in fixed native scenes

Current scope, acceptance, decisions and retained evidence from the prior board.
The short entry in board.yaml controls status, owner, dependencies and locks.

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
