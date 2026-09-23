---
task: CMB-02
status: ready-for-review
kind: combat-feature
flag: wasteland2
player_facing: yes
---

# Ramming and front bumper spikes

## What changed

In flagged Wasteland, player and CPU combat cars now transfer bounded,
mass-based momentum on an accepted collision. An offset contact shovels the
struck car sideways, including when both cars are moving at the same speed.
Harder front contacts can briefly launch a car. A light car can be pushed off
the route; zero armor still uses CMB-01's local wreck and recovery. A slower
rear contact also moves and slows both cars, without armor loss below the
40 km/h closing-speed threshold.

Each combat car has front bumper spikes by default. The 1.5 damage multiplier
applies to the *other* car only when the equipped attacker's front face
strikes. Rear, side and reverse contacts use plain ram damage. Setting
`combatBumperSpikes=false` on an actor disables both the multiplier and its
visible spikes. A shield prevents armor loss, while solid-body separation and
shove continue.

An unordered player/CPU or CPU/CPU pair produces one impact incident while
the cars remain in contact. Its momentum, armor loss and `combatRamHit`
events do not repeat each frame. The pair rearms after final positions clear
the contact envelope plus the tuning margin. A damaging contact emits one
indexed event per victim direction, with actual armor removed after shield or
overkill, closing speed in km/h, spike use, and a finite world position.
This also corrects `applyArmorDamage`'s return value from nominal damage to
actual armor removed for later scoring work.

The new response is limited to flagged Wasteland combat cars. The existing
traffic, NPC cut-in yield, ordinary racing and flag-off Wasteland rules keep
their prior paths. No permanent crush is made from a flagged combat-car ram.

## Verification

The independent red acceptance tests were cherry-picked from
`codex/cmb02-test-author` (`d87ac7c` upstream; `d0e54a9` on this branch).
They started with eight expected red cases and four positive controls on
`fc6cbc7`. One additional low-speed momentum assertion was added without
removing or relaxing any independent assertion.

| Check | Result |
| --- | --- |
| `node tools/test-combat-ramming.mjs` | 13/13 passed; spike faces, all CPUs, shields, equal-speed shove, low-speed shove, latch, 30/60/144 FPS and pinned ordinary digests |
| `node tools/test-combat-armor.mjs` | 19/19 passed |
| `node tools/test-armored-vehicle-impact.mjs` | Passed |
| `node tools/test-contact-damage.mjs` | 195 checks passed |
| `node tools/test-combat-field-shields.mjs` | Passed |
| `npm run test:lane` | 187/187 passed in 499.66 s; 162 pinned replay fingerprints and 213 scripted multi-car checks passed |
| `npm run build` | Passed; existing large-chunk advisory only |
| `git diff --check` | Passed |

The private `tools/scenarios/combat-ramming.mjs` fixture uses disposable
memory-only saves and unlocks the Titan only in that profile. It runs the
same route, car and three-CPU field at 1280 × 720 in High and Performance.
Titan's front spike removes 53.108 armor from CPU 2. After 24 normal 60 Hz
CPU movement steps, that Viper is 15.42 m lateral, off the paved route, and
1.18 m airborne. A later overkill hit reports the last five armor actually
removed; the CPU wrecks once and returns at 60% armor. No ordinary crash slot
is spent. The scene also checks that disabling the bumper hides its five
spikes. Both qualities passed with six screenshots, no warnings and no
browser errors. The final report and images are under
`.qa-dist/browser-output/combat-ramming-2026-09-23T22-27-14-348Z/` in the
isolated CMB-02 worktree.

| 120 real browser frames | Ordinary p50 / p95 / max | Flagged Wasteland p50 / p95 / max | Frames above 33 ms |
| --- | --- | --- | --- |
| High | 16.7 / 16.8 / 16.9 ms | 16.7 / 16.8 / 17.1 ms | 0 in both |
| Performance | 16.7 / 16.8 / 16.9 ms | 16.7 / 16.8 / 16.8 ms | 0 in both |

These are short, settled, steady-scene headless Chrome/SwiftShader samples.
They show no measured p95 regression in this fixture, but do not measure a
full real race on varied hardware or the frame that first triggers a ram.

## Boundary

Traffic and roadside sign knock-away are separate work. This card covers
player-to-CPU and CPU-to-CPU combat rams only. CMB-05 will add deliberate CPU
attack decisions; the current accidental cut-in yield guard remains in place.
The bumper is a current combat-rig feature, not a purchased upgrade or a save
field. The `wasteland2` switch remains in development state.
