# Director decisions

Standing decisions D1-D7 are approved in [SPEC.md](../../SPEC.md), section 15.
This log is for choices the spec does not settle. Record the choice, reason,
and how to reverse it before continuing.

## 2026-09-22 PDT — FND-10/FND-11 order

- Decision: Use FND-10's integrated seven historical fixtures as the
  prerequisite for FND-11, then complete FND-10's storage-budget design with
  FND-11's verified pre-migration backup in place.
- Reason: Four valid archived ghosts exceed the 4 MB localStorage budget.
  Moving them safely requires a recovery copy before changing their storage
  format. The fixture work is complete; the budget work remains open.
- How to reverse: Revert the archive migration and keep the unmodified raw
  localStorage shape; the FND-11 export/import and backup feature can stand
  independently behind its development switch.

## 2026-09-22 PDT — BUG-10 D-pad direction map

- Decision: Up fires UFO swap, Right fires bomb storm, Down fires crossbow,
  Left fires star shield. Each weapon fires once per new press.
- Reason: This follows keyboard weapon order 1–4 clockwise from Up and leaves
  analog steering, pedals, camera, and gear controls unchanged.
- How to reverse: Change the mapping in `src/app.js`, its fake-gamepad test,
  and the HUD/help text together, then rerun the input and browser gates.

## 2026-09-22 PDT — FND-10 storage unit and scope

- Decision: Interpret the 4 MB budget as 4,000,000 bytes of localStorage
  keys and values across the whole game origin. Count UTF-16 storage bytes.
  Keep gallery images and automatic backups in IndexedDB, as the spec says.
- Reason: The spec allocates gallery images and backups to IndexedDB and
  allows up to 60 gallery images per player; a 4 MB limit on every storage
  system combined would contradict that design. Four valid archived ghosts
  already push the modeled localStorage origin to 4.08 MB, so the hard budget
  still needs a lossless storage change after career backup is in place.
- How to reverse: Change the budget definition and rerun the seven save
  fixtures and the storage model before moving any production save data.

## 2026-09-22 PDT — FND-05 base

- Decision: Build the integration branch from the isolated green foundation
  commit that contains FND-04 and FIX-01..03.
- Reason: The checkout called `master` remains the live game. Its three known
  red suites make it an unsafe branch point for parallel work until these
  repairs land. Keeping it untouched avoids a source reload during a race.
- How to reverse: Move `integration/wasteland` to a later tested `master`
  commit before feature work; preserve the foundation commits as a separate
  branch.

## 2026-09-23 PDT — CMB-07 initial aim bounds

- Decision: For the first aimed-bolt implementation, cap homing at 12 degrees
  from launch direction and turn at no more than 90 degrees per second.
  Bombs inherit thrower motion and may lead at launch, but do not steer later.
- Reason: Section 3.2 calls for a small homing cone but gives no angle or turn
  rate. These bounds are narrow enough to keep misses and counterplay while
  allowing a bolt to track a car that changes lane during flight.
- How to reverse: Tune the two values in `src/wasteland-tuning.js`, update the
  CMB-07 tests, and rerun the crossbow hit-rate and Wasteland balance checks.

## 2026-09-23 PDT — SAVE-01 completed combat loss reward

- Decision: A completed armored Wasteland loss can earn the positive hit and
  wreck bonus, within the spec's 25% base-win cap. It does not debit saved
  credits. Abandoned or timed-out events earn no bonus.
- Reason: The approved design rewards combat actions and says saved credits
  are never taken by combat. A player who fights well but loses should still
  see that bounded reward. CMB-03 records actions; SAVE-01 alone changes money.
- How to reverse: Change SAVE-01 eligibility and rerun save migration,
  settlement-idempotence, result and balance tests before release.

## 2026-09-23 PDT — CMB-02 active front spikes

- Decision: The front spikes already visible on every Wasteland combat rig
  count as equipped when `wasteland2` is on. Only a front-face strike applies
  the 1.5× damage bonus to the other car. A rear or side contact does not.
- Reason: The art shows the spikes on each combat car, while the armor rule
  already reserves a 1.5× spike multiplier. The visual and collision rules
  should agree before kit purchases arrive.
- How to reverse: Add an explicit equipped-bumper state with its future kit
  purchase, update the rig and CMB-02 contact tests together, then rerun the
  three-car browser scene and ordinary replay controls.

## 2026-09-23 PDT — CMB-03 initial combat style tuning

- Decision: Use a separate combat combo with a five-second window and a
  maximum multiplier of five. Each positive player-owned armor hit earns
  100 times the current combat combo in style points. A player-caused wreck
  earns 400 more, once. Apply the existing score multiplier.
- Reason: Combat actions should appear in the existing style score without
  changing the near-miss chain. A five-second window and five-step cap match
  the familiar near-miss timing, while a wreck earns a larger clear reward.
- How to reverse: Tune these values in `src/wasteland-tuning.js`, update
  CMB-03 score tests, and rerun combat balance before the switch leaves dev.

## 2026-09-23 PDT — CMB-04 on-foot ammo timing

- Decision: Define the capped ammo pickup effect in CMB-04, but do not spawn
  ammo crates in car-only races. Activate them when the on-foot inventory
  and fighter controls exist.
- Reason: A car cannot use foot ammo yet. Showing crates that nobody can
  collect would mislead players and consume useful pickup slots.
- How to reverse: Enable ammo spawn when FOOT-01 provides an on-foot actor,
  then test player and CPU collection, save behavior and road visibility.

## 2026-09-23 PDT — CMB-08 roadside traffic callouts

- Decision: A low-tier traffic hit says `TRAFFIC SHOVED CLEAR`; a high-tier hit
  says `TRAFFIC OBLITERATED`. The existing traffic-wreck browser scenario now
  checks the new event, visible debris and no player crash or time penalty.
- Reason: The new physics replaces the old traffic wreck and crash rule. A
  short callout confirms the outcome during a fast race, while the old browser
  assertion describes behavior Kyle asked us to remove.
- How to reverse: Change the two callouts and the CMB-08 focused and browser
  assertions together, then rerun the full browser and balance gates. Keep
  the flagged no-crash rule unless Kyle changes it.

## 2026-09-23 PDT: GFX-01 presentation and evidence

- Decision: Read crew, pose and action state through a pure presentation
  selector. Missing visual event windows may be recorded by the simulation,
  but they cannot delay an action, grant immunity, consume ammo or change
  movement. Keep the old injected-loader seam for the pipeline controls.
- Reason: Twelve required animations need reliable successful-action timing;
  reacting to a held fire key would animate shots that never occurred.
- How to reverse: Replace the presentation contract and its focused tests
  together while retaining the existing simulation behavior and fingerprints.
- Evidence: Test assets and renderer behavior automatically. Independently
  review each actual reference/Blender/game sheet and measured frame cost.
  A metadata score or three generated sheets alone cannot prove likeness.

## 2026-09-23 PDT: GFX-02 first-person allocation

- Decision: Allocate at most 8,000 visible triangles and three material draws
  to the hands and selected first-person tool. Reuse the crew's 1024-square
  texture set where practical; RPG and wrench may each share one additional
  1024-square set across crews. Measure added cost in the real course scene.
- Reason: SPEC 0.3 defines fighter budgets but gives no separate allowance
  for the new held-gear view. This is a Director allocation, not a quoted
  spec limit. Existing steering hands and flying projectiles are separate.
- How to reverse: Adjust this allowance with measured course-frame evidence
  before implementation exceeds it; retain the overall combat frame target.
- First-person motion uses the simulation's existing successful-action clocks.
  Empty last-rocket recoil remains visible, while reload must not insert ammo
  that is absent. Overhead/inspection views explicitly suppress the model.

## Decision template

## 2026-09-23 PDT: BUG-07 raider accuracy candidate

- Decision: After preserving enemy aim error, try a separate raider cone of
  20 degrees on Easy and 10 on Medium. Keep Hard at 0.03 radians and leave
  CPU accuracy, firing cadence, damage, target selection and limits fixed.
- Reason: The corrected report meets win and crossbow targets, but Easy has
  one CPU plus five raider hits and Medium has six CPU plus four raider hits.
  These two excess-hit rows justify testing less accurate raiders; they do
  not justify weakening target bands or changing the rival's working rules.
- Verification: Two short owner-hit probes first, then one complete candidate
  report. The shared CPU-cone test expectation changes to the explicit raider
  cone only because these are now separate approved settings. Independent
  review must retain all other behavior checks and exact player/legacy controls.
- How to reverse: Restore the reviewed 61a5e9 rule candidate's shared spread
  if the measured tradeoff is worse, retaining its correct seeded guidance.

## 2026-09-24 PDT: retain Medium improvement and revert Easy regression

- Decision: Reject the measured Easy 20-degree raider setting. Restore its
  previous 10 degrees, retain Medium at 10 degrees and keep Hard at 0.03
  radians. This reverts the setting that worsened the result; it does not
  introduce another guessed value. Rival accuracy and all target bands stay
  unchanged.
- Evidence: The wide candidate has wins 10/5/3 and enemy hits 5/4/6. Medium
  hits now pass, but Easy wins exceed the 95-percent upper limit and its hits
  still exceed three. A final report is required for the retained settings.
- Guidance: Wider bias exposed a numerical error: midpoint velocity was
  retained as endpoint velocity. Independent diagnosis supports steering with
  half the budget before movement and half from the actual endpoint after
  movement. The total turn limit and player/legacy paths remain unchanged.
- Tests: Independent checks retain all timing and control tolerances. Because
  Easy and Medium now share the same cone and seed, the strict RMS ordering
  becomes equality within 1e-12 for those two, with Medium still above Hard.
  The explicit map and wider-than-CPU check follow the selected settings.
  An added turn-budget regression rejects a deliberately doubled budget.
- How to reverse: The rejected wider candidate remains committed as d61a2d3.
  Restore prior reviewed configuration if the final report shows a regression;
  do not relax target bands to claim completion.

## 2026-09-24 PDT: CPU UFO is a defensive AI action

- Decision: Keep physical CPU pickup and the safe actor-specific jump API,
  but reject immediate automatic use. Medium/Hard AI holds a collected UFO
  until an incoming player crossbow bolt meets the existing defensive threat
  check. Preserve its reaction time, cone, height, closing-path and shield
  rules, as well as all checkpoint/lap limits and attack scheduling.
- Evidence: Candidate 9c519fd changes Medium wins from 6 to 4 with the flag
  off, and 5 to 4 with it on. Both fall below the 45-percent lower limit.
  Flagged seed 1989 enemy hits rise from 4 to 7. Forty pinned Medium races
  identify the lost winning seeds as off 1989/1995 and on 1992; their jumps
  began about 130/184/82 m behind. A simple minimum deficit would not prevent
  those regressions. The original immediate-use candidate remains committed.
- Verification: Independent tests first prove holding without a threat,
  ignoring a harmless bolt, defensive use, unchanged attack cadence and
  common-time outcomes. The two previous AI-immediate-use test groups change
  to the explicitly selected policy; direct safe-use assertions stay intact.
  Then run short affected probes before final off/on reports and lane/build.
- Scope: Root takes the narrow combat-ai.js implementation hook. This does
  not change the player's UFO, stock range, collected charges, damage, aim
  tuning, saves or target bands. It does not claim defense against every
  weapon type. Broader tactical choices remain future AI work.
- How to reverse: Restore 9c519fd's immediate-use policy for comparison;
  keep the candidate out of integration if its measured regression remains.

## New decision format

- Date and card:
- Decision:
- Reason:
- How to reverse:

## 2026-09-24 - EGG-02 wall grounding

- Decision: Widen only the final salt-flat half-width from 120 to 225 metres.
  Keep the hidden road centerline, floor height, entrance and wash unchanged.
  Existing ground support and fitted rendering derive from the same width.
- Reason: All three route probes place terrain at 62 to 73 metres beside a
  gate floor near 34.44 metres. A 420-metre wall on the current flat would have
  its outer sections buried by 28 to 39 metres. The wider flat leaves a
  15-metre ground margin beside the required wall.
- Verification: Independent red tests first cover outer wall support on all
  routes and unchanged wash, ordinary road and shortcuts. Actual browser
  fidelity images must confirm grounding. No visual-only terrain workaround.
- How to reverse: Restore the previous final width in hidden-road.js and keep
  the wall feature in development until another measured placement is ready.

## 2026-09-24 PDT: CAR-01 scrap, hold and migration

### Economy

Scrap belongs to each named player's Wasteland career. It never converts to or from racing credits. After that player has discovered the gate, a completed Wasteland event awards 80 scrap for finishing, another 120 for winning, 15 per player-owned armor hit (at most 10), and 60 per player-caused wreck (at most 4). Before discovery, the existing Mad Max Duel keeps its current reward rules. A completed loss keeps its earned scrap. An abandoned event earns none. Each settled run key pays once, including after reload. Existing ledge salvage crates award 25 scrap each, capped at three in a completed event. The simulation records collection; scrap stays unbanked until event settlement. The settled-run identity prevents duplicate payment after reload, with no new pickup journal in the save. No difficulty or Pro multiplier changes scrap.

At full rockets and armor, the current ledge crate refuses collection. Once the player has discovered the gate with `wasteland2` enabled, collecting on foot and in reach may take the crate for scrap even when those resources are full. Keep the old resource-only rule before the gate and with the switch off. This is a small change to the existing pickup, not a new spawn or currency event.

The four starter weapons stay free. Levels bought with credits before migration keep their levels. A later upgrade costs 150, 300, or 600 scrap for levels 1, 2, or 3. A new weapon costs 400 scrap; crew costs 300 at its rank gate; each car's Scrapper, Raider, and Warlord armor kits cost 350, 950, and 2,500 scrap. Content without a working purchase or grant action remains unavailable rather than charging for a placeholder. The shop shows scrap and prices when `wasteland2` is enabled; the ordinary garage still shows credits. Post-gate Wasteland events add no racing credits or racing milestones. These prices let a player buy an early upgrade after one or two wins while keeping the top kit a long goal.

### Territory map

The eleven existing combat courses are assigned exactly once. Warlord order is the order in SPEC 3.9:

| Warlord | Courses or arena |
| --- | --- |
| Sawtooth Sal | Pacific Canyon, Red Mesa |
| The Dustmonger | High Country, Ridge Rally |
| Mother Mirage | Azure Riviera |
| Gearhead Gunn | Eifel Crown |
| Kettle Kingpin | Titan Monster Arena, Scrapdome events |
| The Twin Vultures | Alpine Serpent |
| The Tollkeeper | Neon Docks, Salt Flats Convoy Raid |
| Baron Blackiron | Harbor & Highlands, Cloudbreak Skyway |

The Scrapdome and Salt Flats entries are future event venues, not extra copies of a course. Only playable, completed Wasteland events after gate discovery can add hold. A win adds 25 hold to its territory, capped at 100; a loss adds none. Four wins, including repeats on an available course, fill it. This avoids locking progress behind racing garage purchases. Full hold opens that warlord's fight once its event exists. Beating that fight once claims the territory, adds the banner and grants its specified kit parts. Full hold does not itself grant the parts. A claimed territory cannot lose hold. Future venue and boss events must use stable event IDs and the same settlement rule.

The map is available after this named player discovers the gate. It shows the eight territories, assigned courses, hold out of 100, locked or available warlord fight, and claimed banner. It does not let a player start an unbuilt event.

### Save and migration

Keep `profile.wasteland.version` at 1 and add `scrap: 0` and one default entry for each of the eight territories to the existing versioned object. Each territory value is `{hold: 0, claimed: false}`. Keep existing `discoveredGate` and every other established field. Normalize missing or damaged scrap and hold to bounded nonnegative integers; preserve unknown fields. For any future version, preserve the nested object without modification and block writes. Existing `profile.weapons.levels` moves to `profile.wasteland.weapons.levels` unchanged through the established backup-first migration. Additive defaults never erase levels, credits, cars, records, gate discovery, or other existing player data. Use the existing `settledResults` identity for race payouts including collected salvage. Later warlord grants must share their completed event identity. Each historical fixture must load through memory-only storage, with a verified pre-migration backup when a write is needed.

### Why and reversal

The event rates reward a finish and visible combat without making repeated hits unlimited income. Four wins make hold legible and reachable on the first free course. Reusing version 1 fits the existing additive normalization and backup gate. To reverse the tuning, change the pure economy catalog and tests; do not remove earned scrap or claimed territories from saves. To change territory allocation or hold thresholds after players have progress, write a migration that preserves each named player's earned hold and claims.

## 2026-09-24 PDT: GFX-01-P1 Rook technique trial

- Decision: Trial one continuous skinned body with connected jaw and neck on Rook, with padded painted UV islands for skin, hair, clothing, gloves and boots in the existing texture/draw budget. Compare matched round-3 and trial views in Blender and game. Convert the other seven only if Rook likeness rises from three to at least four without another score or budget regression. If it fails, keep the round-3 GLB and try a retopologized sculpt. Two stalled rounds and visible projection seams require the approach change.

## 2026-09-24 PDT: EGG-02-P1 wash banks and Rustwall materials

- Decision: Trial a continuous eroded bank inside the existing collision box and instanced placement, with asymmetric slope variation and an overlapping foot. Paint distinct steel, soot, hulk paint and localized rust within the existing wall draw and texture allocation. Round-3 wall and wash resemblance remained three and two. Reverse by rebuilding prior GLBs from the previous rustwall.py revision while retaining collision and scene contracts.

## 2026-09-24 PDT: BAL-02 proof before tuning

- Decision: Add a legal deterministic strong-player policy to measure CPU wrecks before changing weapon damage. The current `all` policy fired no crossbows, landed one rival hit and caused no wreck in a flagged Easy seed-1989 trace. Trace Easy raider hits by owner and shot before choosing a narrow correction; earlier retained sample attributes five of six Easy hits to raiders. Preserve the flag-off path and existing win bands. Reverse by removing the new policy or restoring the prior seeded aim parameters.


## 2026-09-24 PDT: BAL-02 accepted candidate for review

- Decision: Extend only Easy camp shot spacing from 0.8 to 1.6 seconds. The pinned trace showed paired raider hits about 0.8 seconds apart. Medium/Hard retain 0.8; aim, damage and CPU cadence retain their existing values. The first candidate passes flagged wins 8/5/3 and enemy hits 3/4/6, crossbow 12/26 and UFO/own-bomb limits. Revert the spacing if independent review or the lane gate finds a regression.
- Decision: Keep a separate legal-input pursuit sample that follows normal steering and adjusts throttle/brake to remain about 30 m behind the rival. It causes 2/2/0 player-owned CPU wrecks on Easy/Medium/Hard without changing damage. It does not replace the original seven policy runs or ten-seed no-weapon balance samples.
- Board completion: retired old BUG-06/07 active-slice instructions, named AUD-03 for residual full-race listening, and made first-person art wait for GFX-01-P1's technique while the yard depends directly on CAR-01. These complete the phase-2 board triage; old integrated work is preserved.

## 2026-09-24 PDT: CAR-01 migration and result review

- Decision: Validate the new scrap value and all eight territory entries in the raw startup migration check before any normalization write. Existing current-v1 careers also need a verified backup when those fields are absent. The failing regression reproduced the omission; failed and unverified backups preserve the original bytes.
- Decision: Results describe the currency actually settled. Post-gate Wasteland shows no racing-credit bonus or loss-charge promise. Course purchases still follow the existing racing garage, and the map labels future warlord fights as unavailable. Later warlord event work owns the boss fight and claim grant; CAR-01 only earns hold and presents progress.
- Reversal: Keep backup protection and earned balances. Any later reward or territory schema change needs its own backed-up migration and result copy.

## 2026-09-24 PDT: EGG-02-P1 joined canyon and smaller wall atlas

- Decision: Build two continuous presentation ribbons from existing collision bounds instead of repeating standalone bank modules. Preserve route, collision, RNG and floor; tests require bounded geometry, deterministic UVs, material/disposal safety and continuity. The documented replacement of instancing assertions must retain their geometric safety contracts.
- Decision: Trial 512-pixel wall atlases while retaining the wash atlas at 1024. Wall output falls from 15,394,464 to 7,236,656 bytes. Matched round-7 views preserve visible texture detail, but likeness remains three and needs changed salvage geometry. Texture size alone is not an art approval.
- Reversal: Rebuild with the previous recipe or atlas resolution if visual or frame review fails; keep the physical road unchanged.

## 2026-09-24 PDT: first art polish wave verdicts

- Rook round10 likeness remains2. Restore the reviewed round3 asset and generator; remove the rejected experiment and its test together. Keep the text recipe in107bb21, six compact scored rounds, and the next approach on GFX-01-P2. Hands wait for a winning Rook technique. No other crew conversion or beta promotion.
- Rustwall round10 and wash each score3. Accept the joined banks and smaller wall as a development improvement only. Final wall7,777,248 bytes and wash3,898,584 bytes; quiet render-CPU cost at most1.077 times baseline, under1.10. EGG-02-P2 owns the remaining facade depth, repetition, strata and grounding. Hidden Road stays dev.
- Arrival QA needs a new temporary memory-only player for each quality's first invitation. Reusing the discovered player correctly auto-enters and invalidates the old second invitation setup. Preserve all invitation and navigation assertions.

## 2026-09-24 PDT: yard and fitted kits before code

- GFX-03 uses nine car-specific Blender kit files, named tier/breakable parts and shared painted metal design. Keep existing thresholds, CPU Scrapper default, socket ownership and loose-part timing. Authored geometry replaces the visible primitive path after loading; any fallback serves loading/failure only. Proposed advisory targets are 4,000 near and 1,000 far triangles per car and 5 MB for the family; measure actual draws and four-car frame cost within 10 percent. Purchases and race rules are unchanged. Reversal restores prior presentation without changing inventory.
- GFX-04 keeps the car in the existing exploring/arrived journey, with live yard scenery behind career/map/Armory/crew panels. A single App guard checks both switches, discovery, active player/state ownership and the revisit marker when present; check again after profile refresh before spending. Scenic arrivals need no revisit marker. Credit garage, player switching and race setup remain menu-only. The old arrival dialog hides only for the active yard home, and panel navigation does not end the visit.
- Yard art sits behind the physical gate and uses actual A/B/C ground support. Keep x +/-8 m and gate-local z 5.5 to45 m clear for current cars. The camera frames the parked selected car in both screen aspects. Initial yard allocation: at most25,000 triangles,8 draws,3 local painted atlas sets; validate full scene frame cost within10 percent. Arena bowl is scenery until the future arena framework exists. Three independently scored art rounds are required. Reversal removes yard scene/panel hooks together and restores the temporary endpoint without changing discovery or inventory.
- Independent red tests: kit assets/runtime4 failed as expected; yard App5 and yard scene/assets9 failed as expected. Scenic tests preserve the existing one zero-charge abandoned-history entry, rather than incorrectly requiring no history change. Real saves remain untouched.

## 2026-09-24 PDT: measured yard and kit corrections

- The first yard game review exposed a rendered ground wedge about 2.6 m above the existing flat physical yard. The new vertical-ray regression fails on routes A/B/C. GFX-04 may change only hiddenRoadGroundGeometry in world-surfaces.js to follow the actual flat boundary in its presentation mesh. Keep collision, ground support, route, obstacles and simulation signatures unchanged. This is a renderer correction, not an expanded driving area; review whole-scene frame cost afterward.
- GFX-04 may extract the existing Armory content in screen-armory.js for the yard panel, preserving its menu output. Use one content scroll region and keep the parked car visible beside desktop panels and below the compact portrait home panel. A separate scrapdome-review scenario owns art captures; the yard-home scenario owns UI behavior. Two agents sharing a lane must not build its fixed QA output folder at the same time.
- Profile refresh retains each tab's selected player. Another tab selecting a player must not redirect the local purchase to that wallet. If refreshing the local registry actually changes the active profile, the parked visit must be rejected before spending. Independent tests cover both cases without reading real saves.
- GFX-03 first review found a Blender/game axis mismatch. Correct it before fitting panels. The new resource regression also found duplicate geometry/material disposal and an undisposed texture; release cached resources by identity, including late loads. Likeness remains two through round 2, so the next round derives plate contours from body and axle landmarks rather than scaling the same rectangles.

## 2026-09-24 PDT: actual vehicle fit and yard review

- GFX-03 may use `tools/audit-armor-kit-fit.mjs` to read production car geometry and sockets. Whole-car bounds include wheels, spoilers and mirrors; they cannot locate armor contact surfaces. The round-4 Titan and Viper views fail fit despite passing structural GLB tests. Use body-specific surfaces and cabin landmarks, keep wheel and glass clearance, and prove those two cars plus Falcone before rebuilding the family. Round-4 likeness remains two. Every car still needs an actual in-game fit check.
- A dropped authored plate must retain its shape and start at its fitted world location. Empty part nodes with offset mesh vertices do not supply the plate's location. An independent regression reproduced the center-of-car fallback drop; preserve the existing damage thresholds, 1.5-second lifetime, bounded pool and source-resource ownership while correcting presentation.
- Yard round 3 reaches likeness three with denser hulk banks and a clearer crane. Keep refining the irregular piles, dark metal, ground edge and barrier ring before measuring the final scene. The independent desktop Armory and portrait home review confirms a visible car, selected navigation focus and one content scrollbar. All-nine-car entry and camera checks remain required.
- Reversal: remove an unsuccessful art candidate while preserving the existing runtime assets and purchases. Do not change simulation, sockets or saved inventory to compensate for poor model fit.
## 2026-09-24 PDT: Rook neutral source before another rigged trial

- Start GFX-01-P2 in its own lane from 157639c. Commit explicit control-mesh and reference-landmark JSON plus the rebuilding script. Reconstruct the ignored Blender working file from those inputs on a clean checkout. First review front, profile and back neutral silhouettes at the reference scale. Rigging, paint and candidate export follow only after that silhouette is accepted and their independent tests are written. Current runtime Rook, other crew assets and the original generator stay unchanged during the trial.
- Source version 1 records metre coordinates, named garment roles and explicit near/far vertices and faces. Landmarks identify the exact approved image by hash and its measured pixels. Three independent tests start red on absent inputs and build script; they cover connected head/neck topology, source geometry budgets, reference controls and output-path isolation. Those structural checks cannot grant likeness approval.
- New Blender model generators must retain the existing no-write, Blender-free output plan. GFX-03 and GFX-04 initially failed that check and now implement it. The kit renderer and contact-sheet compositor are explicit review helpers: separate checks verify their ignored PNG or compact review-sheet output and that they never emit runtime models. The inventory still covers every script. Completed round sheets cannot be overwritten.
- Reversal: retain a rejected trial's small text recipe and review verdict, remove its unaccepted output, and keep the current crew usable. Hands continue to wait for likeness and all other art scores of at least four with the measured frame budget.
## 2026-09-24 PDT: combat body wear and all-car yard framing

- GFX-03 may extend the existing vehicle damage renderer with an optional combat-wear scalar. Read armor and wreck state only when active Wasteland rendering has its switch enabled. Keep the existing private paint owner, garage preset and collision deformation; grade scorch below 30 percent armor and use full wear for a combat wreck. Traffic, police and old callers retain zero wear. Reset pooled cars and repaired finishes exactly, without detaching wheels or inventing collision damage. Independent tests reproduced the missing selector and pristine low-armor paint before implementation.
- The first yard projection check used synthetic mesh-box corners and stale resize measurements. Replace that measurement with actual visible vertices, the identified player vehicle and a settled canvas/camera aspect. Its calibrated result failed four of eighteen car/aspect views. The presentation-only camera correction now passes all eighteen views plus five shop captures, with no wallet, history or journey contamination. Root reviewed corrected Titan portrait and Heritage landscape screenshots; both show the full car clear of the home panel.
## 2026-09-24 PDT: second-wave review corrections

- Kit body scorch now has an independent repair-step regression: changes to finish wear must not invalidate collision geometry. Split finish and shape caches. A second red case shows that scorch must never add clearcoat to a matte preset or polish an already rough finish; preserve exact preset reset. These remain presentation-only changes.
- The all-nine kit matrix now passes actual mounted-car, canvas and frame-readiness checks. Root reviewed all 36 car/tier/quality views. Glass and wheels are clear; low tiers remain too similar and Titan/Viper armor is sparse. This is fit evidence, not likeness approval. Batch the roughly 60 source primitives inside their stable named parts before measuring frame cost; preserve independent breakage and debris shape.
- Yard round 7 falls to likeness two after over-decimation turns car hulks into roof shards. Fix forward with fewer, larger recognizable bodies and retained tire/window volumes, taller inner barriers and supported industrial structures. Preserve the independently accepted eighteen car/aspect camera views. The baseline timing recipe pins 85fe35f and compares whole-scene A/B/A samples, both qualities and two views, with matching cameras, viewport, warmup, hashes and mirror strata.
- Rook's first neutral blockout is structurally valid but visually rejected. Its next source pass uses paired front/profile contours recorded against the approved reference, replacing generic symmetric sections. No rigging, painting, runtime replacement, other-crew conversion or hands work follows until the neutral silhouette is accepted.

## 2026-09-24 PDT: preserved budgets and measured surface corrections

- Yard round 10 remains within the original 25,000-triangle allocation: 24,190 triangles, three source draws and 7,612,148 bytes. Automatic approval review rejected a proposed increase to 29,000 as a weakened assertion; no test change was made. Removing broken filler and retaining twelve welded car hulks provided a compliant alternative. Root scores likeness/readability/grounding/consistency three; GFX-04-P1 owns remaining pile density, barriers and cranes. No beta promotion.
- Imported vehicle triangles must be welded before decimation; disconnected face vertices otherwise produce shards. Preserve recognizable body and tire silhouettes before composing a pile. For kit part batching, normalize the active UV layer name before joining. An independent binary-asset regression reproduced a full shell with only 0.8 percent usable UV area, then passed after the correction across all nine cars.
- The kit rear shell intersected actual loaded Falcone paint by 18.8 mm. An independent three-ray test now requires 2–65 mm exterior clearance. Fit the copied rear band against actual paint geometry with a local taper; preserve side, roof, wheels and glass. This is a presentation correction, with no changes to car physics or sockets.
- Yard Armory change handlers must accept either the menu Armory or the guarded yard Armory. A real-DOM test first reproduced ignored weapon/car selections. The narrow guard fix passes unchanged; the expected later wallet changes from 2,200 to 1,850 because this test now buys one additional 350-scrap kit. Purchases retain App ownership checks.
- The first 120-frame yard A/B/A sample keeps an unfavorable Performance-home CPU p95 result. Stable RAF cadence alone cannot grant the frame pass. Before optimization, repeat the same frozen scene with 600 ordered samples and dynamic quantiles to resolve baseline drift; retain both runs and the unchanged ten-percent CPU/RAF limit.

## 2026-09-24 PDT: accepted development yard and Rook method change

- GFX-04 final scene is the round-10 asset at 24,190 triangles, three source material draws and 7,612,148 bytes. It preserves existing physical support and route data; the rendered flat boundary follows the circle and includes its exact 225 m tip. Current home camera and all nine cars pass eighteen landscape/portrait projections; five shop/action views bring the browser run to 23 captures with zero issues. Independent Save Guardian and UI review cleared refresh ownership, rollback, historical fixtures and the 3.47 MB storage model. Shops keep guarded App operations and no arena/boss rewards.
- The approved 600-frame A/B/A yard gate uses pinned pre-card 85fe35f, matching cameras, 1280x720 pixels, two qualities, approach/home views and the complete production renderFrame. CPU p50/p95 and RAF p95 pass against both baselines: maximum CPU p50 ratio 1.10 and p95 ratio 1.0833. All mirror samples were reused; no refreshed-mirror or GPU timing claim is made. Retain the unfavorable Performance-home mean ratios 1.115/1.055 and the earlier 120-sample CPU p95 failure in the review verdict. Round10 remains 3/3/3/3 visually; GFX-04-P1 owns remaining density, barriers and cranes. Ten per-round review notes preserve the intermediate findings; the redundant task note is removed after merge.
- GFX-01-P2 neutral review rejected repeated elliptical garment rings and planar hair spikes. The next method is one connected trouser pelvis/crotch branching into shaped legs, independently traced front/back garment surfaces and curved irregular hair clumps. Record measured reference bands and an independent red topology/contour test before rebuilding. Reallocate existing detail within 8,000 near/2,000 far triangles. No rig, paint, runtime replacement or hands until the neutral silhouette passes.

## 2026-09-24 PDT: measured kit merge and next Rustwall wave

- Nine authored kit GLBs total 4,383,060 bytes, below the proposed 5 MB family target. Total source geometry is 3,440–5,094 triangles per car and eighteen independently named primitives. Some cars exceed the advisory 4,000-near/two-draw goals; keeping breakable parts distinct serves existing damage behavior. The quiet four-car 600-frame A/B/A test passes full renderFrame CPU p50/p95, means and RAF against both baselines: maximum p95 ratios High1.0572, Performance1.0678. Every branch contains300 refreshed and300 reused mirror samples;120 repair frames preserve body geometry buffer versions in each quality. This establishes the measured scene scope, not GPU completion time or a far-detail claim.
- GFX-03 final round8 scores3/4/4/3/frame4. Keep dev. GFX-03-P1 owns individually segmented plate shapes and stronger reference likeness. Preserve the existing local async cache, cloned actor finishes, deduplicated source-resource disposal, actual subtree debris placement and1.5-second lifetime. Body scorch is gated presentation only, never adds clearcoat or polishes matte paint, and resets pooled finishes without geometry churn. Primitive kits remain only while authored models load or fail; successful authored mounting hides them. Remove that fallback only with a later proven replacement path.
- EGG-02-P2 replaces repeated facade microdetail with welded/decimated existing car hulks and an authored unequal elevation/depth map, while retaining60,000 wall triangles,24 draws and three512 atlases. Reclaim rivets/interior tile geometry before adding macro forms; preserve400m×35m core,9m×7m moving gate and clear opening. Wash changes only joined ribbon contour/UV preparation inside the unchanged collision-box union, with shared XYZ/UV seams, two draws and existing1024 atlas. Root selected the top-right canyon background of the existing wasteland-art-direction.png as the labeled slope/strata/color target; it is environment context, not a close geological reference. Independent tests and a written reversal precede implementation; matched game review and whole-scene timing decide acceptance.


## 2026-09-24 PDT: phase-2 janitor evidence fold

- BAL-02 retained every nearest-target, stationary-exclusion, per-member and lap-renewal assertion when the old default-Easy 0.8-second fixture failed. The reviewed fixture now checks all three difficulties at 1.6/0.8/0.8 seconds. No target or shot-count check was removed.
- GFX-01-P1 restored the round-3 Rook GLB with SHA-256 `9dfa853187b707d30e7cd19f029efc3b1219e914d13ce68029d30eedeb8b911a` and generator `661eb808f94c338ba913b0fc8efdb9118d12984d0ba0669bc2e1de932d391857`. Round 6 was a failed topology/active-UV technical build before game capture; it was never a completed fidelity round. Its absent sheet is not an omitted passing result. The rejected recipe remains in text checkpoint `107bb21`.
- EGG-02-P1 replaced obsolete instance-count, prototype-reuse and half-turn checks after independent review because the new presentation uses joined banks. The stronger contract checks every vertex and triangle centroid inside the original oriented collision-box union within 2 mm on A/B/C, at least 100 exact shared seams, winding, deterministic positions/UVs, unchanged route/RNG, material/disposal safety, at most 30,000 triangles and two draws. Neighboring boxes may support a shared seam; physical boxes stay exact-hashed.
- Retain the unfavorable EGG-02-P1 concurrent round-6 High approach render-CPU p95 result: 10.6 ms loaded versus 5.8 ms baseline. The mirror's 30 Hz refresh changed the sample mix; this is a measurement caveat, not a passing result. Later quiet round-10 aggregate ratios were 1.069/1.077/1.000/1.000, with refreshed/reused strata recorded in its review. The model toggle establishes neither whole-terrain nor GPU cost.
- Janitor scope: fold these facts and remove the four consumed task notes. Keep current review sheets, runtime assets, licensed sources and active lane work. The literal-reference audit reports no candidates for unused modules, removed-feature tests or fully enabled switches; uncertain dynamic assets and exports require the scoped CLEAN-11 follow-up before removal. No history rewrite is authorized.


## 2026-09-24 PDT: neutral Rook trial and Rustwall coverage correction

- Rook neutral source checkpoint 5f663be is approved by Director and independent reviewer as the foundation for one rigged, painted candidate trial. Its explicit connected face profile follows measured brow, nose, lips and chin within two native reference pixels; source tests pass five of five. Near geometry is 7,986 triangles, far placeholder 184, crown 1.82999 m. Hair contact is corrected, but its angular cap and ribbon shapes remain a likeness risk for game review. This is not a likeness-four verdict. Candidate design and independent tests precede rigging/UV/paint; existing runtime Rook and the other seven remain unchanged until the trial wins. Prefer exact-Rook fetch substitution inside the guarded private QA scenario, following the existing test-fighter control, over a production renderer hook.
- Rustwall P2 round 1 remains rejected: Director and independent reviewer score wall 2/3/3/3 and wash 3/3/3/3, frame unmeasured. Its 58,573 triangles and 13 draws meet hard caps but place dense cars over less than nine percent of the facade. Broad horizontal panels and peaked crowns dominate. The next method targets about half the facade as recessed source-car relief, retaining actual 3D cars at foot, gate and skyline, with grounded vertical framing and stepped salvage. One bay proof precedes another full wall.
- The relief bake uses existing F42/Banshee sources and the existing 512-square hulks texture set. Preserve body tiles 0,2,4,5,13, tire tile 3, glass tile 8 and trim tile 9. Free tiles 6,7,10,11 form one 256-square area with four-pixel padding; tiles 1,12,14,15 provide smaller patches. Four 256-square relief regions would overwrite the live car palette and are rejected. Exported UV/pixel/provenance tests precede implementation. Keep wall 60,000 triangles/24 draws/three 512 sets and wash collision/route/gate constraints unchanged.
- P2 comparison sheets use a separate immutable review family. Five wall rows retain numeric camera checks; the wash row labels the approved canyon crop as environment context and distinguishes Blender source module from game joined banks. Independent tests caught and fixed permissive missing-SHA and substring-scope validation; six sheet checks now pass. Keep the existing P1 review path unchanged.

- Rook candidate build reuses the local baseline skeleton and exactly twelve clips as a read-only donor, with explicit normalized weights on the accepted near mesh and a meaningful decimated far mesh. One 1024-square atlas set contains opaque sRGB base color, linear AO/roughness/metallic channels and optional tangent normals; eight-pixel bleed requires sixteen pixels between chart interiors and eight at atlas edges. Trial maps stay ignored. A promoted GLB retains its embedded maps, with extraction/reapplication recorded in text rather than duplicate source PNGs in public. Private QA validates the real candidate path, requires Rook-only mode, substitutes only the same-origin Rook pathname after memory/private-tab guards, records candidate and baseline hashes plus substitution count, and delegates all other requests unchanged. Director owns these QA/review hooks while Career builds the candidate and Crew writes independent tests.


## 2026-09-24 PDT: exported candidate checks before painted art

- Rook P2 uses private Rook-only browser substitution of the ignored candidate GLB. The loader records the candidate hash separately from the unchanged runtime Rook hash, requires a positive substitution in each quality and rejects ordinary tabs. Its comparison helper verifies source hashes, fixed cameras, idle pose/time and distinct Blender view images. Round 1 loaded the candidate in High and Performance with 44 captures and no browser issues. Its plain materials score resemblance two; this is technical evidence, not a winning technique.
- Actual game aiming stretches Rook's outer jacket panels toward the knees. The initial visual attribution to the vest was wrong: exported vest, pockets, straps and pack already remain torso-bound. Source jacket edges crossing the abrupt torso/sleeve weight boundary stretch from 6-9 mm to 368-404 mm (up to 59.9 times). Define explicit sleeve and torso regions with a smooth armhole transition, then prove those same exported edges and genuine sleeve motion. Preserve accepted neutral geometry and the existing torso accessory bindings.
- Nonoverlapping UV coordinates alone do not make the model paintable. The face needs one continuous eyes-to-chin island with its seam behind the ears or hairline, and hidden torso polygons must leave that chart. Every distinct painted island needs eight pixels of bleed, so adjacent interiors need at least sixteen pixels of clearance. Use authored garment seams and the unused atlas area before shrinking meaningful face or clothing detail. Image generation follows review of the actual layout.
- Rustwall P2's source-car relief must survive export as visible front-facing geometry with the intended embedded image pixels. A correct Blender preview does not prove the game asset: reversed faces were culled, and stale packed image bytes retained the old atlas after the visible Blender image was edited. Regressions inspect the exported GLB before correcting winding and repacking. Failed round captures remain failed evidence; no palette or budget increase follows from these rendering defects.
- Reversal: keep current runtime crew until a candidate passes art and frame gates. Correct or retire an unsuccessful ignored candidate without changing saves, simulation, approved budgets or the other seven crew.


## 2026-09-24 PDT: calibrated Rook paint and central Rustwall composition

- Rook's first built-in image generation produced an opaque 1254-square face source, SHA-256 cc48bbd07c6b436771537fcf416cf0c0d503e2afa5fab4c2b31b5582d46de358. Its skin and beard detail are suitable for a trial, but the generated features do not follow the requested UV coordinates. Keep that source unchanged and calibrate its measured landmarks to the fixed face island in Blender. Commit only the small calibration JSON and exact prompt/recipe; the unaccepted PNG and painted candidate stay ignored. A selected source requires its exact hash and a valid monotonic calibration before any build writes. The default structural build and all runtime crew remain unchanged. Painted trials use their own output directory so ordinary tests cannot overwrite reviewed evidence.
- The face unwrap gives most horizontal texture space to the front of the head, keeps the seam behind it and preserves one continuous island. Its two measured eye-width controls now have more than seventy atlas pixels between them. Those controls establish usable width, not the final painted eye height; the reference guide sets that height. The jacket uses separate front, back and sleeve charts. Cloth base colors follow the reference: faded blue-green shirt, tan vest/scarf, brown-khaki trousers and dark leather.
- Rustwall round 4 still scores likeness two after its texture export is corrected. Prove a new central sixty-metre composition before extending it: a dominant armored portal above the unchanged nine-by-seven-metre opening, grounded flanks, deeper irregular salvage edges and fewer long X braces. Keep the 420 m span, 35 m core, current vertical envelope and original geometry/material limits. Independent exported mass/clearance tests and an actual game review precede propagation. Reversal retains the recorded round-4 recipe without changing the route or saves.


## 2026-09-24 PDT: replace the central shelf composition

- Rustwall P2 round 5 remains below acceptance. Director scores wall 2/3/3/3; independent reviewer scores 2/3/2/2. Both score wash 3/3/3/3, with frame cost unmeasured. The irregular crown still looks suspended above two flat shelving grids. Its 57,072 triangles and fourteen draws do not establish likeness. The recorded images precede a node-only correction that moves crown geometry from the fixed 35 m wall-body into scaffold-steel; the next round must capture the final export.
- Change the central sixty metres before extending anything outward. Replace thin gate framing with two grounded armored pylons, eight to ten metres wide and two to four metres deep, plus a thick connected lintel. Recess salvage behind their visible side faces, remove the central regular shelves and displayed crown cars, and use broad weathered vertical plates. Preserve the physical nine-by-seven-metre moving opening, 420 m span, 35 m core, existing vertical envelope and geometry/material limits. Independent exported depth, grounding and clearance tests precede this build. Actual High and Performance game views decide whether the method improves resemblance.


## 2026-09-24 PDT: Kyle's overnight continuation and external audio owner

- Kyle extended the run until morning. Finish remaining phase-2 cards, then follow phase 3 in next-run.md. BETA-01 prepares a reviewable candidate; release still waits for Kyle. No history rewrite is authorized.
- Kyle's documentation branch precedes his audio sourcing branch. Keep both original branches. The separate lane/audio/aud-10 session owns AUD-10, AUD-11, AUD-14, the gatekeeper.welcome wiring and all ElevenLabs credit use. This Director does not use its worktree or start another audio lane. Readiness is an explicit ready-to-merge change note followed by the normal current lane/build gate.
- Preserve Kyle's exact selected Callum MP3 take, catalog and crossbow E recipe. Do not regenerate the line or treat the general FLAC source guidance as authority to replace its original bytes. A reproduced post-generation credit-query failure is assigned to that audio owner as AUD-12-R1.
- The generic 1,500-credit overnight allowance in next-run.md does not authorize this Director to spend credits: Kyle's latest direct assignment overrides it. Ending work by the old percentage budget is also superseded.


## 2026-09-24 PDT: grouped garment paint and final wall trial

- Rook round 5 closes the actual waist gap in both quality settings; two independent reviews score 2/3/3/3. The existing sixteen lower core vertices now overlap the trousers, with source/exported ray guards. Seven existing hair-cap vertices then fix sampled scalp contact, with 19/19 focused checks. Do not spend another likeness round on that isolated technical repair.
- Change the garment method before the next scored Rook round: trace the actual reference's knee/calf/cuff contours onto existing vertices, replace fragmented trouser UVs with two padded sewn front/back panels, and bake one inspected four-material cloth source through explicit hashed calibration. Face/hair pixels, waist coverage and runtime crew remain unchanged. The source stays ignored; only the recipe/calibration and eventually selected embedded runtime maps are kept. Independent source, UV and pre-write validation tests precede implementation. The full crew conversion still waits for Rook likeness four.
- Rustwall round 9 improves the broad lintel and two tower tops but remains 3/3/3/3 in both independent reviews. Round 10 reuses the successful grey/olive/rust plate paint on two unequal full-height panels in each of four outer non-relief sections, breaking the long blue/orange bands at a physical plate scale. Keep the third section broken rust/iron with dark joints. Name intentional new atlas consumers rather than weakening unchanged-region protection silently. Preserve span, core, gate, existing geometry/material budgets and route.
- A centroid-only wall test missed large valid faces crossing its bands. Its reviewed correction clips actual triangle surface area to the same regions, retaining all area/depth/composition targets. Equivalent rectangle tessellations measure identically. This is a measurement correction; the original round 8 GLB was not retained, so no exact revised-metric red on that old export is claimed.


## 2026-09-24 PDT: painted garment trial and native mirror sampling

- Rook round 6 improves to 3/3/3/3 in two independent actual-game reviews. The 44 High/Performance captures show material detail and closed waist coverage. The side/back crown still has tan patches, so sparse hair contact rays did not establish full hair appearance. Next group: authored dark scalp/hair base above the measured hairline, overlapping clumps, layered scarf and rolled cuffs. Preserve the painted eyes/beard, measured body envelopes, working bindings and budgets. Matching seven trouser-width bands is a reason to avoid arbitrary narrowing; inspect real intermediate fold contours instead.
- The generated garment sheet is 1254 square, SHA-256 793ee85733cd1ed0446b54d0cf5ef3746d5dba311aaf8b79d4fda6828e93e928. Its alpha is 216-250 despite the opaque prompt. The source stays unchanged. The explicitly reviewed RGB-only bake ignores source alpha, writes a final opaque atlas, and retains exact face/hair pixels; independent source-hash/output-opacity checks pass. The committed calibration records actual crop coordinates, and the exact prompt stays in the task recipe. No duplicate source PNG enters Git.
- Private native Rustwall A/A diagnostics prove exact mirror Boolean sequence matching is invalid: equal 300/300 refresh counts still had 64 or 600 position mismatches; another view had 300 versus 299 with 445 mismatches. Keep native clocks. The revised comparison allows phase differences while requiring each refresh count within six of 600 versus both baselines; it retains aggregate and separate refreshed/reused CPU ratios against both baselines and the unchanged ten-percent cost limit. The highly unbalanced 1/599 fixture remains rejected. Concurrent dry runs are functional evidence only, never performance acceptance.


## 2026-09-24 PDT: close the bounded wall wave without hiding visual debt

- Rustwall P2 reached the ten-round limit with two independent final scores of 3/3/3/3 for wall and wash. SPEC 0.3 moves remaining differences to a new polish wave. Re-slice P2 as a measured development improvement, still requiring its original frame and lane/build gates. EGG-02-P3 retains the original likeness-four target and names regular bays, straight columns, perched cars and artificial strata. No visual pass, beta approval or release is inferred from this re-slice.
- Rook round 7 pairs a calibrated dark scalp mask with broad projected hair coverage, layered scarf edges and rolled cuffs. Preserve painted eyes/beard and the connected core. Reclaim detail triangles from boot laces before adding folds; retain the 8,000 near and 2,000 far caps. Independent red tests on actual crown area and atlas pixels precede source changes. No other crew converts until Rook passes.
- The external audio owner marked only AUD-12-R1 ready. Isolate commits 96cf90a and 9268cb9 plus readiness note 631deed in a temporary integration-owned checkout and rerun its lane/build gate. Do not merge the unfinished AUD-10 sound-bank series. Both Kyle branches and the external session branch remain intact; no credit use is needed.


## 2026-09-24 PDT: first-person design audit before the next build

- GFX-02-P1 remains behind the Rook technique decision. Read-only inspection found the fingerless glove generator closing a skin terminal ring with the first leather tile, plus very narrow radial tip caps. Repeated digit lofts and separate palm/thumb pads explain the mitten silhouette; the shared sleeve ring/noise recipe explains generic cloth. These are concrete starting defects for independent red tests, not a visual pass for a replacement.
- The proposed proof is one connected Rook hand with a shaped thumb web, staggered curled digits, rounded terminal loops, explicit glove/skin material boundaries, authored cuff seams and padded painted UV charts. Keep wrist/finger bone names and tool sockets. Test actual exported geometry, cap pixels/normals and continuous clip-to-grip contact, then judge both game qualities before extending to eight. Preserve 8,000 visible triangles, three draws and current runtime lifecycle/selection. A measured runtime issue requires a separate named hook; none is authorized by this audit.


## 2026-09-24 PDT: janitor consumer audit and exported counts

- Read-only CLEAN-11 traced all 55 literal asset candidates: 29 are dynamically loaded runtime assets (eight crew, ten first-person, three kits, two wall/wash, six terrain textures); eleven are audio sources/metadata, licenses or exporter provenance; thirteen are documented art references; one is the test-fighter QA fixture; one is scrapyard-dirt with documented future use but no current runtime load. None is proven safe to delete. The sixteen export candidates were already confirmed internally used. Keep the unresolved dirt use visible until the arena work settles it.
- The non-P2 Rustwall generator still has concrete consumers in test-blender-output, test-runtime-art-sources and test-review-evidence, alongside legacy P1 comparison handling. Removing it requires deliberate migration of those consumers while keeping historical sheets readable. It is not dead solely because the current runtime wall uses P2; EGG-02-P3 should settle the current rebuild recipe before deleting the old construction.
- Actual exported wall triangles are 55,834, versus source 56,122. The 288 difference is six cloth banners times 24 cells times two reverse coincident triangles in wall-details; the exporter omits those duplicate faces. It is unrelated to the wash. Baseline exported wall was 58,626 versus source 58,914. Use actual exported geometry for budget reports; all prior limits and pass/fail conclusions remain intact.
- The clean-checkout test failure is a separate issue: runtime verification must not read consumed art scratch. Keep runtime path/hash-schema, source-car hashes and actual geometry/UV/material checks. Exact source-render byte equality and embedded atlas pixel equality belong to each fresh isolated full-wall/probe build. That preserves generator source-to-export verification; it cannot retrospectively prove a historical source PNG's bytes after that PNG has been consumed. Independent review approves this narrow relocation, with a fresh integration full pass required before feature merges resume.


## AUD-14 test hooks (25 September 2026)

The external audio lane may own tools/test-combat-audio.mjs and tools/scenarios/combat-audio.mjs for tests-first weapon sound and full-throttle context checks. Runtime changes stay within its existing bank, audio and app listener hooks. No simulation changes or ElevenLabs credit use by the Director. The AUD-10 baseline tolerance decision remains pending; this scope approval does not waive it.

AUD-14 also has the narrow .gitattributes hook to mark *.ogg binary, preventing text newline conversion of Vorbis data. Test exact compressed bytes through the Git attribute path before keeping runtime assets; no unrelated attribute changes.

## 2026-09-25 PDT: selected Rustwall asset after the ten-round wave

- Accept EGG-02-P2 only as a measured development improvement. Two independent reviews score the final wall and wash 3/3/3/3; the scoped full-render CPU/RAF frame score is four, with worst required A1/B/A2 ratio 1.0833 against 1.10. The actual exported wall has 55,834 triangles in 14 primitives; its 56,122 source total includes 288 duplicate reverse cloth faces omitted by export. EGG-02-P3 retains likeness four, denser interlocked salvage, irregular tower silhouettes, natural joined strata and the selected-paint recovery work. Hidden Road remains dev.
- The selected steel paint is embedded in the committed wall GLB and originated from the exact generated image and prompt retained in `docs/ASSET_PIPELINE.md`. The generator's no-input P2 route is only a procedural fixture. A Git restore recovers the selected GLB but does not reproduce its image source. Preserve the original generated image by hash; require explicit verified input or hashed embedded-atlas extraction before modifying that paint. No source PNG is committed under `public/`.

## 2026-09-25 PDT: change Rook silhouette construction for round eight

Two actual game rounds remain at 3/3/3/3 despite better paint, scalp coverage, scarf and cuffs. Before more code, approve the written grouped method: a scalloped cap edge with rooted three-dimensional curl locks, reference-traced intermediate trouser folds while freezing seven measured width anchors, and small separated fingertip/thumb silhouettes attached to the existing gloves. Independent actual exported contour, contact, uniform-skin UV and motion tests precede implementation. Keep dense scalp coverage, face paint, waist continuity, broad padded garment charts and near/far limits of 8,000/2,000 triangles. Label occluded reference edges as inferred. Attribute the straight upper-back projection in the bent pose before changing it. Three rounds remain in this bounded wave; no other crew converts or runtime candidate replaces the baseline before likeness four.


## 2026-09-25 PDT: external voice-candidate preparation

Approve the external audio lane narrow tools/test-voice-candidates.mjs hook for independent fake-only budget, no-keep and resume checks before service use. AUD-17 preparation retains the SPEC ceiling and any tighter budget set in that session; all credits belong to that owner, none to the Director. Only Kyle selects takes. The unresolved AUD-10 baseline and pending human listening remain visible and are not waived by preparation on later cards.


## 2026-09-25 PDT: Rook upper skull and hair must match together

The narrower curl outline exposed a real scalp-coverage failure. At native side rows77/85, the connected upper skull projects rearward to x238.8/241.3 while the reference outer hair is about x253/246; the candidate hair at x245.6/242.1 lies inside that oversized skull. Restoring the old cap alone would cover scalp but keep the broad helmet silhouette. Approve a measured upper-rear core contour correction, tapering out before the lower hair/jaw bands, plus an exterior hair shell. Preserve the front face profile, eyes/beard paint, UVs, jaw, connected topology and rig. Independently test the existing reference head-back polyline at rows67/77/85 before code, then require both corrected profile and unchanged dense scalp coverage, face and motion guards. No coverage threshold is relaxed and no runtime crew is replaced.


Pending AUD-17 auditions are not consumed evidence: the external owner holds ten unselected MP3 candidates, receipts and listen.html under its ignored .evidence/audio/voices/. Preserve them until Kyle selects or rejects them; none is a kept or runtime take. That lane remains in progress. If it must retire first, its owner must transfer the pending files to a named ignored integration evidence folder and verify hashes before cleanup. The Director must not access the external audio worktree. The reported400-credit batch is finished, with no further API calls planned.


## 2026-09-25 PDT: preserve the flag-off audio summation graph

The strict AUD-10 comparator explicitly constructs both engines with every feature flag false. Its remaining residual is introduced after unity bus regrouping and amplified by the unchanged compressor. The Director approves a bank-owned flat routing path for that disabled mode: all cue recipes and parameters still come from the bank, and SoundMixer chooses the original destinations/addition order. Do not restore a second handwritten engine or duplicate recipes. Physical grouped buses, ducking and moving playback remain required for their enabled features, including independent Hidden Road voice ducking. This reconciles the bus implementation with Kyle's requirement to preserve existing behavior and keep new features switched off.

The same five strict baseline cases and thresholds remain, including the long race. This is an implementation change, not a comparison bypass. Write the routing and flag-transition design first, prove the disabled route red before code, and retain meaningful enabled-bus, voice-limit, moving-source and cleanup checks. Any graph assertion whose setup now needs enabled mode must state that premise explicitly and preserve its original routing condition; add the disabled and off/on/off transition checks rather than dropping coverage. Finish the currently frozen external full gate before tracked edits. Root independent review and a fresh lane/build gate follow the changed implementation; no ready or merge verdict is granted here.


## 2026-09-25 PDT: first-three warlord sequencing question

Read-only review confirms that the first three bosses promise Side Saws, Smoke Screen and Decoy Drone as early rewards, while the ordered arsenal cards implement them later. Existing ram, shortcut and UFO primitives can support encounters but do not implement those named weapons or their counters. Kyle has been asked whether WAR-02 may include those three working mechanics, or whether rewards should be explicitly pending until later arsenal waves. The question remains unanswered; do not create fake usable unlocks or silently change the order. Phase-2 work and independent preparation continue. Boss-specific kits, weather and stencil rewards also need actual consumers before being advertised as available.


## 2026-09-25 PDT: Rook round nine changes torso construction

Both round-eight reviews remain3/3/3/3. Change the large torso assembly rather than another small contour adjustment. Rebuild the existing vest grids as reference-traced asymmetric cloth surfaces with a visibly open teal center, unequal front edges/hems, curved lapel returns and shallow overlapping folds. Recompose the repeated square pockets as unequal attached hanging canvas volumes, and replace redundant rear rolls with one diagonal fabric flap meeting the retained lower satchel. Reuse existing role charts, one material, chest/pelvis bindings and actual armhole/waist contact guards. Reducing redundant vest grid faces funds the folds; near/far caps remain8000/2000.

Use the existing verified cloth source with deterministic broad edge wear, seam shadow and desaturated trouser values. Freeze trouser geometry and its seven measured width bands for this round; the torso is the grouped construction change. No new image or boot/hair geometry is part of round nine. Independent tests must first fail on the actual traced front/quarter opening, asymmetry, lapel/pocket depth and cloth attachment; unchanged UV padding, skin/motion and budget guards remain. Do not accept invented exact mesh counts as a substitute for the visible result. The next private High/Performance review decides likeness. Two rounds remain in this wave, and all runtime crew remain unchanged until the acceptance decision.


## 2026-09-25 PDT: Rook promotion frame evidence

The private 44-view Rook trial deliberately has no crowd/frame verdict. The old crew crowd sample performs an additional isolated render and cannot establish promotion cost. If the visual trial reaches four, add a quiet baseline/candidate/baseline comparison on one frozen source bundle, using the existing private same-origin Rook substitution and fresh memory-only pages. Exercise twelve near Rook rigs and one near plus eleven far rigs in both qualities, with matched route, state, camera and pose controls. Use one complete production render per native frame, twenty warm frames and six hundred ordered samples; retain full-render CPU, RAF intervals, actual LOD/draw counts and asset hashes. Never call CPU submission time GPU time.

Before measurement, set an additional Rook asset regression limit of ten percent for mean and p95 full-render CPU and RAF p95 against both baselines, with baseline-drift diagnostics and the existing mirror refresh/reuse safeguards where applicable. This is a Director choice for the new comparison, not a claim that SPEC assigns that relative threshold to crew. SPEC's separate combat-versus-ordinary average frame budget still applies; this scoped asset comparison does not replace it. Keep twelve figures within twenty-four color draws, near/far at8000/2000 triangles, and one1024-square texture set. No helper implementation or promotion is authorized by a score of three alone.


## 2026-09-25 PDT: correct the Rook trouser reference before round nine

Two independent native-pixel reviews found an error in the stored front inner-leg traces. The reference SHA remains af27e7925f95972c5ec842f5573640f2b8d36aece5429c0357325f7c28078058. At y455 the visible background gap is about x95–133, at y525 x88–141, and at y556 x81–144. Stored inner edges put the right leg about20–24 pixels into clear background and the left about5–12 pixels into it. Adjacent rows confirm the visible gap; no hand or holster obscures these samples. Existing source tests had validated the incorrect stored trace.

Revise the earlier round-nine trouser freeze only to correct this proven reference error. Finish a second check of outer edges and the affected bands, label occluded points as inferred, then have the independent test author write the corrected native-edge regression before changing geometry. Record the changed reference assertions and their image evidence in the lane note. Update inconsistent front polylines/bands together; do not relax tolerances or arbitrarily narrow the garment. Preserve the connected pelvis, front/back sewn UV panels, waist and boot contact, rig/motion, and triangle limits. The paint implementation can continue independently, but no scored round-nine capture proceeds until this correction passes. Hair and boots remain outside this geometry correction unless a reproduced contact failure requires a separately written scope decision.


## 2026-09-25 PDT: preserve Rook ankle contact while correcting stance

The independent native reference and authored-face intersection audit proves that the boots share the incorrect inward stance. At native y565, visible boot shafts are43–81 and147–185; source shafts project57.5–98.3 and125.7–166.5. At y600 the reference is44–74 and153–182 versus source60.1–95.9 and128.3–164.1. Adjacent rows vary only1–3pixels. Correcting trousers alone would separate the cuff and boot laterally by about5–7cm.

Approve translating each complete boot, trim and sole with its ankle contact to the independently measured stance, asymmetrically outward. Preserve shaft widths, floor height, toe shape, material/UVs and rig bindings. This is contact correction, not boot redesign. Independent native shaft/stance and posed cuff-contact reds must precede the source change; unchanged animation, foot-floor and triangle guards remain. Hair remains frozen for round nine.

## 2026-09-25 PDT: status inspection scope

Kyle excluded the external audio worktree from this Director's access. The current status helper calls Git status inside every registered lane. FIX-STATUS-SCOPE adds repeatable --skip-lane exact-branch arguments and an equivalent collectStatus skipLanes array. Skipped branches remain listed using integration Git refs, with unknown dirty state, explicitly skipped inspection and removable false. The helper must make no filesystem or Git call inside a skipped lane. Default behavior and normal lane inspection remain unchanged. Independent throwaway-repository tests precede code; no real external folder is used. This small QA fix precedes the next required status update.


## 2026-09-25 PDT: measured rear trouser contour

The independent back-view check resolves the apparent pose conflict. At native y500 the visible legs are370–414 and463–507; y490 and510 stay within1–2pixels. The old back band359–406/464–510 was approximate. Using the existing back center439 gives the first leg world x+.079..+.219m, compatible with the corrected front opposite leg+.098..+.231m. The current rear surface+.160..+.278m is displaced outward, not evidence that the reference poses are incompatible.

Approve correcting the y500 back band to those independently measured native intervals, preserving the10pixel geometry tolerance. An independent corrected-reference/source red precedes a depth-dependent rear calf contour adjustment that keeps the accepted front surface fixed and tapers toward knee/cuff. Check connected cross-sections, unchanged sewnUVs, boot contact and poses. Do not change other back bands without independent visible-reference evidence.


## 2026-09-25 PDT: final Rook wave round uses broad rooted hair locks

Round9 again scores3/3/3/3 in two actual-game reviews. Its44 High/Performance captures pass on private20428; the90,800byte sheet and verdict are committed in lane91cc77c. Improved torso construction and measured trouser/boot stance do not meet likeness four. The apparent aim-waist hole was disproved by native pixels; no waist repair is justified by that image.

Approve the builder's written round10 method: replace fourteen narrow hair strips with eight broad curved overlapping locks over an irregular dark undercap. Keep the undercap outside the actual scalp, preserve the existing dense four-view coverage and measured crown/forehead/side bounds, and root each lock into the cap. Sweep the locks across temples and nape with staggered ends and curved volume. Replace arbitrary SmartProject hair islands with explicit connected root-to-tip UV strips inside the existing padded hair chart; reuse the verified source crop, one material and unchanged face/garment pixels. The source grain is visibly longitudinal in the existing atlas and must follow each lock. Budget estimate near7596 is advisory; actual8000/2000 limits remain.

Independent silhouette, scalp/contact, exported UV direction/padding, paint-isolation, rig/motion and actual-count tests precede code. The final private matched views decide the score. This is the last round in the current ten-round wave; any remaining likeness differences become a new polish card under SPEC0.3. Runtime Rook and the other seven crew stay unchanged unless the complete promotion gate passes.


## 2026-09-25 PDT: close the Rook research wave and isolate the hand proof

Both final round10 reviews score3/3/3/3 with frame cost unmeasured. The private26162 capture passed44 High/Performance views without warnings or errors; candidate32628d4c has7500/1833 triangles. The final90,844byte sheet and review retain the verdict. Close GFX-01-P2 after its ordinary lane/build gate as a non-promoted research result, preserving the reusable recipe, independent fixture tests and original paint inputs. GFX-01-P3 carries sculpt/retopology/bake work and the remaining full-crew likeness/frame gate. No round11 is part of this wave.

The failed body likeness does not establish a winning whole-character method. It does establish useful connected-surface, explicit-UV and source-verification techniques. Re-slice GFX-02-P1 so that, after P2 closure, it first proves only Rook's hand anatomy independently: joined palm/thumb web and separated curled digits, rounded exposed-skin tips, authored sleeve cuff and padded material charts. Keep wrist/finger bones, sockets, clips, current runtime bytes and the other seven hands. Use an opt-in generator path to ignored candidate output, independently tested private same-origin substitution, a separate immutable review folder and actual High/Performance motion/camera checks. Existing all-eight baseline review behavior remains available. No all-eight conversion or runtime promotion until its own visual and measured budget gate passes. Write the detailed construction/UV/contact design and independent failing tests before code; runtime changes need a reproduced defect and separately named hook.

BETA-01's requested Experimental promotion conflicts with the still-unmet SPEC0.3 art gate. Kyle has been asked whether to preserve the4/5 gate or permit an explicitly unfinished-art Experimental beta. The question is pending; no flag change or release is authorized by elapsed time. Phase2 hand work continues independently.


GFX-02-P1's detailed pre-code design is frozen in lane a8766dc. Construction uses camera-local metres (X right, Y up, forward -Z); Blender conversion happens once. The Rook crew crop supplies visible sleeve/glove appearance, while hidden palm anatomy is explicitly inferred and current unchanged RPG/wrench meshes supply grip references. Independent tests use a0.1mm weld tolerance,12–40mm useful thumb web,6–15mm rounded tip region and8texel chart padding. Contact limits are15mm for the primary grip and20mm for support/rocket guidance, with intentional release phases excluded and5mm penetration limit at contact regions. Actual posed geometry, not manifest assertions alone, must establish those results. Start with deliberate procedural material charts; propose any new verified image source separately. Default generator/runtime outputs stay unchanged, and private candidate evidence has its own family. A quiet whole-render A1/B/A2 check is required before any frame score; the old120-frame result remains limited. No runtime code hook or release is granted by this design.


## 2026-09-25 PDT: janitor audit scope

The ten-merge sweep is overdue: eleven first-parent merges followed the last recorded sweep. No feature merge proceeds before the sweep. Inspection found that repo-audit, like the repaired status helper, still calls Git status in every registered lane. Do not run that path against the protected external audio folder. FIX-AUDIT-SCOPE adds repeatable --skip-lane exact branch arguments and audit(root, {skipLanes: []}), retaining ref-only inventory with unknown dirty state, explicit skipped inspection and false cleanup eligibility. Default behavior stays unchanged. Independent guarded throwaway-repository reds precede code; then review and normal gates. The sweep follows immediately, with no deletion inferred merely from literal-reference candidates.


## 2026-09-25 PDT: first-person round two addresses cloth construction

Rook hand round1 on private43649 produced28High/Performance captures with zero browser issues and one verified candidate fetch per quality. Root actual-game review is resemblance3/readability4/grounding3/consistency3; frame and continuous contact remain unmeasured. Runtime hands/tools remain unchanged. Source-module Blender views and actual course views have different lighting and are labelled separately.

Approve the written round2 method after independent review and red tests: open overlapping beige wrist-wrap shells, asymmetric forearm compression/tension folds, broad cloth fading/seams and dark leather panel wear, and a rounded visible thumb glove/skin boundary. Preserve connected hand topology, existing grip landmarks, rig/clips and selected-tool8000triangle/three-draw limits. Inferred clothing constraints: cover at least70percent of the previously exposed interval between sleeve hem and glove edge, shell thickness1–4mm, padded named wrap chart and no tool-grip intrusion. Keep deliberate procedural paint for this round; if two rounds stay below likeness improvement, change technique as SPEC0.3 requires. No runtime promotion, tool movement or camera workaround is approved by this choice.


## 2026-09-25 PDT: measure actual first-person contact surfaces

GFX-02-P1 gains QA-only tools/first-person-contact.mjs and its independent test. Before code, freeze APIs for selecting a connected contact-facing patch once in bind pose, measuring its actual skinned vertices against fixed corresponding tool triangles, and assessing ordered action phases. Each named hand region contributes at least six real surface samples; back-of-hand vertices are not all required to touch the handle. Keep selected vertex/triangle IDs and source hashes through the sequence. Compute closest-surface distance against the intended handle or rocket; use the entire closed handle component for ray-parity penetration. Open or nonmanifold targets report unsupported, never passing.

Retain15mm right grip,20mm support/rocket and5mm penetration limits. Reload.18 is release; .48/.76 are rocket guide/insertion; .90/1.0 must regain support. Wrench left hand is free. Use actual SkinnedMesh bone transforms and world matrices after production presentation updates. Require fresh ordered render/sample stamps and actual clip/progress matching the requested phase. Geometry hashes are recorded, but identical hashes at legitimate held/returned poses are allowed. Independent known-gap, penetration, open-target, stale-stamp and wrong-phase fixtures precede implementation. This adds measurement, not permission to move runtime tools, change simulation or infer a frame pass.


## 2026-09-25 PDT: change the Rook hand method after two flat rounds

Round2's actual private59189 game views keep the independent scores at2/4/3/3 and Director3/4/3/3; frame cost remains unmeasured. Candidate531be2b3 has4260 hand triangles,7536 with the unchanged RPG, and its wraps pass coverage. It still reads as smooth bands, narrow sleeve tubes and flat ochre leather. The review uses the captured standard candidate, not the separately exported candidate-r2 file. Preserve both immutable round sheets and their exact input hashes.

Approve round3's authored R/L compression and tension fold surfaces, replacing scalar sleeve ring warping inside the existing connected skinned shell. Fold curves have local crest/trough support and end in surrounding cloth; they are not floating ridges or full circumference rings. The builder records exact inferred paths and bounds before independent exported-geometry reds. Preserve connected hands, tip skin, bones, clips, sockets and the8000 loaded-triangle/three-draw limit.

Use one explicitly selected image-painted source with three equal vertical panels: weathered teal cloth, dark leather and beige woven wrap. Neutral diffuse illumination avoids baking the game light. Exact source path/hash, full prompt, normalized crop mapping, protected skin pixels and clean-checkout recovery belong in the recipe. New --p1-paint and --p1-paint-sha256 arguments must be paired, verified before writes and candidate-only. Default synthetic fixtures prove construction, not reproduction of selected paint. Tests use their own deterministic source and inspect embedded output pixels. The selected original remains recoverable outside disposable lane output; a source recipe and atlas extraction path survive cleanup.

Build round3 under its own ignored candidate-r3 folder while the actual contact diagnostic uses frozen round2. No runtime promotion or all-eight conversion follows from topology or paint tests; the game likeness, actual contact and measured frame gates remain separate. Further rounds follow SPEC0.3 and the run budget.


## 2026-09-25 PDT: measure the actual reload boundary

The production selector enters reload only while now is less than nextFireAt. Thus an exact reload-progress1 sample is impossible: at that instant the actual action is already idle. Correct the contact proof to sample reload.999 followed by a fresh post-completion idle render, advancing the same shot state across nextFireAt. Retain actual presentation timing and normalize the idle clip's repeating phase from its real motion time. This adds a boundary observation; it does not loosen the15/20mm gap or5mm penetration limits. Independent acceptance first reproduces the old assessor's rejection of the valid.999 in-action pose. No runtime selector change is justified.

Choose per-tool contact patches using each tool's own posed hand bind snapshot. Mixing RPG-pose hand coordinates with wrench-pose tool coordinates is invalid. For sparse triangulated hand regions, a face centroid inside the existing region may select the complete real face and its corners; requiring every corner inside the small sphere had left only one palm face. Preserve the exact sphere size, record selected IDs/bounds and keep them fixed through motion. Region centers must be transformed through the actual skin pose, with any nearest-vertex anchor approximation explicitly recorded. These changes repair measurement selection, not demonstrated grip clearance.


## 2026-09-25 PDT: compare hand cost against the actual current asset

Prepare the GFX-02-P1 budget proof as three fresh memory-only pages per quality on one frozen source bundle: A1 loads current runtime Rook hands, B substitutes the exact reviewed candidate, A2 loads current runtime hands again. Keep course, camera, tool and pose fixed. A hidden-hand baseline would answer a different question and is not this replacement-cost gate. Record zero candidate requests on A legs and one on B, actual quality and both asset hashes.

Reuse existing armor-kit native-frame pacing instrumentation with30 warm frames and600 ordered samples per leg. Stop the app loop and issue exactly one complete production renderFrame per saved native animation frame. Measure CPU submission and RAF intervals, their means and p95; compare candidate CPU mean/p95 and RAF p95 against both baselines with a10percent regression limit and report A1/A2 drift separately. Do not call CPU submission time GPU time. Existing overall combat budget remains independent. Record active gear draws/triangles and unique texture dimensions/mipmap byte estimates separately from the renderer's whole-scene texture count. Run the measured pass in a quiet window after builds stop.

Keep this as an explicit opt-in mode in the card-owned first-person-polish scenario and independent fixture tests in its existing hand test hook. The written API and failing evidence-contract cases precede implementation. Visual likeness and contact are separate gates; preparation of this measurement does not promote a candidate with incomplete art/contact evidence.


## 2026-09-25 PDT: put hand paint on the surfaces the renderer samples

The frozen R3 export965a1347 contains the selected paint in PNG top rows8..248, but its cloth TEXCOORD_0 V values are.783..967. Blender UV v.033..217 is flipped during glTF export. With the production GLTFLoader's unflipped image texture, direct exported V addresses the PNG bottom row. The prior1-minus-V color-distance calibration inspected a similar unused palette row; it did not prove material consumption. Actual garment-face sampling is red on the frozen export, despite the separate atlas-presence test passing. Treat those earlier checks as limited evidence, not a visual win.

Keep all mesh UVs, geometry, clips and skin pixels fixed. Move selected cloth/leather/wrap paint to Blender image-buffer rows8..248, saved as PNG rows776..1016, and move the declared PNG chart rectangles to their actual sampled bottom row. Correct the skin chart's coordinate reference too, preserving its actual bottom-row pixels exactly as well as the old protected pixels. Remove selected paint from the unused top row in the same change. Independent tests must follow actual exported face UVs to decoded PNG pixels, using distinct test colors or exact selected-crop correspondence rather than a nearest-palette guess. Record the changed coordinate assertions and the old/fixed consumer results in the change note. No runtime asset or threshold relaxation is authorized by this repair.


## 2026-09-25 PDT: close the bounded first-person hand proof without promotion

The formal R3 game capture on private49797 uses candidate8b985010, with28 High/Performance screenshots, one verified candidate fetch per quality and zero browser issues. Both independent and Director reviews score likeness/readability/grounding/consistency3/4/3/3. Actual selected paint consumption, connected hand topology, protected skin pixels and4260 hand/7536 loaded RPG triangles are proved; complete contact remains unsupported and the separate frame comparison is still running.

Follow the P1 design's written reversal rule: after its ordinary lane/build gate, merge the reusable candidate recipe, independent tests and three review sheets as a non-promoted research closure. Preserve the current runtime hands, shared tools and original generated material source. GFX-02-P2 retains the unmet art and contact acceptance. Its next method must establish broad asymmetric sleeve silhouettes and sewn cloth volume at game scale before fine texture work, then correct oversized weave, rigid wraps, glove articulation and wrist transitions. Any next implementation needs a new written source design and independent reds; this decision does not authorize a runtime replacement or a new unreviewed round.

The quiet A1/B/A2 result will be recorded separately, including failures. A frame pass cannot grant likeness or continuous contact. BETA-01's pending Experimental/art-gate question remains unresolved; no release or flag promotion is inferred from closing this research slice.


## 2026-09-25 PDT: first-person P2 starts with broad cloth construction

P1 is merged without runtime promotion. Both actual-game R3 reviews remain at likeness three despite correct painted material consumption and measured local folds. Approve a separate P2 opt-in recipe and authored source JSON, leaving the P1 flag/source recipe reproducible. Use the existing verified image initially; no new image generation or paint adjustment precedes the silhouette proof.

The builder's inferred construction replaces each monotone sleeve loft with a welded cut/sewn shell whose broad outer/front panel and taut inner panel share edges. First controls in authoring metres are an asymmetric elbow-side bulge of15–25mm at axial t.34–.52, gathered pinch of8–12mm at t.60–.68, and two diagonal compression ridges of8–15mm near t.68–.80. Freeze wrist/grip geometry at t>=.82. These are inferred cloth controls, not measurements copied from the differently framed reference image. The detailed panel boundaries and seam construction must be frozen in the new change note before independent tests and code.

Independent tests compare actual exported P1/P2 contours at the same approved camera and hand/tool landmarks, connected seam incidence, meaningful broad contour inflections, cuff overlap, actual UV/material sampling, unchanged hand anatomy/rig/clips and8000 loaded-triangle/three-draw limits. Reallocate hidden uniform detail before using the remaining464 triangles. Tests distinguish this construction from the P1 tube but do not supply its likeness score; matched High/Performance game views decide that.

Contact remains a separate open question. Fixed barycentric points on a connected actual palm patch may replace the sparse-vertex restriction after an explicit method contract, area/spread calibration and independent deformation/gap reds. Skin each triangle corner first and interpolate afterward. Do not widen the15mm selection region or choose a farther tool component for closure. Read-only exported topology shows closed main RPG grips and wrench handle, but open decorative bands and an intentionally hollow RPG barrel; no prior live selected-component IDs survived the early patch failure. Record those IDs before any tool topology change. No proxy, runtime tool edit or contact pass is approved by this sleeve decision.

## 2026-09-25 PDT: P2 sleeve export keeps the independent shape threshold

The first actual P2 export passes protected hand/skin/wrap records, frozen
sleeve ends, connected cloth topology, rig/clips/sockets and the loaded triangle
budget. Its second measured right outer azimuth reaches11.963mm beyond P1,
just below the independently fixed12mm threshold. A test selector first needed
correction because it classified left sleeve vertices as right frozen records;
that correction does not relax protection of either real sleeve.

Before the next source change, approve increasing only the t=.40 outer node
from18 to20mm on R and21 to23mm on L, within the existing15–25mm construction
envelope. Remove an unapproved hard-coded2mm Gaussian crest from the candidate
implementation and use the written linear seam-angle interpolation. Other
exact nodes and the12mm threshold stay fixed. This creates a measurable broad
contour; only matched game views can grant a likeness score.

Contact method remains design work only. Whole-face area can overstate the
surface inside the15mm selection sphere, so future calibration must measure
the clipped actual facing patch. A valid two-triangle surface may support six
well-spread barycentric samples; minimum triangle count is not a substitute
for physical area and spread. No new area threshold, measurement code or tool
geometry change is approved until actual clipped-patch calibration and its
independent fixtures are reviewed.

- P2 first-proof scope clarification: remove the unused cross-panel crest-drift JSON field and defer that separate construction control. The sleeve retains implemented seam-angle drift and the exact axial bulge/gather/ridge nodes. Retain P1 fold displacement on all frozen rings rather than describing their absolute displacement as zero. No new contact threshold is approved.

## 2026-09-25 PDT: P2 round two isolates game-scale cloth material

Both actual-game P2 round-one reviews remain 3/4/3/3, with frame cost
unmeasured. The broader sleeve silhouette is visible, but coarse high-contrast
weave dominates the cloth. Keep the exact R1 mesh, UVs, rig, clips, tools and
camera for a material-only comparison before changing garment construction
again.

Approve one new built-in image-generated dark-teal tightly woven canvas source,
with low-contrast fine grain and broad subtle wear under neutral illumination.
No baked folds, directional shadows, lettering or objects. Use the entire native
square image to represent about half a metre of cloth and box-filter it into
the existing 240-square cloth chart. A centre crop would enlarge the threads;
do not use one. Preserve the original image outside disposable output and
record its full prompt, exact native dimensions, full crop and SHA. Accept
square inputs from 1024 to 2048 pixels; a synthetic 1024-square fixture can
prove the path independently.

Add optional paired P2 cloth path/hash arguments, verified before output and
confined to the existing ignored/original-image source homes. Keep the
original three-panel source for leather, wrap and skin; distinguish its
selected-source flag from the optional cloth source flag. Change only saved
PNG x8..247/y776..1015 in the color, surface and normal maps. The cloth surface
is matte near0.9 with bounded small variation; reduce normal height/slope to
one quarter and renormalize, rather than scaling encoded RGB channels.
Independent reds must prove actual exported-face source consumption, exact
outside-chart bytes in all three maps, and unchanged mesh/UV/rig/clips/tools.
The scored High/Performance result decides whether this helps; no runtime
promotion or contact pass follows from material tests.


## 2026-09-25 PDT: close P2 research and carry construction acceptance forward

Both P2 rounds score 3/4/3/3 in independent and Director reviews. R2 improves
cloth scale but does not solve sleeve, wrap, wrist or glove construction. Close
P2 as a bounded, non-promoted recipe and test slice after final quiet frame
measurement, independent review and ordinary lane/build gates. Add
ASSET_PIPELINE to its ownership so its recovery recipe and limits live in the
current guide before the temporary change note is consumed.

GFX-02-P3 owns the unfinished construction, contact, frame/resource and
all-eight acceptance. No third paint-only round is authorized. The proposed
continuous cuff ends at old glove markers and does not yet prove coverage to
the actual leather surface; its endpoints remain unapproved. Future contact
must use the actual mounted facing patch, clipped physical area, spread and
fixed barycentric samples, with each triangle corner skinned before interpolation.
No guessed area threshold or tool topology change is approved here.

Morning is approaching. Finish the current measured slice and final run gates;
do not begin a new 35–45 minute construction slice. Preserve both original
material images outside the disposable lane. Reversal is a separately designed
P3 recipe, never replacement of current runtime assets without acceptance.


## 2026-09-25 PDT: Kyle approves Experimental beta with current art

Kyle answered the pending gate question: **Allow Experimental beta with current
art.** This explicitly permits BETA-01 to put wasteland2 and hidden-road under
Experimental despite current visual scores below four. Keep the unfinished
polish visible in the What to try note; preserve the art follow-on cards and
their acceptance gates. The exception does not select the research hand/body
assets and does not grant release approval. Keep career-backup in dev.

Prepare BETA-01 as the last active card before the morning handoff. Tests first,
then the flag change and real private menu/journey checks, ordinary lane/build,
exact integration full and supporting checks. After this card finish the run;
do not start the arena or warlord cards tonight. Release still waits for Kyle.


## 2026-09-25 PDT: keep Experimental reachable in compact menus

BETA-01 browser QA found the real Experimental control hidden at 1280 by 720:
it shares build-label styling, and the compact-height and compact-width media
rules hide that class. Grant a narrow src/style.css hook to preserve decorative
label hiding while keeping the interactive beta control visible and clickable
at 1280 by 720 and widths at or below 1100. Record the failing real DOM state
before the fix and verify the responsive result. Increasing the QA viewport
would leave the player blocker intact. No other menu redesign is part of this
card; retain the existing layout and unpack only rules that are rewritten.


## 2026-09-25 PDT: release the Wasteland as a Mad Max easter egg (Kyle)

Kyle: "I don't want settings selectable from the main menu beyond just the mad
max option. I want this to be an easter egg that is found when racing in the
mad max setting." Recorded as SPEC 0.12. The Experimental button, panel and the
menu on-foot camera setting are removed; `wasteland2` and `hidden-road` go to
`on`; the Hidden Road exists only in Mad Max Duel; the Wasteland rules apply
only to a player who had found the gate when the race began (Q9, now enforced
by `src/wasteland-access.js`). To reverse: set the switches back to `dev`.
The release itself still needs Kyle's written go-ahead.


## 2026-09-26: Scrapdome and warlord design (Claude, at Kyle's request)

Kyle asked Claude to design the arena and warlords and build the foundation,
with Codex (Sol) building the rest from a handoff. Recorded in
`docs/SCRAPDOME.md` and SPEC 0.13. Decisions a later card should not reopen
without Kyle: Last Car Rolling is every car for itself; the hunter cap (1, 2,
3 by difficulty); computer cars share the player's car physics; the Scrapdome
floor speed limit near 70 mph (without it the bowl played as laps); wreck
credit to the last attacker within five seconds; two seconds of spawn
protection that also blocks dealing damage; warlords as first-to-three duels
whose reward is their signature move, working immediately. The last one
answers the parked first-three-rewards question.


## 2026-09-26: crash physics and Muddy Hollow (Claude, at Kyle's request)

Recorded in `docs/CRASH_PHYSICS.md`, `docs/MUDDY_HOLLOW.md` and SPEC 0.14.
Not to reopen without Kyle: crashes are solved as rigid-body impacts in every
mode, including ordinary races (Kyle asked for Rival Duel too), so contact
fingerprints may be re-pinned with reasons; the player crashes on their own
change in velocity in Rival Duel; Mad Max's approved roadside rule (shoved
traffic clears the lane and stays clear; small speed cost for the attacker)
is kept, with physical motion; smashed traffic stays wrecked in all modes.
Muddy Hollow sits over a Titan-only ridge beside High Country's Alpine Summit,
has no main-menu entry, and follows the Hidden Road leaving-the-race flow.


## 2026-09-26: gate crash physics and preserve the exact reversal

Independent tests found that CRASH-01 had replaced contact behavior before it
had a feature switch. Add `crash-physics` in `dev`. On enables the settled
rigid-body solver and knocked motion in every mode. Off restores the exact
`integration/wasteland` armored ram, roadside traffic, traffic-wreck and
ordinary-contact paths; it is the reversal, not a second physics design.

Two narrow corrections are required for the enabled path. A car that had a
knock at the start of a simulation tick consumes that full tick even when the
knock settles, so normal driving cannot move it a second time. Low roadside
traffic becomes non-collidable at knock start but keeps the existing
`roadsideMotion.visible` render marker until it settles beyond the nearest
shoulder, then becomes a zero-motion, zero-roll wreck. These are transition and
visibility correctness fixes. They do not change the settled impact model.
The final roadside parking move must also pass the same swept solid test as
normal motion. Search the nearest deterministic whole-car-clear pose without
crossing a wall. If none exists, keep the car visible and non-collidable with
zero motion, run normal solid and boundary resolution, and retry next tick.
Never create an in-lane "parked" wreck or hide a path through a wall.

## 2026-09-26: keep armored Wasteland control below 70 mph own delta-v

CRASH-01 balance failed with solver motion applied to every non-nudge player
impact: crash physics on produced 9/4/2 wins under legacy Wasteland rules and
8/5/1 with `wasteland2`; Medium and Hard missed their target bands, one Hard
baseline race did not finish, and Medium UFO gain reached 11.29 seconds.

Keep the rigid-body result for both cars, but leave the armored Wasteland
player in driving motion when its own change in velocity is below 70 mph. The
struck car still takes the full solver shove, spin and launch. Hits at or above
70 mph can still knock the player loose. Rival Duel keeps its 6 mph knock and
22 mph crash rules. This is the narrow threshold called for by the settled
CRASH-01 handoff, not a solver or pace change.

The four balance combinations then passed: crash off gave 9/6/2 and 8/5/3
wins by difficulty; crash on gave 9/5/2 and 8/5/3. No race was unfinished and
all UFO, combat, wreck and pacing targets passed. A 130-to-25 mph protected
rear-ram fixture measures 58.86 mph player delta-v and retains control; the
260-to-25 mph fixture measures 131.68 mph and still knocks the player.

## 2026-09-26: TITAN-01 slope gravity is Titan-only

The first red TITAN-01 contract treated slope gravity as a rule for both the
Titan and the rally car. Implementing that interpretation changed the pinned
`ridge-rally-duel` physics fingerprint from
`58535e5a13d35cd4ef16e35d740c52b4ae3e77666074ea4a16878be8d20eadef` to
`6a0536d5f14b95951e8d25447a12918896bd561a87d40ed2a2d6317d9e7589a2`.
The card also requires the rally limits and replay fingerprints to remain
unchanged. Slope gravity therefore applies only to the Titan. The rally keeps
its existing accumulated-climb cap and speed behavior; ordinary cars remain
unchanged.

## 2026-09-26: widen the Muddy Hollow phase-1 boundary blend

The first phase-1 height field joined the ordinary High Country ground within
one centimetre at its outer edge, but the inner blend made the intended Titan
entry reach a 63.2-degree grade. That exceeded the switched Titan limit of
58.8 degrees and contradicted the settled Titan-only access design.

Start the deterministic quintic boundary blend at normalized radius 0.65.
The maximum measured intended-entry grade is then 1.098, below the Titan limit
of 1.65, while the full ellipse remains within 0.00245 m of ordinary terrain
at the edge on route seeds 1989, 42 and 17. This changes only the transition
shape. It does not move the Hollow, change the road, or redesign its landforms.

## 2026-09-26: show failed Muddy Hollow departure saves in the existing pause panel

Save Guardian review denied profile storage during phase-3 departure. The
abandonment remained safe in memory and cleared the active race, but the
exploration pause panel did not tell the player that the change was session
only. The garage would show the warning later, after the player had already
left the event.

Re-slice EGG-03 narrowly to allow `src/screen-results.js`. When an exploration
pause follows a failed profile save, append the same session-only storage
warning used by the ticket screen. This is safety feedback in the existing
pause panel. It adds no Muddy Hollow screen, control, menu entry or save field.

## 2026-09-26: correct Muddy Hollow ridge grounding in phase 6

Phase-3 browser QA first captured a stale Falcone frame while the Titan asset
was still loading. That image and its grounding verdict are invalid. The
corrected memory-only run proves the simulation car, ready renderer asset and
only visible vehicle are all the Titan. Its rendered X/Z position and refreshed
terrain pitch and roll match the simulation exactly, yet the body still
intersects the steep departure slope.

Keep phase 3 limited to deterministic departure behavior. Muddy Hollow remains
behind its dev switch, and phase 6 already owns the detailed ground and visual
pass. Extend phase-6 acceptance to correct this verified Titan intersection
before the playground is visually complete. This is a required grounding fix,
not a change to the settled ridge location, Titan-only access or departure
rule.

## 2026-09-26: give Dirt Kickers 2 and 3 enough lift

The phase-4 tests drove the Titan through all five settled ramp sites at the
same 120 Hz step. The first red run stopped at Dirt Kicker 2: its four-metre
bump was cancelled by the underlying valley grade at 58 mph. After that site
matched the already proven mega-site lift, the continuing run found the same
problem at Dirt Kicker 3 with its 4.5-metre lift. The mega jump, Dirt Kicker 1
and the log ramp produced shared off-road flight without lift tuning.

Keep both sites, footprints, roles and approaches unchanged, but raise their
authored lift to 5.5 metres, matching the already proven mega-site lift. The
phase-4 acceptance trace must prove the resulting flight. This does not change
the racing line, ordinary course features, random stream or any flag-off
course.

The first test also assumed that every site used the local-along approach.
The log site lies on a 28.6-metre local-along descent, while its cross-slope
profile contains the intended crest. Retain its settled 3.8-metre lift and
record the cross-slope approach in the authored site. The acceptance trace
still requires real flight; this corrects the test path instead of inflating
the ramp to overpower unrelated terrain.

The settled mega jump must carry a fast Titan over the pond. Its phase-1
five-and-a-half-metre placeholder launched the truck but landed before the
pond. At 92 mph, 12, 13 and 13.5 metres reached nearest normalized pond radii
of 1.188, 1.097 and 1.024, respectively, where 1.0 is the pond edge. A
14-metre lift is the first tested half-metre value that enters the pond span.
Keep the existing site and footprint and use that lift. Phase 6 still owns the
visual review of the detailed ramp and landing.

## 2026-09-26: isolate Hollow support from ordinary mountains

Independent phase-4 review drove the sites through the public exploration
step instead of assigning positions. Dirt Kicker 1 stopped before its centre.
At local position 105.24, 210, the authored Hollow ground is 72.495 metres,
but an ordinary High Country mountain supplies 76.679 metres of support; at
the kicker centre it rises to 114.168 metres over 74.692 metres of Hollow
ground. The unchanged mountain field physically buries the authored site.

Inside the installed Hollow boundary, use the Hollow's own ground and
zone-owned rocks for tyre support. Keep ordinary mountain support unchanged
outside the boundary and on every flag-off course. Phase 6 must also mask or
replace the overlapping ordinary mountain visuals when it builds the detailed
Hollow scene; physics isolation alone is not visual acceptance.

The same real-step review found steep support entries on the first rock group.
Keep all seven centres and heights, widen their deterministic footprints, and
anchor each support base to the minimum of 16 fixed samples around its support
radius. This removes the terrain-height step at the downhill edge and lets the
Titan crawl across each boulder without bypassing its max-grade rule.

## 2026-09-26: use the exploration clock for Hollow airtime

The race clock correctly freezes after departure, but shared jump physics also
used it to measure airtime. A real mega-jump stayed airborne for 114 fixed
ticks, about 0.95 seconds, while reporting only 0.008 seconds. Pass the
deterministic departure elapsed time into the shared jump step during Hollow
exploration. Ordinary race and arena calls keep the existing race-clock
default. This changes no scoring or outcome clock.

## 2026-09-26: repeat Hollow obstacles on each course lap

The first rock query compared raw authored course distance. On lap two, rock 1
was absent near distance 7,222.956 and Titan support fell from 71.3997 to the
69.9997-metre base. Project each fixed rock onto every queried course lap and
return that lap's absolute distance. IDs, world positions and authored order
stay fixed, while shared support and solid-contact lookup now repeat exactly.

The card did not originally name `src/sim-contacts.js`, although its settled
rock garden requires the shared rock support and static-contact query. Re-slice
EGG-03 narrowly to add that hook. The hook may only combine the installed
zone's fixed obstacles with the existing query and suppress ordinary mountain
support inside the zone boundary. Ordinary obstacles, contact damage and
flag-off behavior stay unchanged.

## 2026-09-26: keep Muddy Hollow phase-5 progress bounded and reward-only

Phase 5 stores one additive `wasteland.muddyHollow` object per named player:
`discovered` is a boolean, `hubcaps` is a unique allow-listed set of the five
authored IDs, and `titanHighCountryFinishes` is an integer clamped from zero to
five. Unknown nested fields remain intact. The existing startup migration gate
must require and verify a backup before it writes this new normalized shape.

The five hubcaps are fixed zone data at the settled sites. Exploration uses a
swept pickup test so frame rate and speed cannot skip one. The simulation emits
each ID once and changes no race clock, score, record, wallet or reward. The App
accepts that event only from the current player, run, installed Hollow and live
exploration state before it saves the ID. Entering the Hollow marks it
discovered through the same guarded departure event. Denied storage remains a
session-only success with the existing warning.

All five IDs make `titan_gold` an owned, free, appearance-only Titan finish.
The entitlement is derived from the validated hubcap set, not a second reward
flag. It cannot be bought, forged onto another car or shown before it is
earned. It is not selected automatically. Applying it uses the existing paint
snapshot path and cannot change physics or competitive record keys.

The settled garage hint counts completed High Country races in the Titan only
when the `muddy-hollow` switch and found Wasteland gate are both present in the
race snapshot. Wins, losses and time trials count; abandoned, incomplete,
practice, other-car, other-course, duplicate and flag-off results do not. The
count stops at five. The exact tip appears only on the Titan garage page and
only until the Hollow is discovered. It adds no menu action.

Re-slice EGG-03 narrowly for the existing save, migration, paint and garage
hooks needed by this contract: `src/wasteland-progress.js`,
`src/career-backup.js`, `src/paint-presets.js`, `src/screen-garage.js` and their
focused tests. These hooks may add only the bounded fields, reward finish and
Titan-page tip described above.

## 2026-09-26: keep the earned Hollow finish behind the live switch

Independent phase-5 review found that an earned and selected `titan_gold`
finish remained visible after `muddy-hollow` was turned off. That leaked a new
Wasteland feature beyond its development switch even though its entitlement
was valid in the saved profile.

Preserve a legitimately earned selection in the version-1 save, but require
the current `muddy-hollow` switch for every catalog, garage operation and race
appearance snapshot. Turning the switch off hides the finish without erasing
it; turning it on restores the saved selection. A non-Titan car, a profile
without the found gate, a missing hubcap set and an opaque future Wasteland
schema cannot expose it. This clarifies switch isolation and does not change
the settled five-hubcap reward.

## 2026-09-26: replace coarse Hollow cover and calibrate Phase-6 readability

Browser review of Phase 6 at `a64e16c` found ordinary near and far terrain
triangles spanning the authored Hollow as large pale slabs. The same review
found a broken, ten-metre vertical pond surface, hubcap markers that were too
small at driving distance and water spray that did not read behind the Titan.
Follow-up review proved that a centroid-only cut left a far-terrain wedge 4.82
metres above the detailed ground. When the `muddy-hollow` switch is on, give
every coarse triangle that overlaps the Hollow ellipse private vertices fitted
to the authored height field. Keep its ordinary outer edges and topology, then
cover the authored core with the four-metre mesh. Keep the flag-off geometry
exact. Give the reflective centre of the shallow pond one waterline at its
settled one-metre centre depth, and show the rest of the unchanged water-contact
field as a blue-green saturated margin. Submit no buried water triangles.
Increase only marker height and size and spray size and brightness; do not move
sites, change pickup radii or change surface physics.

Independent code review also measured the first departure correction with the
real Titan model. It left the lowest tyre vertex about 0.73 metres above the
authored slope. A second review found that the centre/radius approximation
still floated 0.16 to 0.21 metres at local lateral 60 to 65 and penetrated about
0.05 metres at lateral 80. Cache a bounded support hull from the imported tread
and compare those points with the installed Hollow height field. The three
departure-boundary samples and the ridge approach at laterals 60, 65 and 80
must leave the lowest real tread 0.005 to 0.03 metres above the surface and the
body clear. Keep the correction render-only and absent outside the installed
Hollow.

Re-slice EGG-03 narrowly for the focused scene test and the existing
`src/world-surfaces.js`, `src/effects.js` and `src/vehicle-grounding.js` hooks.
These hooks may only provide the switched Phase-6 presentation and correction
described above.

Final browser review showed that the first fitted mesh had downward-facing
triangles. The normal above-ground camera therefore culled the replacement and
looked through the deliberate coarse-terrain cut at the sky, which appeared as
a flooded basin with floating sheets. Reverse only the fitted ground and pond
face order so their normals point upward. Keep the settled vertices, materials,
height field, surface field and physics unchanged, and protect the normal
direction in the focused scene test.

A later raycast found that the broad 1.3-times skirt used to cover whole
removed triangles reached High Country's race tunnel and left a new clipped
outer seam against ordinary terrain. The pale slab was `Circuit rock surface`,
not a Hollow mesh or overlapping mountain. Retire that broad skirt. The private
coarse replacements above keep their original outer edges and let the dense
mesh end at the authored ellipse, away from the race road and tunnel.

## 2026-09-26: subdivide coarse Hollow cover and taper its boundary

Review of the first private-vertex replacement at `c8121c9` found that copying
only each coarse triangle's three corners did not fit its interior. Near
terrain rose 2.086 metres above the detailed mesh, far terrain rose 17.900
metres above it, and one fitted-to-unfitted far edge opened a 1.636-metre
crack. Browser review showed the same failure as buried ground and pond.

Subdivide only near and far triangles that touch a 1.08-times Hollow ellipse.
Use two fixed subdivision levels for near terrain and three for the coarser far
grid. Interpolate every existing non-position attribute and keep the source
triangle's material group. Inside the authored ellipse, place this coarse
underlay 0.7 metres below its authored height. Across the outer eight-percent
band, use a smooth deterministic taper back to the exact source triangle
height. This prevents a large triangle from bridging above the detailed mesh,
keeps the outside seam continuous and does not widen the detailed Hollow mesh
or alter the race tunnel. Flag-off geometry remains on the unchanged path.

## 2026-09-26: settle Last Car Rolling scrap and hold

Use CAR-01's existing 80-scrap finish and 60-scrap credited-wreck values for
the Scrapdome. Add 40 scrap for each computer car that finishes behind the
player. Count at most four credited wrecks, matching CAR-01's bounded wreck
contract. Multiply that subtotal by computer difficulty: 1.0 on Easy, 1.2 on
Medium and 1.4 on Hard, then round to the nearest whole scrap. This makes a
larger field pay more without adding a second currency rule or rewarding an
unfinished event.

A player win against at least two computer cars adds 25 hold to Kettle
Kingpin's territory, capped at 100. A one-computer-car win still pays scrap
but adds no hold. Settle only the player who started the event, once under
`arena:<runId>` in `wasteland.settledResults`. A failed save restores the
complete previous profile and shows no new award. Abandonment emits no arena
result and therefore costs and pays nothing. Preserve unknown profile,
Wasteland and Kettle fields throughout.

Independent review of the first candidate proved that current-version profile
normalization already preserved unknown Wasteland and Kettle fields but
dropped unknown fields at the profile root during the actual player-registry
save. Re-slice ARENA-02-PAY to the existing `src/progression.js` normalization
hook. Preserve unknown root fields for supported profile versions before
validating every known field. Keep invalid and future profile versions on the
existing fresh-profile path, and keep future Wasteland versions write-blocked.
The regression must pass through `replacePlayerProfile`, `savePlayers` and
`loadPlayers`, not only the pure settlement helper.

## 2026-09-26: split CRASH-02 visual and audio work

CRASH-02 keeps Claude's settled design. Implement it in two isolated lanes so
the visual work does not overlap the external audio owner. The VIS lane owns
sparks, contact-point crumple presentation, knocked-tyre smoke and launched
traffic roll checks. A later AUDIO lane owns the existing
`vehicle.crash-impact` cue, its change-in-velocity scaling and full-throttle
measurement under SPEC 0.9. Neither lane may edit the other's files.

Add `crash-effects` as a new dev switch. It gates every new CRASH-02 visual
and audio presentation. `crash-physics` remains the independent simulation
switch: turning `crash-effects` off must preserve the exact current renderer,
event and audio paths. The visual layer may subscribe to the existing
`vehicleSmash` event and keep its own bounded, presentation-only lifetime. It
must not add state to the deterministic simulation or consume simulation RNG.

Re-slice the visual lane to own `tools/test-crash-presentation.mjs` and to use
the existing feature-flag inventory tests. This records test ownership before
code. Existing localized damage zones provide the permanent crumple; the new
event effect must place the immediate spark/crumple flash at the exact supplied
world point. Knocks produce smoke only while `actor.knock` exists. Launched
traffic keeps the physical wreck roll already authored by CRASH-01.
