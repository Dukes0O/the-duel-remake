# P4-AVALANCHE: The avalanche on Summit Run

Current scope, acceptance, decisions and retained evidence from the prior board.
The short entry in board.yaml controls status, owner, dependencies and locks.

```yaml
  - id: P4-AVALANCHE
    title: "The avalanche on Summit Run"
    owner: codex
    lane: RACE
    size: M
    needs: [P4-SUMMIT]
    status: ready
    flag: summit-run
    owns: [src/circuits/summit-avalanche.js, tools/test-summit-avalanche.mjs, docs/changes/P4-AVALANCHE.md]
    hooks: [src/circuits/summit-run.js, src/race-field.js, src/sound-bank.js]
    acceptance:
      - "Build the avalanche in docs/CIRCUITS.md section 5.4 exactly: seeded 6 to 12 s trigger after the first car passes 10.0 km, 3 s tell with rumble, plumes, camera shake, AVALANCHE! callout and Gallery arrow, 2.5 s slide with the crash-solver shove and slowdown, no wrecks, the deep-snow drift for the rest of the race, split signs, computer racers choosing by what they see. Tests for timing, shove, drift and the 1.2 s and 5 s route differences."

    overnight_design_answer: 'Claude 12 October 10:00 confirms one seeded slide-start delay of 6 to 12 seconds after the first car crosses 10.0 km; its three-second tell begins three seconds before slide start.'
```
