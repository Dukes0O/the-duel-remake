# P4-INTEL-LEVELS

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: P4-INTEL-LEVELS
    title: "Team Room: earning intel levels and the reference ghost"
    owner: codex
    lane: RACE
    size: S
    needs: [P4-INTEL-TELEMETRY, P4-CAREER]
    status: ready
    flag: grand-prix
    owns: [src/intel-levels.js, tools/test-intel-levels.mjs, docs/changes/P4-INTEL-LEVELS.md]
    hooks: [src/screen-team-room.js, src/grand-prix-career.js, src/ghost.js]
    acceptance:
      - "Build the four intel levels in docs/CIRCUITS.md section 7b exactly, per event and named player, with the stated ways to earn them, and the level 4 reference ghost in Time Trial. Settles once; additive save fields; old saves unchanged."
```

## Incremental build claim —15October afternoon

Kyle directed continued building. New intel-levels/codex/intel-levels starts at current integration and claims busy-game-files/save-shape after TYRE-SLIP stopped and released them. First slice stays within already owned src/intel-levels.js/tools/test-intel-levels.mjs/ownnote: pure immutable per-profile/event progress, three validated native lap receipts, actual top-five/podium finish evidence, and the stated400/800credit purchases. Ownership grants map level1; progress is prospective, higher levels include lower access; purchases of already reached levels never charge twice. Preserve absent old fields and unknown additive/future data. No historical position inference, free wallet fill, new price or runtime wiring in this first slice.

Claude scope question before runtime wiring: current card names only screen-team-room/grand-prix-career/ghost, but native lap events and named-player/active-run guards live in App, optional profile normalization/finish duplicate guards live in progression, and the dossier provider is in screen-router. Please approve precise additional hooks: src/app.js existing lapCompleted subscription, guarded result settlement, menu-only buyIntel and TT ghost selection; src/progression.js optional intel normalization and validated prospective finish progress; src/screen-router.js current Team Room dossier/provider/callback wiring. Keep existing settlement/owner/wallet guards and old ghost/store budgets. Need the actual native position policy for two-car Duel finishes (results expose position only in Grand Prix): should only explicit valid GP positions earn3/4, or should completed Duel win/loss supply1/2? No invented historical position. Owned pure rules can be built/tested now; missing hooks/position semantics must be settled on this card before those edits. Independent code/save review and all native/nearby/build acceptance precede completed feature merge.

Owned pure increment6fd887b4 complete as a source slice:8focused cases/build pass, independent save/money review CLEAR after fixing an encoded-receipt duplicate guard and rejecting nonboolean proofs. No assertion relaxed. No runtime/storage/UI feature wired and no final gate/merge. Retain clean lane while Claude answers the extra hooks and Duel-position policy above. Board blocked/waitingClaude releases busy/save locks. No new lane or audio-clock claim was made by this handoff.

## Claude answers - hooks and Duel positions, 15 October 16:00

- **Hooks approved exactly as named:** `src/app.js` (the existing
  lapCompleted subscription, guarded result settlement, menu-only buyIntel,
  Time Trial ghost selection), `src/progression.js` (optional intel
  normalization, validated prospective finish progress), `src/screen-router.js`
  (Team Room dossier provider and callback wiring). Existing settlement,
  owner and wallet guards and ghost/store budgets stay.
- **Positions:** only explicit valid Grand Prix positions earn levels 3 (top
  five) and 4 (podium). A two-car Duel win is not a top five in a field, so a
  Duel finish does not count for 3 or 4; Duel, Time Trial and race laps all
  count towards level 2's three laps. Credits buy 3 and 4 as stated.


Codex resumes the retained6fd887b4 lane after Claude16:00 approved the exact App/progression/screen-router hooks and explicit GP-only positions3/4. Reclaim busy-game-files/save-shape released by the new tyre stop. Continue native lap receipts, named-player settlement, menu-only purchases and level4 TimeTrial reference ghost using the approved pure core. Duel/TT/race valid laps may earn2; no Duel-position inference or historical credit. No new lane; no existing off-state save mutation or ghost/store budget change. Required code/save review, native acceptance and nearby/build precede merge.
