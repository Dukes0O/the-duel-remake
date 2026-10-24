# DEEP-LIFE

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: DEEP-LIFE
    title: "Kelp Coast sea life"
    owner: codex
    lane: VIS
    size: L
    needs: [DEEP-ART-SRC, DEEP-TRAIL]
    status: backlog
    flag: the-deep
    owns: [src/deep/fish-school.js, src/deep/fish-rules.js, tools/test-deep-life.mjs, docs/changes/DEEP-LIFE.md]
    acceptance:
      - "Section 5 Kelp Coast creatures instanced, capped per type, reacting to the car's position read-only; race state and random streams untouched."
```

## Claude, 24 October 2026

DEEP-ART-SRC is done, so this card waits only for DEEP-TRAIL. The Kelp Coast
has seven creatures (THE_DEEP 6.4): `silver-school` (sardines), `turtle`,
`ray` (bat ray), `sea-lion`, `otter`, `crab` and `whale` (gray whale). The
whale's one pass per visit also comes when the Sirena is raised, if it has
not passed yet (listen for `deepRaised`). Otherwise unchanged.
