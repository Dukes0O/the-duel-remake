# P4-YETI: The yeti

Current scope, acceptance, decisions and retained evidence from the prior board.
The short entry in board.yaml controls status, owner, dependencies and locks.

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
