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
