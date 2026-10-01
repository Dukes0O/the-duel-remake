# ARENA-SHOVE — partial collision source stage

All **1,944 native mass/state/role shove witnesses now pass**. The unchanged
complete suite reports **56 tests: 55 pass, zero fail, one wall-design TODO;
2,251 checks reached**. The newly granted waiting-wreck hook steps real slide
motion during the unchanged recovery timer after a normal Fuel integration
merge. Independent source review, the wall interpretation, browser/Kyle feel
and exact lane/full gates remain; no whole-card or merge pass is claimed.
Pilot and game remain outside this slice. Earlier partial results are below.

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

## Granted waiting-wreck event continuation — 1 October 2026

The Director returned source ownership and granted only `arena-event::stepWreckedActor`, with the existing contact/knock/solver/floor hooks, in integration commit `1998f9df4be7bc9eada083dd50986d593f85d9e4`. Before editing source, this lane normally merged `integration/wasteland` into its clean `66ac011b441237cffb549c7f17576d5855edd90b` head. Merge commit is `e11ff1080cae41d8bf678a9018201a17522df14f`; Fuel's reviewed source and history are preserved. No rebase, history rewrite, release or live operation occurred.

The native suite on that clean merged source reproduced the same **50 pass, five real wreck-motion failures and one TODO**, with **2,251 checks**. Its frozen tests and controls preceded this continuation and remain unchanged.

### Narrow native fix

`stepWreckedActor` still decrements the actual recovery timer once per fixed tick and mirrors it into `impactTimer`. If a waiting player/CPU wreck has native knock motion, it now calls the existing obstacle-aware `stepWreckSlide` and solid `containInArena` functions. A stationary wreck retains the prior speed-damping branch. The only other event-file edit is the required named import for that native function. No event mode, score, Fuel, respawn, pilot or game body was rewritten.

The floor now removes outward free-body velocity for a waiting wreck as well as the prior sitting-car shove, while retaining tangential motion. An already wrecked actor is contained quietly: it receives no second scenery damage attempt or wall-hit cue. Live-car wall damage, thresholds, cooldown, protection and steep/glancing rules remain intact. No source code resets a wreck timer, sets a target pose, invents displacement, adds an observation-window clock or changes the released solver math.

The native crash result and existing arena minimum feed real slide velocity; both player and CPU waiting wrecks now consume it through actual Duel fixed steps. Wrecks remain grounded, count once and recover at the original deadline with full armor and exactly two seconds of protection. A ram into a physically blocking outward wall still has no invented exit. The authored universal normal minimum remains Claude's unresolved interpretation; the existing TODO is retained verbatim.

### Final native and preservation checks

- `node --test --test-reporter=tap tools/test-arena-shove.mjs`: **56 tests, 55 pass, zero fail, one TODO**, **2,251 checks**. All **1,944 real witnesses** pass across every ordered pair of nine cars, all four sitting states, three roles and both 20/40 mph minimums. The original five event-driven wreck REDs are green without editing an assertion.
- The same suite retains **243 released solver rear/side/corner results**, momentum/energy controls, **ten road full-state pins**, Titan crush/non-crush, native swept miss, actual wreck counting/deadline/full-armor/protection, floor containment and repeated results at 30/60/144 presentation FPS. Solver fingerprint remains `fb34f6167f8707be7c4cd3bee0addbde206a32ef9f5cddf3adb0a7c6a6baa9f2`.
- The contained outward pinned live witness remains **0.000001 m**. This is measurable constrained motion, not a passing universal normal minimum or a cleared design TODO.
- Merged Fuel controls: **186/186 TAP tests across five suites** pass unchanged: Fuel Run, depot, car attribution, standing carrier and on-foot car contacts. Fuel logic/source/pins were not modified by this continuation.
- Existing collision/knock/NPC/Mad Max/crash/damage/armor/Titan/event/steering/police controls: **83/83 TAP tests across 14 suites** pass unchanged, retaining **43,174 NPC yielding** and **195 contact-damage** checks.
- `node tools/test-replays.mjs`: **162/162 pass** across 18 cases, 16 events, eight categories, three frame rates and three runs. No original road/combat replay pin was regenerated.
- `npm run build`: passes in this isolated lane's normal `dist`; the existing large-chunk warning remains.

An additional ignored native diagnostic used a genuine 95 mph swept ram into an already counted waiting wreck at the wall. Native target velocity represented **60.352414 mph** into the wall, above the ordinary 30 mph wall cue threshold. Real event stepping contained it with **zero new wall cues**, **one wreck count** and no airborne motion. Its **3.491667 s** remaining deadline expired at **3.5 s** elapsed, within one existing 120 Hz tick; native respawn restored full armor and **2 s** protection. The first diagnostic setup stopped because its ignored scratch folder was missing; creating that folder and rerunning the native diagnostic passed. This setup error is not counted as an acceptance failure or a browser gate.

Raw logs and the extra diagnostic stay ignored under `.evidence/2026-10-01/ARENA-SHOVE/wreck-event-stage/` and `.qa-dist/`. Changed assertions, fixtures and replay pins: **none**. Source uses LF; staged diff is checked before review freeze. No real save, port 5174, Preview, `.preview-dist`, protected audio, dependency or network service was used.

### Current hashes

| File | SHA-256 |
| --- | --- |
| Changed src/arena/arena-event.js | a31f935b2d00446d8cc26b72929f128ef86bb49bdc5f0373766d0a28fbaf0852 |
| Changed src/arena/arena-floor.js | 1b9e39b1c3439468558ae6a290dcb3a75230a5f9a25601d578bb829d9929f28c |
| Prior unchanged src/sim-contacts.js | c9df9d399a61b78775e641e2239c9137843c1a544871455a9051486a82023522 |
| Prior unchanged src/vehicle-knock.js | b3137b7566e50fce7eef0b680fd770ca2179af4515bdad9f6ba76d210b6047c0 |
| Unchanged pure src/vehicle-collision.js | 087d90e9d02689908755f13feb5ec121722f0f26de8acdc8ac3362b536337993 |
| Unchanged src/arena/arena-pilot.js | f2bfa54d0f0cd19382fd8aa67b2aeec1e9f790a274f5f220e7510d7e7dcd071c |
| Unchanged merged-Fuel src/game.js | 141b7183413366b7a4a4c9df12d22f165106b5706ae78ebd54d68a73ab4e822e |
| Unchanged merged-Fuel src/arena/modes/fuel-run.js | d7bf8b46872b921f27320950421e8cedc506ba2d4d3a7cd9a37a634bd7d0335e |
| Frozen shove acceptance | b4a5ca0c387345618d94c37d05567ca583d2a1e7dcbd291ea72f2b89cf024fd6 |
| Frozen shove controls | a08bb7507e8e2c110789b907ed3977dc6de9ac39943e89aad4c8cb9f5a3a474b |
| Unchanged Fuel controls | dba6cbb7fc3ff26d1a4b2076c662276352975b9ccf723cb1739caa2399511089 |
| Existing ordinary replay pin | b55182cbc6d6121a205fa24ba9049aeefabd7943a6e12ebba5a7f868c068c77a |
| Existing combat replay pin | 85d9457ccd27534cfd7134547690b0ea5ad430fd9f374a63a1015c0b4b781536 |

### Remaining gates and Removed

Independent source review comes next. The Director retains the outward-wall interpretation with Claude. Native browser checks, Kyle's Preview feel check and any required gameplay/balance evidence remain; exact lane/build/full integration gates follow review. The production build above is passing evidence for this source stage, not whole-card or integration merge clearance. Existing crash cues are reused, and protected sound-bank/audio files remain unchanged.

Removed the waiting-arena-wreck event branch's stationary-only motion handling when an actual native knock exists. The original stationary damping remains. Removed duplicate wall-damage/cue attempts for an already waiting wreck while preserving solid containment. No timer, score, protection rule, Titan crush rule, released solver, road rule, Fuel source, pilot/game hook, old assertion, replay pin, asset, licensed source or real save was removed.

## Settled solid-wall tests and private browser recipe — 1 October 2026

Claude settled the open wall question in `e5a9490`: the 1.5 m at 20 mph and 4 m at 40 mph minimums apply where the push direction has open floor. A car pinned against the outer wall and rammed straight outward stays contained, takes eligible ram damage, and the attacker rebounds. A component along the wall still slides. The solid boundary, existing damage/protection/dead rules and released solver remain unchanged; no teleport or escape direction is authorized.

The Director granted tests/scenario plus an append-only note. Clean independently reviewed source `eba804dd4e48e2856051b962efbe7ebd6560466c` normally merged integration `0f934845b451dc2429efcb574bc9847cc04a1fe5` without conflicts at `2045676637372467b5f5b1b379ed8080f933dd80`. That merge brings the written decision and changes no production source relative to eba804dd. No history rewrite or source edit occurred.

Only the former empty wall TODO and its unresolved explanatory comment were replaced. All **55 original tests, assertions and helpers** remain byte-for-byte exact when this authorized replacement is reversed: original full-suite SHA-256 `b4a5ca0c387345618d94c37d05567ca583d2a1e7dcbd291ea72f2b89cf024fd6`. The original **1,944 minimum witnesses**, ten road pins, released 243-result solver pin, native timer/protection/crush/miss controls and 30/60/144 repeatability assertions remain unchanged. Shove control fixture SHA-256 remains `a08bb7507e8e2c110789b907ed3977dc6de9ac39943e89aad4c8cb9f5a3a474b`. The old separate outward containment test and its historical console wording remain exact; this new settled acceptance supersedes the former uncertainty.

### New native acceptance

The normal-wall controls add **3,888 real witnesses**: all 81 ordered playable mass pairs, four actual sitting states, three player/CPU contact roles, both wall sides and 20/40 mph thresholds. Wreck and protection states come from actual owned damage, wreck counting and recovery. Initial poses and held native CPU goals isolate a stopped wall contact; native drive/pilot motion creates the approach, the actual swept contact/solver transfers motion, and 210 ordinary 120 Hz steps measure its result.

A pure outward target must remain on the same wall within 0.1 mm geometric tolerance. Both bodies stay contained. Eligible 40 mph contacts retain actual ram armor damage. The 20 mph cases retain the existing 40 kph damage threshold and therefore do not invent damage below it. Protected contacts preserve both bodies' armor. Waiting wrecks stay grounded, undamaged and quiet, count once and retain their running recovery deadline. These checks do not change damage, timer, guard or sound rules.

The attacker must show both **actual velocity away from the wall greater than 0.000001 m/s** and **more than 1 cm inward motion after the initial contact correction**. The sign and motion checks prevent tiny overlap separation from being called a rebound. Neither condition was relaxed after reproducing source failures.

Eight additional oblique tests cover 32 actual contacts, both along-wall directions, both sides and all four states at both speeds. They require genuine tangential slide and containment; they do not impose a new minimum into a blocked direction. Two traffic controls use genuine seeded ordinary-road traffic, actual swept contact and native solver motion. Traffic is labelled as an existing native road/solver control: the public arena still has no traffic roster, protection or respawn contract. No traffic participant shape was invented.

### Exact RED and positive controls

On unchanged merged production 2045676:

- `node --test --test-name-pattern '^SETTLED WALL' --test-reporter=tap tools/test-arena-shove.mjs` initially ran the 50 normal-wall/traffic tests: **ten passed, 40 failed**, no skips/TODOs, **3,950 checks**, **79,959.3127 ms**. All 40 failures are genuine attacker-rebound failures; containment, measured incoming threshold, damage eligibility, protection and wreck lifecycle checks pass. Each failing group contains 81 ordered mass witnesses. The eight passing normal groups are player targets in actual wreck/protected states, both sides and both speeds; both traffic controls also pass.
- Failure groups: wreck and protected each fail player-attacker and CPU-to-CPU on both sides at both speeds (eight failures per state). Pinned and idle each fail all three roles on both sides at both speeds (12 failures per state). Every failure begins `81 settled normal-wall witnesses fail; first:` and reports `attacker must genuinely rebound away from wall`. For Falcone-to-Falcone player attacks, measured reverse velocity is **0.000000 m/s**; inward motion is **0.022007 m** at 20 mph and **0.029716 m** at 40 mph. That small separation cannot satisfy the unchanged velocity sign requirement. CPU examples likewise report zero reverse velocity despite small correction motion.
- After adding the independent oblique controls, `node --test --test-name-pattern '^SETTLED WALL TANGENT:' --test-reporter=tap tools/test-arena-shove.mjs`: **8/8 pass**, **128 checks**, **462.6951 ms**. The normal-helper observation addition does not alter its zero-angle fixture or production state transitions. No rebound condition changed.
- `node --check tools/test-arena-shove.mjs` and `node --check tools/scenarios/arena-shove.mjs`: pass. The full combined native suite and card gates await the source fix; this freeze does not claim a current full-suite pass.

Raw native logs are ignored at `.evidence/2026-10-01/ARENA-SHOVE/settled-wall-red/native-wall.log` and `native-tangent.log`. The first wrapper saved the complete native log, then hit a Windows CP1252 console-display error for the arrow character while printing its tail. A read-only ASCII-safe display recovered the verdict. That display problem is not counted as a source failure; the actual native suite exited 1 for the 40 rebound failures.

### Private browser recipe and limits

New `tools/scenarios/arena-shove.mjs` uses the existing browser harness and actual memory-only menu, discovery/yard/arena entry, native rematch and 120 Hz Duel steps. High and Performance cases capture each stopped state before and after genuine 20/40 mph contacts, both straight outward wall sides, and actual wreck-deadline/full-armor/two-second-protection recovery. It retains the same strict rebound sign/motion requirement. The moving frame sample runs the real App and records mean/P95, draw and triangle counts; it invents no measured result or frame pass.

Fixtures are explicit: temporary rank-six discovery profile, starting stopped/approach poses, a one-armor setup followed by a genuine owned contact to create a wreck, held existing CPU goals, and isolated weapon/crate timers. No collision, armor, solver, event, model or actor method is replaced. Actual source geometry/vehicle-key readiness is required before capture; loading presentation is not accepted. If on-foot presentation is active, the selected real authored crew must be loaded and visibly skinned. Rendering reads the resulting state; no renderer path writes a target pose or manufactures displacement.

Planned actual command after the rebound source fix: `node tools/browser-harness.mjs scenario arena-shove --output-dir .evidence/2026-10-01/ARENA-SHOVE/browser-final`. Heavy capture was coordinated with the Director and held during the root full gate; the Director has now released that hold. This test-first freeze includes the **syntax-checked recipe only**. No browser build, capture, frame result, screenshot inspection or audible result has run for this new scenario. Root assigns the source repair and fresh actual browser/gates next.

Scripted poses, held goals and state setup do not establish natural CPU behavior, human Preview handling or resolved historical HUD overlap. Native all-mass/traffic/FPS/contact/deadline evidence remains separate from what a screenshot can show. Existing collision cues remain reused and the sound bank is untouched. Human feel/listening remain pending. The existing `stepWreckSlide` allocates objects; no allocation-free claim is made.

### Removed — settled wall acceptance

Removed only the former empty unresolved-wall TODO and replaced it with the written settled native behavior and genuine private browser recipe. No original assertion, fingerprint, solver, source, native actor shape, current asset, licensed source, sound bank or player data was removed or rewritten. Raw RED evidence stays ignored until its verdict is consumed. No live game, Preview, `.preview-dist`, port 5174, real save, network service, new dependency or other lane was used.


## Provisional constrained-wall source and fixture witness: 1 October 2026

The Director granted the collision/knock/floor hooks after clean independent tests-first freeze 7b928ef5a6452d02db3f1f90a66812fb39d7b70b. The lane normally merged current integration 1498b33c2c4d85903db2002a11da6583d35f64bb at 4c14691cabc700780a538f8132826f6ec899e040 without conflicts. That merge changed only five integration documentation files. Existing Fuel, steering, source reviews, assertions and pins remain intact. No history was rewritten.

### Source scope

Only src/vehicle-collision.js, src/vehicle-knock.js and src/arena/arena-floor.js changed. The original pure solveVehicleImpact function body is byte-exact to the merged HEAD, with its normalized-LF body SHA-256 655e36c841e42a5fdcc3e25d97d707c55a147a6d24a8e09b3bb844191f4f4ca8. Ordinary roads still call that original function directly. An arena contact derives its constraint from the existing floor limit and the actual local Course frame. When a contact impulse compresses a car into that wall, the separate pure solver uses the wall's normal and angular support reaction while retaining along-wall translation. No new wall/body geometry, teleport, pose target, escape direction, private minimum timer or artificial displacement was introduced. Open contacts still use the original pure solver. Minimum shove is not boosted into a constrained normal; real unconstrained tangential motion remains physical.

The existing contact damage, protection, timers, wreck counting and cues are unchanged. No pilot, brain, game, event mode, Fuel, Salt, Arsenal or protected audio source was edited. This is a provisional measured source freeze for independent fixture review, not finished card or merge clearance.

### Exact RED and intermediate results

- The clean merged source reproduced the frozen focused command, node --test --test-name-pattern '^SETTLED WALL' --test-reporter=tap tools/test-arena-shove.mjs: **58 cases, 18 pass, 40 fail**, no skips/TODOs, **4,078 checks**. This includes all 3,888 normal-wall mass/state/role/side/speed witnesses, two traffic controls and eight oblique cases/128 checks. All failures were the expected missing attacker rebound.
- First normal-only constraint stage: the same frozen focused suite reported **50 pass, eight fail**. All original 40 missing rebound groups became green. Eight previously passing player-target wreck/protection groups exposed later target movement, up to about 0.045 m. The full native suite at that intermediate source reported **113 cases, 105 pass, eight fail**, retaining every original 55 control and all 1,944 minimum witnesses.
- Adding the pinned body's compressive angular wall reaction retained **50/58 focused cases**, **4,078 checks**, with the same eight player-target wreck/protection groups RED. Their maximum measured late movement reached about 0.410 m. No drift, containment, armor, guard, rebound or deadline assertion was changed. The eight genuine oblique cases remain green. The first-stage full result is labelled intermediate; a final full/native/lane/build pass is not claimed.
- Current unaffected controls: **241/241 TAP cases across 20 suites** pass, covering collision, knock integration, NPC yielding, armored impacts, crash slide/switch/site, contact damage, combat armor/terrain, Titan climb/handling, arena events, steering ceiling, Wasteland police and all five Fuel/depot/attribution/carrier/on-foot car suites. Existing native actor and recovery guards remain unchanged.
- node tools/test-replays.mjs: **162/162 unchanged ordinary fingerprints** across 18 cases, 16 events, eight categories, three frame rates and three runs. No road/combat/Shove pin was regenerated.

### Exact later-contact witness for independent fixture review

A read-only in-memory diagnostic reuses the frozen native wall helper setup and the actual methods. Canonical case: Falcone against Falcone, player target, genuine protected recovery, 40 mph and positive wall side. The first contact is an actual launched attacker response at stageTimeSec **3.5083333333333235**, attacker dv **48.85190090602515 mph**. Its measured reverse velocity is **3.602253516276269 m/s**. Native scrub immediately reduces the target's tiny along-wall speed to zero; through observation tick 80 the target remains at zero speed, s differs from 90 by less than 0.0000003, and its first knock has cleared normally.

The frozen holdIdle helper assigns targetId='player', reactionSec=10 and a zero-speed goal. After the rebound frees this CPU's driver, actual thinkBrain sees that the player is protected or wrecking. It legitimately invalidates that fight target, changes targetId to null, resets the reaction and chooses its existing cruise goal: **39.96971184537563 mph**. At observation tick 60 the actual CPU has already resumed acceleration toward that cruise goal; by tick 80 it travels **10.868 mph** with a changed heading.

The existing production vehicleSmash notification proves a second real contact at stageTimeSec **4.233333333333333**, exactly **0.725 s** after the first. Its severity is knocked, attacker dv **13.4065101738652 mph**, and the target's native speed becomes **-1.1625527355784537 mph** along the wall. It ends with **0.38956905912964235 m** of genuine target travel. This later tangential contact must not be suppressed to satisfy a fixture intended to measure one purely outward stopped-wall hit. The two combatRamHit records are the initial bidirectional zero-armor reports; they were not evidence of two contacts. The later existing vehicleSmash notification and its native state establish that second contact independently.

Raw genuine tick/goal/state evidence is ignored at .evidence/2026-10-01/ARENA-SHOVE/pinned-rebound/late-contact-probe.json; the real notification witness is smash-witness.json. Both use read-only observers and unchanged production methods. The source was paused at this measured result as directed. Independent review must determine whether the held fixture should use its actual null target while the player cannot be fought, preserving the explicit reaction/zero-speed goal and every strict assertion. No proposed fixture correction was applied here, even in a claimed acceptance run. The eight REDs remain honest pending that review.

### Freeze hashes

| File | SHA-256 |
| --- | --- |
| Changed src/vehicle-collision.js | cc5f712abb3261d98facc9a41dd8d0fd2c03a8877128fdc0bc2c9db187f557f6 |
| Changed src/vehicle-knock.js | cad4fe002892cc919e3d121c0eafd5190229e90f81a10a393d6f96bbc9760b24 |
| Changed src/arena/arena-floor.js | ed699fc574985e82f678b31c3dde9f762a7fb02ca1fe3a1a57bfb0a007809fe0 |
| Unchanged src/sim-contacts.js | c9df9d399a61b78775e641e2239c9137843c1a544871455a9051486a82023522 |
| Unchanged src/arena/arena-event.js | a31f935b2d00446d8cc26b72929f128ef86bb49bdc5f0373766d0a28fbaf0852 |
| Unchanged released src/arena/arena-pilot.js | f2bfa54d0f0cd19382fd8aa67b2aeec1e9f790a274f5f220e7510d7e7dcd071c |
| Unchanged src/game.js | 141b7183413366b7a4a4c9df12d22f165106b5706ae78ebd54d68a73ab4e822e |
| Unchanged src/arena/modes/fuel-run.js | d7bf8b46872b921f27320950421e8cedc506ba2d4d3a7cd9a37a634bd7d0335e |
| Frozen tools/test-arena-shove.mjs | 60ad43622be1330d9a5238a3cea243a54aec8df86bd1e1eb313c88b48b1e8775 |
| Frozen tools/replays/arena-shove-controls.json | a08bb7507e8e2c110789b907ed3977dc6de9ac39943e89aad4c8cb9f5a3a474b |
| Frozen tools/scenarios/arena-shove.mjs | c1cca12330ddcef3aaf6b748b2ea9264ccbc9a1564adf53ebc20f6282c713bb0 |

### Remaining gates and Removed

The Director requested this clean provisional freeze and returned ownership for independent fixture review before further source work. A complete current native suite, exact lane tier/build, generic review, actual private High/Performance browser scenario and any frame/gameplay/balance/audio checks remain. No current whole-suite, browser, human feel, frame, audio, merge or release clearance is claimed. Existing temporary pose/vector objects and the constrained solver's temporary objects/closures allocate; this is not allocation-free. Logs remain private, regenerable evidence; no generated output was committed.

Replaced only the arena caller's unconstrained response where an actual wall compresses the contact, and removed minimum-speed amplification into that constrained normal. The released default solver and open-floor response remain. No timer, score, protection rule, Titan rule, road rule, Fuel source, pilot/brain behavior, assertion, fixture, replay pin, asset, licence or audio was removed or replaced. No live folder, Preview/.preview-dist, port 5174, real save, dependency, network operation, force removal or release was used.
