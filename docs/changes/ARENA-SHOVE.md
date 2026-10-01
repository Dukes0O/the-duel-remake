# ARENA-SHOVE — tests-first freeze

The native car sweep reproduces all four sitting states. On unchanged source
`40b81c1159565ac1713b5d5d4d9a6c0593f64c96`, the new suite reports **56 tests:
31 pass, 24 fail, one TODO; 2,251 acceptance checks reached**. This is a RED
test handoff, not a source-complete card or a passing merge gate.

## Scope and acceptance

Only these new files belong to this freeze:

- `tools/test-arena-shove.mjs`
- `tools/replays/arena-shove-controls.json`
- `docs/changes/ARENA-SHOVE.md`

The suite uses the actual Duel, car dimensions and masses, arena event,
released contact solver, native drive/pilot, wreck damage and respawn timer,
protection, knocked motion, floor containment and world poses. No collision,
armor, brain, timer or knock function is replaced. Storage is not used.

Every ordered pair of the nine playable cars runs in all four states, all
three roles (player attacker, player target and CPU against CPU), and both
minimums: **1,944 native ram witnesses**. Each grouped assertion collects all
81 results before failing, so a first failure cannot hide another car pair.

- Wreck: native owned damage creates a real wreck; a real event step counts
  it and starts the 3.5-second wait. A struck wreck must move on the floor
  while that timer continues. A separate native control runs to actual
  respawn and checks full armor, exactly two seconds of protection and one
  wreck count.
- Wall pin: actual floor containment places the target against the solid
  boundary. The main minimum tests hit tangentially along the wall, where
  there is physical room to move. Outward normal confinement is a separate
  native control and a written design question below.
- Protection: the suite waits for the actual wreck recovery. Protection is
  the real event-created two-second guard, not an assigned flag. Both bodies
  retain armor while motion remains possible.
- Idle brain: the real participant's existing held-goal and reaction fields
  ask its native brain/pilot for zero speed. They do not suppress knock
  stepping. The player has zero throttle, brake and steer.

All measured positions come from actual motion after impact. Initial fixture
placement happens before contact. The target is never moved after the ram to
manufacture its distance. A native drive or pilot tick sweeps the attacker
from outside the actual contact envelope. Its incoming longitudinal speed
is checked against 20 or 40 mph after native drag. The initial 1.1-mph margin
covers the largest observed one-tick loss (Jesko); no below-threshold witness
is accepted.

The observation window is 210 real fixed steps (1.75 seconds). It measures
maximum world-space distance from the initial target position and keeps the
witness inside both the real protection interval and the wreck waiting
interval. This is a test observation window, not a new gameplay timer.
Every successful displacement must have actual native solver velocity.
Every target remains within the floor; waiting wrecks may not hop.

## RED findings and positive controls

The wreck guard rejects every mass pair before the native contact reaches the
solver. The actual wreck stays still while its real timer decreases.
Other groups expose light-car impacts on the Titan that fall below the
settled minimum, and the existing NPC yield path keeping the player still.
The arena fix must keep the road yield rules intact.

All 31 positive/control tests pass independently (283 checks). They cover:

- Actual live and protected Falcone-to-Dusthawk rams reaching contact,
  producing native knocked velocity and more than four metres of motion.
- Full native state and measured movement repeating across 30, 60 and
  144 presentation FPS for each of the four sitting states. The engine
  still runs the same 120-Hz steps.
- All 81 mass pairs in rear, side and corner released solver cases:
  243 results retained by the new source-baseline fingerprint.
- Released momentum and energy rules.
- Ten existing road full-state replay fingerprints copied unchanged from
  `arena-steering-controls.json`, including the Titan on High Country.
  No original pin was regenerated or changed.
- A real width-boundary swept miss giving the idle target no movement or
  knock.
- Real wreck counting and recovery, solid wall containment, and the existing
  native Titan crush and ordinary Falcone non-crush/event rules.

Before freezing, two new fixture setup issues were corrected without changing
any expected rule. First, an attacker's heading could change during the
native respawn wait; its final pose now precedes measurement of its contact
envelope. Second, the road crush fixture originally placed both car types
at a fixed five-metre gap, which touched the larger Titan but sat exactly
outside the Falcone boundary. Both now drive natively from just outside their
own actual envelopes. Both crush controls pass. The Jesko's native pilot
lost slightly more than one mph on a wall-side tick; the initial margin was
raised to 1.1 mph, and all final incoming-speed checks pass.

## Wall question for Claude

The settled minimum says any ram at 40 mph moves a pinned target at least
four metres. The existing Scrapdome design also says walls are solid, steep
hits stop a car, and cars cannot leave the floor. A purely outward ram into
an already pinned target has no free normal escape.

The separate real Falcone-to-Dusthawk outward witness reaches contact and
remains contained on all 210 ticks, but moves **2.770668 metres** at an
initial 41 mph. This is not counted as a passing universal minimum.
One explicit TODO asks Claude to reconcile the outward minimum with the
solid wall. Tangential minimums remain strict; no escape, teleport, weakened
minimum or new wall rule has been invented. The Director accepted this
test split and is sending the design question in writing.

## Commands and source

Source for every RED run:
`40b81c1159565ac1713b5d5d4d9a6c0593f64c96`.

Final native RED:

`node --test --test-reporter=tap tools/test-arena-shove.mjs`

Exit 1; 56 tests, 31 pass, 24 fail, one TODO, 2,251 checks, 15.355 seconds.
No failure remains for a below-threshold fixture, invented displacement,
missing native solver velocity, floor escape or protected damage.

Independent positive/control run:

`node --test --test-name-pattern 'positive control|released solver|released road|outward wall|real swept miss|waiting-wreck timer|fixed-step shove' --test-reporter=tap tools/test-arena-shove.mjs`

Exit 0; 31 tests, 31 pass, 283 checks, 1.332 seconds.

Raw logs are ignored under
`.evidence/2026-09-30/ARENA-SHOVE/`. The verdict and each failing grouped
assertion are recorded below. No build, lane/full gate, browser check, release,
live folder, Preview, protected port or real save was used for this tests-first
step. The production worker must pass the prescribed gates after its fix.

## Changed assertions and fingerprints

None. All acceptance assertions and the one new baseline fixture are new.
Existing tests and replay fixtures are untouched. No arena fingerprint was
regenerated. The fixed-step arena comparisons are generated in memory from
the same source and inputs at each presentation rate, not replacement pins.

## Removed

Nothing replaced. No production code, assets, licensed sources, tests or
existing fingerprints were removed. The initial raw log was moved from a
temporary wrong location into the ignored evidence directory before freeze;
there is no new root artifact. Raw evidence is deleted by the merge janitor
after its verdict is committed.

## Each final failure message

- wreck/player-attacker: every playable mass pair at 20+ mph moves at least 1.5 m: 81 native mass/state/role witnesses fail; first: falcone_f42→falcone_f42: native swept ram never reaches contact
- wreck/player-attacker: every playable mass pair at 40+ mph moves at least 4 m: 81 native mass/state/role witnesses fail; first: falcone_f42→falcone_f42: native swept ram never reaches contact
- wreck/player-target: every playable mass pair at 20+ mph moves at least 1.5 m: 81 native mass/state/role witnesses fail; first: falcone_f42→falcone_f42: native swept ram never reaches contact
- wreck/player-target: every playable mass pair at 40+ mph moves at least 4 m: 81 native mass/state/role witnesses fail; first: falcone_f42→falcone_f42: native swept ram never reaches contact
- wreck/cpu-cpu: every playable mass pair at 20+ mph moves at least 1.5 m: 81 native mass/state/role witnesses fail; first: falcone_f42→falcone_f42: native swept ram never reaches contact
- wreck/cpu-cpu: every playable mass pair at 40+ mph moves at least 4 m: 81 native mass/state/role witnesses fail; first: falcone_f42→falcone_f42: native swept ram never reaches contact
- pinned/player-attacker: every playable mass pair at 20+ mph moves at least 1.5 m: 8 native mass/state/role witnesses fail; first: falcone_f42→titan_monster: moved 0.374711 m; requires 1.5 m
- pinned/player-attacker: every playable mass pair at 40+ mph moves at least 4 m: 9 native mass/state/role witnesses fail; first: falcone_f42→titan_monster: moved 1.531088 m; requires 4 m
- pinned/player-target: every playable mass pair at 20+ mph moves at least 1.5 m: 81 native mass/state/role witnesses fail; first: falcone_f42→falcone_f42: moved 0.000001 m; requires 1.5 m
- pinned/player-target: every playable mass pair at 40+ mph moves at least 4 m: 81 native mass/state/role witnesses fail; first: falcone_f42→falcone_f42: moved 0.000001 m; requires 4 m
- pinned/cpu-cpu: every playable mass pair at 20+ mph moves at least 1.5 m: 15 native mass/state/role witnesses fail; first: falcone_f42→titan_monster: moved 0.202443 m; requires 1.5 m
- pinned/cpu-cpu: every playable mass pair at 40+ mph moves at least 4 m: 9 native mass/state/role witnesses fail; first: falcone_f42→titan_monster: moved 1.466526 m; requires 4 m
- protected/player-attacker: every playable mass pair at 20+ mph moves at least 1.5 m: 9 native mass/state/role witnesses fail; first: falcone_f42→titan_monster: moved 0.353650 m; requires 1.5 m
- protected/player-attacker: every playable mass pair at 40+ mph moves at least 4 m: 10 native mass/state/role witnesses fail; first: falcone_f42→titan_monster: moved 1.673722 m; requires 4 m
- protected/player-target: every playable mass pair at 20+ mph moves at least 1.5 m: 81 native mass/state/role witnesses fail; first: falcone_f42→falcone_f42: moved 0.000000 m; requires 1.5 m
- protected/player-target: every playable mass pair at 40+ mph moves at least 4 m: 81 native mass/state/role witnesses fail; first: falcone_f42→falcone_f42: moved 0.000000 m; requires 4 m
- protected/cpu-cpu: every playable mass pair at 20+ mph moves at least 1.5 m: 16 native mass/state/role witnesses fail; first: falcone_f42→titan_monster: moved 0.157158 m; requires 1.5 m
- protected/cpu-cpu: every playable mass pair at 40+ mph moves at least 4 m: 17 native mass/state/role witnesses fail; first: falcone_f42→titan_monster: moved 1.662036 m; requires 4 m
- idle/player-attacker: every playable mass pair at 20+ mph moves at least 1.5 m: 9 native mass/state/role witnesses fail; first: falcone_f42→titan_monster: moved 0.353650 m; requires 1.5 m
- idle/player-attacker: every playable mass pair at 40+ mph moves at least 4 m: 10 native mass/state/role witnesses fail; first: falcone_f42→titan_monster: moved 1.673722 m; requires 4 m
- idle/player-target: every playable mass pair at 20+ mph moves at least 1.5 m: 81 native mass/state/role witnesses fail; first: falcone_f42→falcone_f42: moved 0.000000 m; requires 1.5 m
- idle/player-target: every playable mass pair at 40+ mph moves at least 4 m: 81 native mass/state/role witnesses fail; first: falcone_f42→falcone_f42: moved 0.000000 m; requires 4 m
- idle/cpu-cpu: every playable mass pair at 20+ mph moves at least 1.5 m: 16 native mass/state/role witnesses fail; first: falcone_f42→titan_monster: moved 0.157158 m; requires 1.5 m
- idle/cpu-cpu: every playable mass pair at 40+ mph moves at least 4 m: 17 native mass/state/role witnesses fail; first: falcone_f42→titan_monster: moved 1.662036 m; requires 4 m
