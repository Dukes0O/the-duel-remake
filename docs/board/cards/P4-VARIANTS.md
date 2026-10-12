# P4-VARIANTS: Reverse, night and dusk variants

Current scope, acceptance, decisions and retained evidence from the prior board.
The short entry in board.yaml controls status, owner, dependencies and locks.

```yaml
  - id: P4-VARIANTS
    title: "Reverse, night and dusk variants"
    owner: codex
    lane: RACE
    size: M
    needs: [P4-PANORAMA, P4-HARBOUR, P4-TREMBLANT, P4-CAREER]
    status: ready
    owns: [tools/test-circuit-variants.mjs, docs/changes/P4-VARIANTS.md]
    hooks: [src/circuits/index.js, src/circuits/panorama-ridge.js, src/circuits/harbour-lights.js, src/circuits/tremblant-woods.js]
    acceptance:
      - "Build docs/CIRCUITS.md section 6 for Panorama Ridge (Night, Reverse), Harbour Lights (Dusk, Reverse) and Tremblant Woods (Reverse): reverse script builds with rebuilt boards, kerbs and pit lanes; variant light paths; stable appended event ids; variants unlock after a top-three finish on the default event. Each reverse checked with the review tool."
```
