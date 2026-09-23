---
task: CMB-01
status: ready-for-review
kind: combat-feature
flag: wasteland2
player_facing: yes
---

## Scope

The `wasteland2` development switch gives each car in a Wasteland combat race
its own armor, scaled from vehicle mass. Bolts, bombs, rams and major solid
scenery contacts remove bounded armor. Ram damage grows with relative speed;
major scenery removes the specified 20 armor. A car's own star blocks all
armor damage. Bombs near their thrower wait 0.35 seconds before arming, and
their self damage is capped at one quarter of normal damage.

At zero armor, a car emits one `combatWreck` event and shows the existing
explosion effect. The player and each CPU car stop for 3.5 seconds, then use
the established safe crash-site search within 12 m and return with 60% of
their own maximum armor. A wreck does not add an ordinary crash slot or race
penalty. Ordinary races and Wasteland with the switch off retain the old
rules and state shape.

The active Wasteland HUD shows current and maximum armor in place of the old
major-hit pips. It marks a zero-armor recovery, and wreck blasts use the
struck car's position for audio. A steep face or oversized rock charges one
terrain hit during uninterrupted contact; leaving and returning can start a
new incident.

The card does not add live spikes, armor-repair pickups or projectile homing.
Those belong to CMB-02, CMB-04 and CMB-07. The flagged race prepares one
combat-only player explosion pool and one per CPU before a wreck can occur;
ordinary and flag-off races allocate none of these extra pools. The combat
effect uses flame particles, an additive ring and debris without a PointLight.
Adding that light on the first blast changed the scene light count and caused
an approximately eight-second shader recompilation in the QA browser. The
ordinary explosion retains its approved shader, light and paused behavior.

## Acceptance and verification

Independent tests from `codex/cmb01-test-author` were cherry-picked as
`7db57f7`, `47b9793`, `ca12cad`, `420c9bf`, `9f19eca`, `1441426` and `b73ca3e`.
Independent mode-isolation tests followed as `fde9942` and `be092bd`. The first commit had
11 expected red cases and three positive controls on the base commit. Later
commits added Titan contact, real steep-face driving and re-entry, HUD, audio,
and level-three bomb arming assertions. The render-reuse assertions now check
the visible ring and flame for the combat pool, and explicitly reject a
dynamic combat light while pinning ordinary light and shader behavior.

| Check | Result |
| --- | --- |
| `node tools/test-combat-armor.mjs` | 19/19 passed |
| `node tools/test-combat-armor-terrain.mjs` | 2/2 passed |
| `node tools/test-combat-armor-hud.mjs` | 2/2 passed |
| `node tools/test-combat-armor-bomb-radius.mjs` | 1/1 passed |
| `node tools/test-audio.mjs` | 459 audio/PCM checks passed |
| `node tools/test-combat.mjs` | 66 legacy checks passed |
| `node tools/test-combat-opponents.mjs` | 8/8 passed |
| `node tools/test-combat-field-shields.mjs` | Passed |
| `node tools/test-contact-damage.mjs` | 195 checks passed |
| `node tools/test-armored-vehicle-impact.mjs` | Passed |
| `node tools/test-feature-flags.mjs` | 25 checks passed after its approved new dev-switch assertion |
| `node tools/test-vehicle-sockets.mjs` | 845 checks passed |
| `node tools/test-scene-presentation.mjs` | Passed |
| `node tools/test-render-reuse.mjs` | 171 checks passed, including paused first-blast visibility and stable light count |
| `node tools/test-explosion-paused-start.mjs` | 1/1 passed |
| `node tools/test-explosion-mode-isolation.mjs` | 3/3 passed; legacy shader/light and combat-only paused burst |
| `node tools/test-direct-color-output.mjs` | Five custom shader output checks passed |
| `npm run test:lane` | 186/186 passed in 384.72 s; 162 replay fingerprints and 213 multi-car checks passed |
| `npm run build` | Passed; existing Vite large-chunk advisory only |
| `git diff --check` | Passed |

The private wreck scenario passed
in High and Performance with six screenshots, a visible player and later-CPU
blast, a recovered ranked result, memory-only saves, and no browser warnings
or errors. The first real player wreck rendered in 121.2 ms in High and 68.2 ms
in Performance; the later CPU wreck rendered in 31.6 and 35.1 ms. See
`tools/scenarios/combat-armor-wreck.mjs` for the fixture and its presented-frame
gate, which avoids screenshots of an old canvas frame while shaders warm up.

A separate 1280 × 720 real-RAF sample compared 120 ordinary frames with 120
frames starting at the first armored wreck after the same course and field had
settled. In High, ordinary p50/p95/max was 16.7/16.8/16.9 ms with zero frames
over 33 ms; armored wreck was 16.7/16.8/83.3 ms with one frame over 33 ms.
In Performance, ordinary was 16.7/16.8/16.9 ms with zero over 33 ms; armored
wreck was 16.7/16.8/50.1 ms with one over 33 ms. The sample is one cold pass
per preset on headless Chrome/SwiftShader, not a broad hardware benchmark.
The remaining single first-wreck hitch is a follow-up optimization candidate
for blast and damaged-car material warmup; it does not change the 120-frame
p95 in this fixture. Reproducible setup is
`tools/scenarios/combat-armor-frame-pacing.mjs`.

## Boundaries and risks

The armor switch is in development state. It is available to the QA build by
`?flags=wasteland2` and to headless tests through a Duel feature override.
The default game keeps the old Wasteland behavior and legacy explosion visuals.
Combat-only player and CPU pools are prepared on a flagged race's first render.
The first blast still creates one noticeable frame above
33 ms in the measured QA run. `applyArmorDamage` currently returns nominal
capped damage rather than the actual armor removed when a hit exceeds the
remaining armor. Callers in this card ignore that return; CMB-03 scoring must
use actual armor removed.
