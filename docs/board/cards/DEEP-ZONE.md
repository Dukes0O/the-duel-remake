# DEEP-ZONE

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: DEEP-ZONE
    title: "The Deep zone format, Pacific ramp and dive entry"
    owner: codex
    lane: SIM
    size: L
    needs: [DEEP-LOOK]
    status: ready
    flag: the-deep
    locks: [busy-game-files]
    owns: [src/deep/deep-zone.js, src/deep/deep-journey.js, src/deep/deep-ui.js, src/deep/deep-ui.css, tools/test-deep-zone.mjs, docs/changes/DEEP-ZONE.md]
    hooks: [src/app.js, src/game.js, src/course.js, src/coastal-water.js, src/render3d.js]
    design_decision: "Claude, THE_DEEP 10 and 10.1: zone format v1 as written; ramp in the Pacific Coast cove off the racing line; pause, Dive / Turn back and ramp return copy the Hidden Road journey. A test zone lives in the test only."
    acceptance:
      - "Zone format 10.1 loads; the ramp, shoreline pause, dive choice and return work in Node; Pacific Canyon fingerprints exact with the ramp unused and with the-deep off. Lane tier, build, one review."
```

## Parallel lane interface — 12 October 2026

DEEP-AUDIO owns an event/update/stop adapter in src/deep/deep-audio.js with an injected existing audio host; this card owns its App journey lifecycle wiring when busy-game-files is available. DEEP-SAVE owns discovery/hint/kit methods; coordinate its eventual narrow App hook rather than duplicating save fields or award logic. Preserve all switch-off paths.

## Director independent format slice — 12 October 2026

DEEP-ZONE-FORMAT owns deep-zone.js and its pure Node acceptance independently while Summit holds busy-game-files. This card now depends on that slice and retains journey/UI/ramp/runtime wiring ownership; do not duplicate its validator or edit its files concurrently. Its10.1 contract and exact runtime/replay acceptance stay. No new production zone or changed ramp position is implied.

Validated format source6934122f is integrated: original20/20 lane and build1988.9206ms, ordinary review and persisted-ID repair confirmation CLEAR. Reuse defineZone/version1 and the existing unchanged zone floor; do not duplicate their implementation. All runtime ramp/journey/waterline/scene contracts remain this card’s next work once busy-game-files is free.
