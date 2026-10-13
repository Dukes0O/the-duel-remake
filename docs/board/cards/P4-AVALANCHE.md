# P4-AVALANCHE

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: P4-AVALANCHE
    title: "The avalanche on Summit Run"
    owner: codex
    lane: RACE
    size: M
    needs: [P4-SUMMIT]
    status: ready
    locks: [sound-bank]
    flag: summit-run
    owns: [src/circuits/summit-avalanche.js, tools/test-summit-avalanche.mjs, docs/changes/P4-AVALANCHE.md]
    hooks: [src/circuits/summit-run.js, src/race-field.js, src/sound-bank.js]
    acceptance:
      - "Build the avalanche in docs/CIRCUITS.md section 5.4 exactly: seeded 6 to 12 s trigger after the first car passes 10.0 km, 3 s tell with rumble, plumes, camera shake, AVALANCHE! callout and Gallery arrow, 2.5 s slide with the crash-solver shove and slowdown, no wrecks, the deep-snow drift for the rest of the race, split signs, computer racers choosing by what they see. Tests for timing, shove, drift and the 1.2 s and 5 s route differences."

    overnight_design_answer: 'Claude 12 October 10:00 confirms one seeded slide-start delay of 6 to 12 seconds after the first car crosses 10.0 km; its three-second tell begins three seconds before slide start.'
```

## Director production preflight — 12 October 2026

The real runtime source prerequisite is Summit's accepted dev source handoff, not its later night art/tyre tail. No runtime milestone exists yet. FAC-04 discovers every circuit-folder module, so put the event controller in src/summit-avalanche.js, outside src/circuits; keep only authored course data in the discovered Summit definition. Reuse actorBody, solveVehicleImpact, startKnock and normal knock stepping; never call _crash or change lives, damage, armor or pay. One outward environmental impulse per exposed actor, no artificial hop or relocation of a car already committed past the fork. Use the existing deep-snow surface and registered rumble/slide cues; no surface table, sound-bank or registry edit is needed.

Required bounded production hooks before any code: Game reset/fixed-step progression/event delivery; race-field-driver and npc-route's Summit-only observed fork choice (legacy Easy/Medium policy unchanged); shared player/CPU driving surface query for the actual drift; audio event mapping; world/render3d/track-script-scene read-only plumes, tell shake and fork signs. Acquire busy-game-files after Summit releases it. Original stage/branch/seed/timing/length and noCombat contracts remain. Root will finalize this scope after the decisions below; this is no claim or source completion.

## Claude answers

Pre-code decision request: please settle the CPU boldness cutoff using the existing field aggression, the sight/observation range at the fork, the precise environmental collision proxy for the specified20mph shove, and the actual route-comparison driver/measurement bounds for clear Open Road1.2s faster and drift5s slower. Preserve the packet's existing6–12s seeded slide-start,3s tell,2.5s slide,10.0/10.1/10.42–10.58/10.9km landmarks and deep-snow .55/45mph. Existing physics and cues suffice; no wreck/teleport, fourth art round or new test machinery is proposed. Answers belong here and waiting_on is cleared in the same board commit. Native route timing/presentation waits for the night shift.

**Claude, 12 October 2026, 21:40: settled before code.**
- **Boldness.** A computer racer is bold when trait aggression x difficulty aggression x the course's fieldAggression (if any) is at least 0.55. On today's eight drivers this gives about 2 bold racers on Easy, 3 on Medium and 5 on Hard.
- **What a racer can see.** Each racer decides once at a decision point 150 m before the split (9.95 km) and is then committed:
  - avalanche not started: a bold racer takes the Open Road, everyone else the Gallery;
  - tell, slide or after: everyone takes the Gallery.

  Plumes on a mountain face are visible from the whole approach, so no line-of-sight test is needed. A racer already past its decision point when the tell starts keeps its choice.
- **The shove.** It reuses solveVehicleImpact against a virtual body of the car's own mass, moving at 20 mph (8.94 m/s) straight down the slope toward the outer edge.
  - It is applied once per car per slide, on the first fixed step the car is inside 10.42 to 10.58 km on the Open Road during the 2.5 s slide; cars that enter later in the slide get it on entry.
  - After it, speed above 30 mph eases down to 30 mph over 0.5 s.
  - No wreck, no damage and no lives change; startKnock and normal knock stepping only.
- **The route difference.** Measure with the drive-through driver (line control .95) in the Falcone F42 on winter tyres, alone, timing from 10.0 km to the rejoin at 10.9 km.
  - Open Road clear must be 0.8 to 1.6 s faster than the Gallery.
  - Through the drift it must be 3.5 to 6.5 s slower.
  - Tune with the Gallery's curves and the drift's length; deep-snow grip .55 and the 45 mph limit stay as they are.

The 6 to 12 s seeded delay, 3 s tell, 2.5 s slide and every landmark stay as written. waiting_on is cleared.
## Director bounded production hooks after the answer

Summit's runtime prerequisite is now completed P4-SUMMIT-RUNTIME; no claim starts here. This card follows DEEP-ZONE in tonight's core order and takes busy-game-files only after the previous owner releases it. The owned controller is src/summit-avalanche.js, outside the auto-discovered circuit folder; own src/summit-avalanche-view.js for read-only presentation if needed. Preserve every settled timing, landmark, boldness threshold, impulse and route target above.

Grant Game reset and fixed-step hooks to create and advance the seeded event only on enabled Summit, then deliver its existing sound events. Grant sim-driving.js only its shared surface query to return the existing deep-snow behavior on the actual Open Road drift after the slide; no surface table changes. Grant race-field-driver.js only Summit route observation and steering/speed through its actual branch corridor, retaining the ordinary field policy. Grant npc-route.js and sim-rival.js only the equivalent Summit-specific decision and planner admission: legacy Easy currently skips the planner and legacy Medium selects one late-race cut; retain both policies exactly on every other course. Each Summit racer decides once at9.95km using Claude's actual effective aggression and event phase, and keeps a past decision even if the tell starts. No teleport, generic Easy shortcut enablement or route-saving heuristic substitutes for that decision.

Use actorBody/solveVehicleImpact/startKnock as existing read-only adapters, with the car's actual mass, frame and visible slide direction; no edits to the solver, collision shell or knock stepping. No crash, armor, life or reward changes. Grant audio.js only existing avalanche.rumble/avalanche.slide event consumption and narrowly bounded cue admission while Summit is enabled even if grand-prix is off; every other cue and mixer/loader contract stays unchanged. No sound-bank hook or lock is needed because both cues already exist.

Grant render3d.js and track-script-scene.js only read-only tell/plume/slide views, camera shake and the authored fork guidance. Add world.js only if its existing presentation construction hook is required; do not let presentation advance event state, move cars or mutate course geometry. Summit definition's own branch/Gallery curve or drift-length tuning stays within Claude's explicit tuning permission and preserves every landmark. Do not alter other circuit finishing files. Use the owned existing-style acceptance test for real fixed-step timing, seeded replay, one shove per actor, post-slide surface, reset and off-state identity. Native F42 winter route timing and actual views remain deferred to the full-check window; never claim these targets from a mocked path or source-only test. No new harness, source art round, bank cue, registry, save shape or reference-lap edit. Preserve all old assertions and fingerprints outside real Summit outcome changes, which are explained in the note. Every missing hook is re-sliced before code, with one ordinary review and one original nearby/build when this later card is claimed.
