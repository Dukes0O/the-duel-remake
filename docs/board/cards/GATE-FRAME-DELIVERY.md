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

## Actual Harbour observation for later bounded scope

Copied bedd902a,13 October: native headed visible night Harbour/eight cars/120 delivered samples on the full-check's isolated memory-only QA page measured Highp9535.5ms (p5017.7/max36.3), totalconstruction4535.5ms (worldBuild559/worldReady3807), over18.5ms/1000ms. Fresh pre-stage GPU counters showed no busy engine>1%; builders had no concurrent heavy work during that official frame stage. Performance failed QA purchase before timing, so it is UNRUN. No previous green daily batch exists to name a first game merge. The cause is not proved; no tolerance, sample, warmup, asset/model/quality or renderer change was made. The current FAC source correction addresses only QA profile reuse, not High performance. Root stopped this failure investigation after30minutes; this backlog observation takes no new lane or runtime hooks.