# DEEP-SAVE

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: DEEP-SAVE
    title: "The Deep save fields, hints and dive kit"
    owner: codex
    lane: SAVE
    size: M
    needs: [DEEP-LOOK]
    status: ready
    flag: the-deep
    locks: [save-shape]
    helpers: [reviewer, save_guardian]
    owns: [src/deep/deep-discovery.js, src/deep/deep-hints.js, tools/fixtures/saves/09-deep.json, tools/test-deep-save.mjs, docs/changes/DEEP-SAVE.md]
    hooks: [src/screen-garage.js, src/progression.js]
    design_decision: "Claude, THE_DEEP 10.1: optional deep.found, deep.places, deep.logged, deep.pearls, deep.kit, deep.hintsShown and deep.pacificFinishes (Duel and Time Trial finishes on Pacific Canyon, stops at 10; wasteland.pacificFinishes unchanged); first hint at five, second at ten while found is empty; kit 150 credits, shown after the first hint.
    acceptance:
      - "Fields round-trip; old saves load byte for byte; memory-only save checker clear; hints and kit appear at the stated counts."
```

## App wiring request — 12 October 2026

The lane has settled the 10.1 save/hint/kit design and may implement its existing owned files and hooks now. Its requested app.js imports, switch-gated award payload, memory-only Time Trial finish callback, discovery/hint methods and kit purchase method are pending Director grant after Panorama releases busy-game-files. No app.js edits before that claim is committed. Garage button dispatch can use its existing granted handler; no main.js hook is needed. Coordinate the Deep journey integration through DEEP-ZONE and preserve the accepted GP pay/qualifying paths.

Director grants the roster assertion in `tools/test-save-fixtures.mjs` from eight to nine specifically for required fixture `09-deep.json`. Keep all legacy fixture assertions, round-trip, wallet and byte checks exact; the new fixture must be covered independently. Record this additive assertion reason. The lane found native Time Trial already reaches `_settleResult` through stageResult, so no extra finish callback is needed or granted. Event payload deepEnabled plus ordinary settlement handles both permitted modes, with Wasteland counting unchanged. App edits remain held until its lock is free.

## Director App grant — 12 October 2026

Panorama has relinquished all tested/frozen runtime hooks. This card now holds both save-shape and busy-game-files. Grant only app.js imports of owned Deep save/hint helpers, the existing settlement payload deepEnabled flag (Duel and Time Trial already share settlement), and getDeepDiscovery/showDeepGarageHints/purchaseDeepKit methods consumed by the owned garage dispatch. No new Time Trial callback, main.js changes, journey rendering or other App lifecycle edits. Honor the-deep plus current player, prevent duplicate hints/purchases, retain no-player and abandoned/qualifying/GP behavior, Wasteland counting and all legacy bytes. Reconcile the actual Panorama source handoff before final freeze/gate; its next-frame pit transit hooks must be preserved. One nearby lane/build, ordinary review and required fresh save guardian follow complete source. Root owns integration metadata.

Director parallel gate grant: the lane may adopt exact frozen Panorama c56238e970e4ffb0ef87ca90f1a907ba3cdf51ff as a source dependency before its integration merge. Its runtime already passed306/306 at83c58563; the remaining owned tools corrections are independently reviewed and its final gate is draining. Preserve that source exactly, resolve only the approved additive hooks, then obtain the same reviewer confirmation for any real conflict. This removes the earlier wait-for-integration-before-freeze restriction. Check actual shared capacity before the one final nearby lane/build, jobs4, at most three concurrent jobs under current AGENTS7. Root will merge this lane only after Panorama itself is green and integrated, so no unaccepted dependency bypasses the integration boundary. No heavy browser, balance, frames or full run.
