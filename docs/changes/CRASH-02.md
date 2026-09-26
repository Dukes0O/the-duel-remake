---
task: CRASH-02
status: active
kind: presentation
flag: crash-effects
player_facing: yes
---

# Crash look and sound (26 September 2026)

## Settled implementation

Claude's design in `docs/CRASH_PHYSICS.md` remains authoritative. The work is
split into separate visual and audio lanes as recorded in
`docs/board/decisions.md`.

This visual lane listens to the existing `vehicleSmash` event. It uses the
event's exact world point for a bounded spark and crumple flash, and scales the
presentation from its severity and change in velocity. It shows tyre smoke
only while an actor has live knocked motion. Launched traffic keeps the
CRASH-01 physical wreck roll. The renderer owns all effect ages and fixed
pools. It does not write simulation state or use simulation randomness.

All new work is behind the new `crash-effects` dev switch. With that switch
off, the current render and audio paths stay exact. The separate audio lane
will implement the existing `vehicle.crash-impact` cue and scale it by change
in velocity under SPEC 0.9.

## Tests first

`tools/test-crash-presentation.mjs` owns the focused visual contract. It must
fail before runtime work exists and cover exact contact placement, bounded
delta-v scaling, pause and expiry, knocked-only tyre smoke, fixed resource
reuse, state immutability, flag-off isolation and the existing launched-traffic
roll path. The final contract also covers course and stage-time resets,
accumulated 30, 60 and 144 FPS schedules, displayed vehicle yaw, eight
simultaneous knocked actors, renderer listener disposal and readiness gating.

The initial tyre-smoke assertion expected the billboard centre at exact ground
height. The implementation correctly starts it 0.3 metres above the contact
and lets it rise. Before runtime code was committed, the assertion was narrowed
to exact horizontal placement and less than one metre of vertical rise.

The two exact feature-switch inventory assertions now include the required new
`crash-effects: dev` entry and production-off check. No released switch state
or other existing expectation changed.

## Evidence-based scope correction

Read-only probes found that armored contacts launch cars without emitting the
normal path's `vehicleSmash`, and that police knocked by the solver keep a
zero-age knock while normal police driving continues. The Director re-sliced
the card in `docs/board/decisions.md` to the narrow contact and police hooks.
The added tests require one latched armored smash event and one-tick-only police
knock motion before either runtime path changes.

The first armored-event fixture initially used the legacy Wasteland contact
path and therefore found the normal event without its new actor field. Before
the contact fix, it was corrected to enable `wasteland2`, which selects the
actual armored helper identified by the probe.

The initial flag-off test only required hidden crash meshes. The audit showed
that this would still allocate the new pool in an armored race. Before runtime
code was committed, the test was strengthened to require that the optional
crash pool does not exist at all when `crash-effects` is off.

Before runtime commit, the focused contract was also strengthened with a real
ordinary-race contact, two distinct rear-tyre smoke sites and equal visual
state at the same simulation time under 30, 60 and 144 FPS render schedules.
The earlier horizontal smoke assertion used the actor centre; once the twin
site contract was added, it was moved to the deterministic left-rear tyre
offset and the second site must remain distinct.

Independent review of the first visual candidate found three blocking gaps.
An impact could survive a direct stage transition because simulation time
rewound without clearing the pool. Rear-tyre smoke used route offsets instead
of the car's displayed yaw. The smoke scan also created temporary arrays each
frame and covered only six cars. Red regressions now require reset clearing,
forward, spun and reverse tyre positions, and sixteen smoke sheets for eight
simultaneous actors. Runtime work clears old impacts when the course changes or
time rewinds. It uses preallocated actor and position storage for up to sixteen
knocked cars, with player, racing opponents, police and traffic as the explicit
visibility order.

## Evidence

- Focused CRASH-02, shared combat-effect, feature-switch and Wasteland tests:
  28 passed, 0 failed after the review fixes.
- Armored impacts, police knock, police route reset, combat ramming, combat
  replay fingerprints and ordinary replay fingerprints all pass. The ordinary
  replay run covers 162 checks across 18 cases and three frame rates.
- The private memory-only browser scenario passes in High and Performance on
  random ports above 5191. It observes one real launched impact at the exact
  contact point, rear damage, two live tyre-smoke sheets, ready first-frame
  resources and no flag-off crash meshes. Four review frames were captured;
  the browser logged 0 warnings and 0 errors. The stopped-scene 60-frame CPU
  samples stayed at or below 0.4 ms p95 in both modes. Raw review files remain
  disposable until the merge verdict is committed.
- Lane tier, production build and final independent review: pending.

## Removed

No runtime assets were added. The visual lane reuses the four accepted combat
atlases and removes no released path. Raw browser evidence is deleted after
its verdict is committed.
