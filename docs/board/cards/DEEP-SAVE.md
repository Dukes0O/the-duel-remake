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
