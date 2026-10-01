# ARENA-SHOVE — partial collision source stage

The granted collision stage passes all 18 non-wreck mass/state/role minimum
groups. The unchanged complete native suite now reports **56 tests: 50 pass,
five wreck-motion failures, one wall-design TODO; 2,251 checks reached**.
This is a bounded WIP source handoff, not a finished card or merge pass.
Arena-event/game/pilot hooks remain owned by Fuel and were not edited.

The original tests-first sweep on unchanged source
`40b81c1159565ac1713b5d5d4d9a6c0593f64c96` reported **31 pass, 24 fail,
one TODO**. Its findings and frozen controls remain below.

## Scope and acceptance

The original independent tests-first freeze owned these new files:

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

## Granted collision source stage — 30 September 2026

Built after clean independent test freeze `59a86de2679b16f0e5cffedfdbc5bfd40ba1f802`. The Director granted `src/sim-contacts.js`, `src/vehicle-knock.js`, `src/vehicle-collision.js`, `src/arena/arena-floor.js` and this note. This partial stage changes only contacts, knock motion, floor containment and this note. The pure vehicle solver is untouched. All tests, fixtures and replay pins are read-only; event, pilot and game hooks remain ungranted requests held by Fuel.

### Native motion changes

Arena contacts now accept a waiting combat wreck as a solid body. The original wreck rejection still applies on the road. Hostile arena participants no longer take the road NPC yielding path that rewinds the CPU while leaving a stopped player unmoved. Ordinary road yielding is unchanged.

Every arena contact still runs the released rigid-body solver. Its result supplies motion direction, spin, severity and all damage calculations without modification. For an actually sitting body (at or below the existing 1.5 m/s knock hand-back speed), a closing arena ram at 20 mph gains the settled 1.5 m minimum and at 40 mph the 4 m minimum. Only this arena free-motion path may raise the target's solver-directed speed. The speed floor is `sqrt(2 * KNOCK.slideDecel * distance) + KNOCK.endSpeed`: stopping distance under the existing 7.8 m/s² tyre scrub, with allowance for handing control back before complete rest. It uses neither the test's 210-step observation window nor any new timer. No target position is changed to manufacture the minimum; the existing solid-body penetration correction remains separate.

The new shove flag keeps a sitting car in free-body motion until its full planar speed settles. It uses isotropic prepared-floor scrub so the solver's body spin does not steer its travel direction. The existing driver/road knock path, steering curve and inputs remain unchanged. Waiting arena wreck knocks are grounded, carry the existing wreck flag and have no hop. The current ungranted event loop does not step them yet.

The existing solid floor clips the new shove's outward velocity at its boundary and keeps the tangential component. It never gives the minimum an escape through a wall. Existing wall limits, steep/glancing rules, armor thresholds, protection and damage cooldown remain unchanged. The outward witness is contained and now measures **0.000001 m**; the universal outward minimum still has no resolved design rule. This is not claimed as its minimum passing.

### Exact event hook still required

`src/arena/arena-event.js::stepWreckedActor` currently only decrements `combatWreckTimer`, mirrors it into `impactTimer` and damps `speedMph`. Both player and CPU waiting-wreck branches skip native knock stepping. The later granted event hook must step the existing `stepWreckSlide`/`stepKnock` free body while that same timer continues, with solid floor containment and no wall-damage/event report for an already wrecked car. It must retain exactly one wreck count, the original respawn deadline, full armor and two seconds of respawn protection.

The Director recorded this concrete need before any edit to event/game/pilot, and instructed this lane to freeze only the granted source part until Fuel merges. Those files remain byte-identical. No timer was reset, waiting wreck teleported, test weakened or fake event consumer installed. One wreck group currently passes through ordinary repeated contact separation; that is not proof of the missing event-driven free motion and does not complete wreck acceptance.

### Actual checks and remaining RED

- Before source edits, `node --test --test-reporter=tap tools/test-arena-shove.mjs` reproduced **56 tests: 31 pass, 24 fail, one TODO**, reaching **2,251 checks** on the clean test freeze.
- Final same unchanged command: **56 tests: 50 pass, five fail, one TODO**, reaching **2,251 checks**. All **1,458 non-wreck native witnesses** pass across the 81 car pairs, three roles, three sitting states and both minimums. Every actual incoming-speed, native-velocity, protection, damage and floor assertion remains strict.
- The five remaining groups are all actual wreck-motion minimums: player-attacker at 20 mph (**9/81 failing**, first Falcone→Titan **0.261714 m**) and 40 mph (**81/81**, first Falcone→Falcone **2.585687 m**); player-target at 40 mph (**81/81**, first Falcone→Falcone **2.662703 m**); CPU against CPU at 20 mph (**80/81**, first Falcone→Falcone **0.584496 m**) and 40 mph (**81/81**, first Falcone→Falcone **1.521467 m**). The timer/count/actual respawn controls still pass. These are retained REDs for the ungranted event hook, not laptop-tool failures.
- The released pure solver's **243 all-mass rear/side/corner results** still match SHA-256 `fb34f6167f8707be7c4cd3bee0addbde206a32ef9f5cddf3adb0a7c6a6baa9f2`. Released momentum and energy controls, ten native road full-state pins, Titan crush/non-crush, swept miss and 30/60/144 presentation-rate controls pass unchanged.
- **14 relevant existing suites, 83/83 TAP tests pass**: vehicle collision, vehicle knock integration, NPC yielding, Mad Max crash, crash slide, contact damage, combat knockaway, combat armor, armored impact, Titan handling, arena event, arena steering, steering ceiling and police knock. The existing road player-control branches, including force-knock callers, remain unchanged. These retain **43,174 NPC yielding checks** and **195 contact-damage checks**.
- `node tools/test-replays.mjs`: **162/162 pass** across 18 cases, 16 events, eight categories, three frame rates and three runs. No pin was regenerated.
- `npm run build`: passes in this isolated lane's normal `dist`; the existing large-chunk warning remains. Staged diff must be clean before freezing. Source uses LF.

Raw logs are ignored under `.evidence/2026-09-30/ARENA-SHOVE/source-stage/`. Changed assertions: **none**. This stage has no lane/full-tier, browser, balance, audio or whole-card merge clearance. Native event handoff and Claude's outward-wall answer must land before the finished card can pass its gates. Collision sounds use existing crash cues; protected audio ownership remains with Fuel.

### Source and protected hashes

| File | SHA-256 |
| --- | --- |
| Changed src/sim-contacts.js | c9df9d399a61b78775e641e2239c9137843c1a544871455a9051486a82023522 |
| Changed src/vehicle-knock.js | b3137b7566e50fce7eef0b680fd770ca2179af4515bdad9f6ba76d210b6047c0 |
| Changed src/arena/arena-floor.js | ac99c6eb16349700492192edc6830e003985d7791bb4b01c09a9aa31e52c52ee |
| Unchanged src/vehicle-collision.js | 087d90e9d02689908755f13feb5ec121722f0f26de8acdc8ac3362b536337993 |
| Unchanged src/arena/arena-event.js | 184ed15b5dd86cb01e7fa6d30c94e5ac0ecf6f00f67935b41b0a5b8a4c6506d0 |
| Unchanged src/arena/arena-pilot.js | f2bfa54d0f0cd19382fd8aa67b2aeec1e9f790a274f5f220e7510d7e7dcd071c |
| Unchanged src/game.js | 4eaa8bbc1f5887b1b6f6906c04a8438b2b37993071f86d960300815f6d1af50e |
| Frozen tools/test-arena-shove.mjs | b4a5ca0c387345618d94c37d05567ca583d2a1e7dcbd291ea72f2b89cf024fd6 |
| Frozen tools/replays/arena-shove-controls.json | a08bb7507e8e2c110789b907ed3977dc6de9ac39943e89aad4c8cb9f5a3a474b |
| Existing ordinary replay pin | b55182cbc6d6121a205fa24ba9049aeefabd7943a6e12ebba5a7f868c068c77a |
| Existing combat replay pin | 85d9457ccd27534cfd7134547690b0ea5ad430fd9f374a63a1015c0b4b781536 |

### Removed — partial source stage

Removed arena participants from the road-only NPC yield exception and removed the waiting-arena-wreck contact rejection; both original road rules remain. The new sitting-arena motion path replaces premature forward-only knock hand-back for that path. No pure solver, old road rule, steering setting, timer, damage/protection rule, Titan crush path, test, fingerprint, asset, licensed source, real save or other lane work was removed. The card's unfinished event hook stays recorded rather than hidden behind a placeholder.
