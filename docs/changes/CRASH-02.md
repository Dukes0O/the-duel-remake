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
accumulated 30, 60 and 144 FPS schedules, displayed vehicle yaw, the
sixteen-actor capacity boundary, renderer listener disposal, delayed texture
readiness and capture-time effect lifetime.

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
forward, spun and reverse tyre positions, and thirty-two smoke sheets for
sixteen simultaneous actors. Runtime work clears old impacts when the course
changes or time rewinds. It uses preallocated actor and position storage for
up to sixteen knocked cars, with player, racing opponents, police and traffic
as the explicit visibility order.

The exact-candidate review found two remaining per-frame allocations: course
samples for every smoke site and result objects from the atlas UV helper. The
renderer now resolves the two already-placed rear wheel pivots into reusable
vectors, and the atlas helper writes into caller storage. The focused contract
proves that the production resolver never samples the course, that a
seventeenth actor is dropped after the stated priority order, and that the
event bridge subscribes, forwards once and disposes.

The first browser verdict failed even though every mesh was visible. The
atlas frames blended into the asphalt and the two smoke plumes read as one
faint patch. A second test-first correction selects readable existing frames,
keeps each plume on its rendered wheel, and adds a small code-native wireframe
flash behind the authored contact art. Its late draw order prevents vehicle
bodywork from hiding the cue; strict scale bounds keep the burst local to the
struck panel. No asset or simulation rule changed.

The next exact-candidate review found that a failed production wheel lookup
still entered the route-space fallback, sampled the course, and could draw
smoke for a hidden car. A supplied renderer resolver is now authoritative: a
failed lookup hides both plumes, while direct unit users without a resolver
retain the deterministic route-space fallback. The same correction removes a
remaining spread of the combat actor list and caps the flash after its late-life
expansion, not only at age zero. Three red regressions cover these cases.

Independent screenshots also exposed a race in the QA recipe: Performance
could capture while renderer warmup still read `scheduled`. The scenario now
starts the real race, waits for both renderer warmup and combat effects to
report ready, and only then stops simulation and creates the reviewed crash.
Two consecutive High and Performance runs produced the same readable result.

## Evidence

- Focused CRASH-02 and shared combat-effect tests: 30 passed, 0 failed after
  the review fixes. The CRASH-02 file contributes 18 behavioral tests.
- Armored impacts, police knock, police route reset, combat ramming, combat
  replay fingerprints and ordinary replay fingerprints all pass. The ordinary
  replay run covers 162 checks across 18 cases and three frame rates.
- The broader adjacent suite passed 56 of 56 test entries, including combat
  replay fingerprints, vehicle damage and crush graphics, save-independent
  feature switches and the fixed knock integration.
- The private memory-only browser scenario passes in High and Performance on
  random ports above 5191. It observes one real launched impact at the exact
  contact point, rear damage, two distinct live rear-tyre plumes, ready
  effect resources, settled renderer warmup and no flag-off crash meshes. It
  freezes only the QA presentation after proving the live collision, waits
  500 ms, and requires all three contact layers to remain visible before
  capture. Two consecutive four-frame local reviews passed; each logged 0
  warnings and 0 errors. The stopped-scene 60-frame CPU samples stayed at or
  below 4.9 ms p95. Raw review files remain disposable until the merge verdict
  is committed.
- Independent code review passed exact code commit `946632b`: the production
  resolver failure, actor lookup, full-life flash bound, flag-off, disposal and
  readiness paths have no remaining finding. Independent browser review on
  private port 39157 passed both quality modes with ready warmup, two distinct
  plumes, local contact art, no flag-off pool and 0 issues, warnings or errors.
- Required lane tier passed 283 suites with 0 failures and 0 not run in
  433.66 seconds on exact reviewed code commit `946632b`. The production build
  passed with 236 modules transformed. The evidence-only follow-up commit gets
  the same lane tier and build before merge.

## Removed

No runtime assets were added. The visual lane reuses the four accepted combat
atlases and removes no released path. Raw browser evidence is deleted after
its verdict is committed.
