# P4-CAREER: Grand Prix in the career: menu, prices, pay, records

Current scope, acceptance, decisions and retained evidence from the prior board.
The short entry in board.yaml controls status, owner, dependencies and locks.

```yaml
  - id: P4-CAREER
    title: "Grand Prix in the career: menu, prices, pay, records"
    owner: codex
    lane: RACE
    size: M
    needs: [P4-PANORAMA]
    status: ready
    flag: grand-prix-career
    owns: [src/grand-prix-career.js, tools/test-grand-prix-career.mjs, docs/changes/P4-CAREER.md]
    hooks: [src/screen-courses.js, src/course-access.js, src/progression.js, src/leaderboard.js, src/app.js]
    acceptance:
      - "Build docs/CIRCUITS.md section 7 except cups: the GRAND PRIX section on the course screen, track prices, variant unlock by a top-three finish, pay by position calibrated to existing circuit wins, snowman credits, records and ghosts per event and mode. Additive save fields with defaults; old-save fixtures load unchanged. Tracks added later join the same list."

    design_decision: "Claude answer marked 22:10 approves position pay at 100/75/55/40/30/20/15/10 percent of the existing difficulty base, positive completed-GP pay with no Duel loss charge, existing eligible bonuses/milestones, snowmen25CR cap10 and existing once-only settlement. P4-CAREER-PAY is a separate early slice; course-screen section, variants and prices remain after Panorama merges."
```
