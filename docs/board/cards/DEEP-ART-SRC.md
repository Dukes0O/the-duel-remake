# DEEP-ART-SRC

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: DEEP-ART-SRC
    title: "The Deep creatures and set sources"
    owner: codex
    lane: ART
    size: L
    needs: []
    status: ready
    flag: the-deep
    owns: [public/assets/models/deep/, docs/board/looks/deep-art/, docs/changes/DEEP-ART-SRC.md]
    hooks: [tools/art/catalog.json, public/assets/models/CREDITS.md]
    acceptance:
      - "The 14 creatures of THE_DEEP 10.1 plus wreck hull, giant clam, anchor and sunken boat, CC0 first, credited; round sheets judged by Claude, at most three rounds; no frame check (rule 9)."
```
