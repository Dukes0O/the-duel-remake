# P4-YETI

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: P4-YETI
    title: "The yeti"
    owner: codex
    lane: RACE
    size: S
    needs: [P4-SUMMIT]
    status: ready
    owns: [src/yeti.js, tools/test-yeti.mjs, docs/changes/P4-YETI.md]
    hooks: [src/circuits/summit-run.js, src/armor-kits.js, src/paint-presets.js, src/grand-prix-career.js]
    acceptance:
      - "Build the yeti in docs/CIRCUITS.md section 5.4 exactly: seeded about 1 race in 3, three ridge spots, sighting within 60 m with a clear view, roar and walk-off, YETI! callout once, career sighting count, yeti roof look at 3 and frosted paint at 5. It never touches a car or blocks the road. Model from Kyle's pick; name from Kyle and Gratian when given."

    overnight_design_answer: 'Claude 12 October 10:00: count a sighting only at race finish through the existing once-only settlement; quitting does not count.'
```

## Director production preflight — 12 October 2026

Reuse the actual selected Quaternius CC0 yeti.glb/yeti-lod.glb,43joints and five clips. Kyle's catalog selection and accepted round-three3.5 verdict already exist; no regeneration/fourth round. Ground its real animation against authored terrain; an animation clip is not evidence of foot grounding. Sightings use simulation positions and actual terrain/obstacle visibility, never camera state or collision bodies. Existing roar cue suffices.

Required production hooks: Game reset/fixed-step sighting and existing event delivery; read-only animated view through the existing world/render lifecycle; audio event mapping; actual finish flag forwarding; progression's optional guarded sighting ledger/normalization; App's earned-change persistence and menu-only cosmetic selection; garage/router selection; paint-presets and vehicle-attachments' real road roof socket. Existing armor roof rendering is combat-only and does not display a reward on noCombat Summit. Acquire busy-game-files and save-shape after the earlier source cards release them, with one ordinary code review and fresh save review. No actual runtime milestone or code claim yet.

## Claude answers

Pre-code decision request: confirm completed Summit sightings count in ordinary Duel/TimeTrial and GP even when grand-prix-career is off; proposed minimal separate optional run/stage sighting ledger before that existing early return, with all normal pay/history/records exact, no quit/timeout/qualifying/practice/invalid/duplicate award, and no old-field allocation while absent/off. Please also settle simulation viewing angle/eye point, whether rewards apply to each owned car for that named player, road roof conflicts with the existing Chrome Crown/roof attachments, and the intended Yeti roof/frosted appearance using the accepted asset and existing paint route. Keep seeded roughly1in3,three ridge sites25–40m from road,60m clear-view sighting,once-only callout,finish-only count,3/5 thresholds and zero stat changes. No new model, fourth art round or changed legacy cosmetic ownership is assumed. Answer here and clear waiting_on in the same board commit. Native grounding/look acceptance waits for night.
