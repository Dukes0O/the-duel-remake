# DEEP-LOG

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: DEEP-LOG
    title: "Sea-life log and pearls"
    owner: codex
    lane: UI
    size: M
    needs: [DEEP-SAVE, DEEP-TRAIL]
    status: backlog
    flag: the-deep
    owns: [src/deep/deep-log.js, tools/test-deep-log.mjs, docs/changes/DEEP-LOG.md]
    hooks: [src/screen-garage.js, src/paint-presets.js]
    acceptance:
      - "Log a creature within 6 m of its zone spot under 15 km/h for one second (spots, not moving creatures); pearls; pearl-white finish after nine; garage log page with silhouettes. Do not edit paint-presets.js while P4-YETI is building."
```
