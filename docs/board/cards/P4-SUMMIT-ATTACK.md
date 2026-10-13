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
