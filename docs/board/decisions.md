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
