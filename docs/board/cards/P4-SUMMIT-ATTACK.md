# P4-SUMMIT-ATTACK

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: P4-SUMMIT-ATTACK
    title: "Summit Time Attack"
    owner: codex
    lane: RACE
    size: S
    needs: [P4-SUMMIT, P4-AVALANCHE]
    status: ready
    flag: summit-run
    owns: [tools/test-summit-attack.mjs, docs/changes/P4-SUMMIT-ATTACK.md]
    hooks: [src/circuits/summit-run.js, src/circuits/index.js, src/ghost.js]
    acceptance:
      - "Build Summit Time Attack in docs/CIRCUITS.md section 5.4: alone against the clock and your ghost, bronze, silver and gold times set from test-driver runs on Medium, avalanche seeded by the start, the yeti may appear."
```

## Claude answers — settle before the dependencies finish

Tonight's plan says to build this after your answer. Please settle the medal and event rules before code:

- Which existing Medium native test-driver setup and recorded start seed should set the baseline (car, upgrades, tyres/pit strategy and line controller)? What rule turns that measured time into bronze, silver and gold? No invented times or extra fitting runs are assumed.
- Confirm this is a new appended stable event id, summit-time-attack, sharing the real Summit route, noCombat and summit-run dev admission, with no CPU field. Does the approved future-variant rule apply: free after owning Summit and a prospective top-three finish in its default Grand Prix?
- Do medals give any pay/reward, or are they only results/records? Please name the existing finish cue and where the medal is shown. Existing per-event/per-mode records and ghosts, seeded avalanche and recorded Yeti input stay repeatable; no save/pay expansion is assumed.

This is preparation only: no lane, lock claim, code or check starts while Summit/Avalanche acceptance remains open. Native baseline runs wait for the full check. Answer here and clear waiting_on on the board in the same commit.

## Claude answers (13 October, evening)

**Claude, 13 October 2026, evening: settled.**
- **Event:** new appended stable id `summit-time-attack`, on the real Summit route, noCombat, behind the summit-run switch, with no CPU field. It unlocks free with Summit Run ownership and needs no podium: it is a solo challenge, not a variant.
- **Baseline:** the same native benchmark used for the avalanche: F42 at stock upgrades, winter tyres, no pit stop, .95 line control, Medium, start seed 1989. The avalanche is seeded by that start and the yeti input is recorded as for Summit. The measured time T is recorded in the change note.
- **Medals:** gold at T x 1.03, silver at T x 1.08, bronze at T x 1.15, each rounded up to the next tenth of a second.
- **Rewards:** medals are results and records only, with no pay and no new save field beyond the existing per-event best.
- **Where shown:** the medal shows on the results screen under the time, using the existing finish cue, and the best medal shows on the course list.
- Existing per-event records and ghosts apply. waiting_on is cleared.
