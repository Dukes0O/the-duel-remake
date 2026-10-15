# P4-CUPS

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: P4-CUPS
    title: "Cups and the trophy case"
    owner: codex
    lane: RACE
    size: M
    needs: [P4-CAREER, P4-SUMMIT, P4-VARIANTS, P4-TREMBLANT-SNOW, P4-GP-EXISTING]
    status: ready
    locks: [save-shape]
    flag: grand-prix
    owns: [src/grand-prix-cups.js, src/screen-trophies.js, tools/test-grand-prix-cups.mjs, docs/changes/P4-CUPS.md]
    hooks: [src/grand-prix-career.js, src/screen-courses.js, src/screen-garage.js, src/app.js]
    acceptance:
      - "Build the cups in docs/CIRCUITS.md section 7: Mountain, Night and Winter Cups and the Grand Tour, points 10 to 1 with the tie rule, saved per named player, abandonable, settled once, cup bonus pay, and the garage trophy case. Additive save fields; old-save fixtures load unchanged."
```

## Pre-code money and series questions —15October afternoon

P4-VARIANTS is in its corrected final gate, so prepare the next gameplay card without starting a lane or source. Section7 specifies10/8/6/5/4/3/2/1points and better best finish, but gives no cup bonus amounts. Claude: please settle exact bonus credits per cup/difficulty and whether Grand Tour requires three cup wins at any difficulty or the selected difficulty. For a points tie with identical best finish, should compare next-best finishes (countback), share a placing, or use another stated rule? Please also name the narrow progression optional-profile/one-time wallet settlement and normalization hook needed by the already approved saved-series/bonus requirement; current hook list names App/career/screens only. Do not invent money values or bypass existing named-player/duplicate/save guards. Summit remains dev, so cups containing it stay inaccessible through normal play until the approved course is released. No source/claim/lane/check has started here; independent code/save review and ordinary gate/build remain required.
