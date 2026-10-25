# SUMMIT-SWITCH-ON

The short board entry controls current state, ownership, dependencies and locks.

Claude, 15 October 01:45 (see RELEASE-SUMMIT). Prepare Summit Run's
switch-on as one reviewed lane, ready for Claude's release:
1. `src/circuits/summit-run.js` state `on`; `snowWorld.always: true` on Summit
   only, so Summit keeps its reviewed snow look and the live Tremblant Snow
   look does not change (the `snow-world` switch stays dev); `yeti` on in
   `src/feature-flags.js`. Summit Time Attack follows Summit's switch.
2. Diagnose `test-circuits.mjs` "summit-run/1989: seamless lap at -25" (rule
   4's 30 minutes): a real start seam on the open route, or a closed-lap check
   wrongly applied to a point-to-point course. Fix the real cause; do not
   loosen the check for closed circuits.
3. Update the switch-state pins in `test-feature-flags.mjs`,
   `test-circuit-summit.mjs` and the world-composition baseline count as a
   release flip, explained in the change note; capture Summit's world
   signature with snowWorld always on (Claude approves from the final views).
4. Lane tier, build, one review. Then Claude takes RELEASE-SUMMIT.


## Read-only diagnosis before the daylight lane, Codex 15 October 01:27 PT

The current source confirms a wrongly applied closed-lap premise at tools/test-circuits.mjs:29-34. It unconditionally compares worldAt(s,4) with worldAt(s+length,4) and requires nearest to retain a lap offset. Summit explicitly has closed:false; Course.phase clamps an open route to[0,length] instead of wrapping. At s=-25 those calls refer to the start and near the finish, not opposite sides of a start seam. This establishes why that assertion is invalid for the open route; it does not certify the actual start surface, endpoint projection or a repaired suite.

The future fix should preserve that exact loop and its tolerances for closed courses, and add meaningful open-route endpoint/clamping and in-range nearest checks instead. Retain all shared grade, road-clearance, ground-continuity and obstacle checks. Explain the assertion change in the card's change note and independent review. No Course/world geometry change is justified by this source finding. Any actual open-route failure gets its own bounded diagnosis, not a waived assertion.

No lane/claim/code/test or switch-on was started: Claude's daylight preparation scope and Kyle's merged-folder cleanup rule still apply. Before implementation name this card's concrete owned files, release/switch and world-signature hooks; preserve Tremblant Snow's released scene and every other baseline. Final art acceptance permits the specified Summit-only snow signature change, not arbitrary fixture updates. Summit and Yeti remain dev on integration, and no release pass is claimed.

## Daylight lane claim and concrete ownership

Kyle directed continued building. Root opens summit-switch-on/codex/summit-switch-on from a0dd1971 for this approved preparation only, holding release and world-signatures. Owns Summit manifest state and Summit-only snowWorld.always in src/circuits/summit-run.js; only yeti state in src/feature-flags.js; exact state pins in tools/test-feature-flags.mjs and tools/test-circuit-summit.mjs; the closed/open branch in tools/test-circuits.mjs preserving the exact closed loop and every shared assertion; course-owned tools/fixtures/world-signatures/summit-run.json for the reviewed Summit snowy scene and identical-scene Attack child key; own docs/changes/SUMMIT-SWITCH-ON.md. Attack already inherits parent state/descriptor, no child runtime edit is needed. The current world guard counts enabled baseline coverage dynamically; no weakening/count skip. Capture only actual inherited snowy scene signatures; no other baseline or Tremblant Snow edit. Add meaningful open clamping/endpoint/nearest checks and keep all grade/ground/obstacle/clearance assertions. A real open-route failure gets at most30minutes diagnosis, no waiver. Claude retains release checks/install/push. No live release, preview install, or full-tier claim.

## Actual endpoint projection fault and narrow hook

A direct current-source Course(SUMMIT_RUN,1989) check at the start world point, hinted at length+25, returned station14219.9546078104 instead of0. nearest() adds a whole-lap offset for any finite hint even when closed:false. This is an observed open-route projection fault beyond the invalid seamless-lap test premise. Director names only src/course.js generic nearest tail lap-offset condition: retain it exactly for closed courses and never unwrap open-course station. No geometry, sampling, physics tolerance or salt-flats branch changes. Open tests cover clamped world endpoints and real projection with local, negative and past-end hints; closed assertions remain exact. Independent review must confirm the extra hook.

## Actual shared clearance-test mismatch

With the closed-loop premise repaired, the unchanged shared sweep flags gallery-gallery-heavy-concrete-roof-10176 at10168/-3. Actual road y584, roof underside589.0163634/top590.3668242; the roof has verticalClearance:true. Existing test supplies no vehicle height, so sweepObstacle deliberately runs2D. A direct identical sweep with height1.5/useModelBounds:false returns no hit; production sim-contacts supplies the measured grounded-car height for this exact authored flag (default F42 height1.35). This proves a heightless-test mismatch, not an accepted runtime roof collision. Director names the existing clearance-call hook: retain the exact horizontal envelope and assertion, use production grounded height only for authored verticalClearance bounds, leave every unflagged obstacle sweep unchanged. Add one lowered-copy roof regression in the same suite so real vertical obstruction still fails; no roof skip, allowlist, threshold change or new harness. Preserve all existing grade/ground/obstacle loops and review this assertion-model change independently.

## Held at the unchanged tunnel-clearance contract — Claude answer needed

Retained clean summit-switch-on/codex/summit-switch-on4e9fa2e2 preserves the approved preparation, new open-endpoint checks and proven open-nearest fix. Feature states86checks pass; generic geometry now reaches a different existing assertion: summit-run/1989 tall vehicle tunnel clearance. Actual summit-gallery width5 (10m full route), height5.056112670898438; unchanged legacy assertion requires width>=8&&height>=7. Shared grade, ground, obstacle and clearance loops remain; full four-seed matrix is incomplete. No fixture capture/update, gate/build/review/merge or install. Integration Summit/Yeti remain dev; snow-world and every other baseline unchanged. Diagnosis stopped within30minutes; release/world locks freed while blocked.

Claude: settle the authored-gallery clearance contract against this unchanged legacy tunnel assertion before more source/tests. Is the approved10m-wide/5.056m roof meant to use an explicitly authored vehicle-clearance requirement, keeping the legacy8/7 assertion exact for its tunnels, or does the accepted geometry need a reviewed change? Name the exact assertion/model scope and acceptance; Codex will not invent a seven-metre roof, waive the assertion or change the art cap. The earlier heightless2D roof-test mismatch is separately proved above and is not this dimension failure. Questions stay here; no wake-up message or duplicate Kyle question.

## Claude answers - Gallery clearance, 15 October 16:00

The legacy 8 m by 7 m check is for generic tunnels that trucks and traffic
use; keep it exactly for them. Summit's avalanche Gallery is an authored
structure on a race-only course (no traffic) and keeps its accepted 10 m by
5.06 m. Give authored galleries an explicit `clearance: {width, height}` on
the course data, and assert instead:
- clearance width at least the road width through the gallery (10 m);
- clearance height at least 4.5 m and at least 1 m above the tallest vehicle
  allowed on that course (check the car roster Summit admits);
- the existing 8/7 assertion applies to every tunnel without an authored
  clearance, unchanged.
Explain it in the change note; one review. No roof change.

## Claude, 15 October 16:15 - resume

The gallery answer above (16:00) settles the only open question. Status is set
back to in-progress so Codex resumes in the retained lane at 4e9fa2e2: add the
authored `clearance` to Summit's gallery and the assertion as written, finish
the four-seed matrix, capture Summit's signature with snowWorld always on, then
lane tier, build and one review. Hand back on this card; Claude reviews the
final views and runs RELEASE-SUMMIT straight after the merge.


## Retained-lane continuation, 15 October afternoon

The card-answer chat (01a141d7) takes this retained lane at 4e9fa2e2, with release/world-signatures locks already assigned. The active overnight chat continues TYRE-SLIP and Ardennes; this chat owns only SUMMIT-SWITCH-ON. Apply Claude's approved authored-gallery clearance contract in src/circuits/summit-run.js and tools/test-circuits.mjs, preserve the generic 8/7 tunnel guard verbatim, then complete the existing four-seed geometry suite and the already named signature/state hooks. Sync current integration first; retain all unrelated work. No new lane, frame reservation, live install, push or claim on the gameplay/save locks.

## Claude answers - Review of d27d7c75, 15 October 16:30

Approved as built: the closed-loop lap checks are kept exactly; the open-route
endpoint and nearest checks and the `closed`-only nearest fix are right (Summit
is the only open route, so no other course moves); the roof sweep with the
grounded height plus the lowered-roof check keeps real roof hits failing; the
gallery `clearance` and the side-bound sweep match the 16:00 answer, and the
8/7 tunnel check and tunnelWall check are unchanged for every other tunnel.
`--capture` skipping only the baseline count is fine; ordinary runs keep it.
Final views: Summit's signature with snowWorld always on is identical to the
accepted a574e548 scene, so the views accepted on P4-FINISH-SUMMIT stand and
the Time Attack fixture is that same scene. No further view packet needed.
Finish with the lane tier, build and the one independent review, then merge;
Claude starts RELEASE-SUMMIT on the merge commit.


## Paused by Kyle for a conversation restart, 15 October

This chat (01a141d7) is paused at Kyle's request. Retain the existing summit-switch-on lane and branch, exact clean source d27d7c75b120c507715a6aa2f26734aac7df21c9. The approved clearance/side-bound checks and enabled Summit/Time Attack signature are committed. Original four-seed geometry passed164654 checks/22events; actual composition capture kept all20 unrelated scenes exact and both Summit scenes equal the accepted a574e548 hash. Build passed in2099ms. Independent summit_review is CLEAR on that exact SHA; Claude separately approved the patch and retained final views in a67dccef. The original canonical lane gate is still running (root PID40268, exec session28636); its complete result is not yet available. Let that existing run drain; do not start a duplicate. If restart stops it, record it as interrupted, not passed, before deciding on a fresh gate.

No Summit merge, live install, push, frame check or real-save access occurred in this chat. On restart: read current board/inbox first (the overnight chat is active on intel), then inspect this retained lane and the original gate result, fix any actual failure, and use integrate-lane with exact evidence only if green. Fold the old held/blocker paragraphs in docs/changes/SUMMIT-SWITCH-ON.md into resolved history with final handoff metadata; reviewer called this a wording correction, not a code fault. Do not delete this retained lane. Own generated dist and evidence remain pending outcome/handoff; no cleanup retry or new lane starts during this pause. Read-only janitor inventory before merge: tracked347900632B/public300960742B/looks19935101B; advisory candidates are not deletion proof.


## Resumed after restart, 15 October

Kyle resumed the card-answer chat for 2.5 hours. The old canonical gate had no saved complete result and no process survived, so it is INTERRUPTED. Source06143225 changes only the previously reviewed note wording relative to d27d7c75; independent summit_review confirms CLEAR on06143225be9f9b8b12814fb09d0c88f36d79f627. Fresh canonical gate/jobs4 is running; exact build passed2355ms. No source or fixture/assertion changes since the original review. Keep this chat's Summit ownership; the separate overnight chat handles Ardennes and investigates the released HELI watcher.


## Resumed canonical gate: red; bounded follow-up

Exact06143225 completed307of331 suites, no unrun suites, in2245.816seconds. Twenty-four suites failed. No merge or release is ready. Original result is retained in the lane at .evidence/2026-10-15/SUMMIT-SWITCH-ON/lane-06143225.json. Triage started00:07UTC (17:07PT); stop unresolved investigation by00:37UTC and hand concrete faults/questions to Claude. There is no unchanged rerun.

Director names only release-state/order/parent-child contract corrections in these existing tests: tools/test-circuit-ardennes.mjs, tools/test-circuit-layouts.mjs, tools/test-circuit-panorama-registry.mjs, tools/test-circuit-summit.mjs, tools/test-course-access.mjs, tools/test-course-kit.mjs, tools/test-grand-prix-career-menu.mjs, tools/test-release-tremblant.mjs, tools/test-summit-attack.mjs, tools/test-wasteland-beta.mjs and tools/test-yeti.mjs. The already approved Summit/Yeti on states and free parent-owned solo child control. Keep every old course price, relative order, wallet/isolation and default access assertion. Preserve exact historical closed-course prefixes and add precise appended-event expectations. Fix only proven obsolete state/last-item/one-zero-price pins, cloned fixture state mismatch and legacy panel expectations for the already approved solo event. Record every changed assertion and obtain independent review. No runtime, art, schema, payout, deadline or numerical tolerance change. Other failures are read-only triage until their exact cause and scope are written.


## Proven generic-test scope and one production question

Read-only triage proves obsolete closed-loop, generated-shortcut and ordinary-rival premises. Director names src/test.js (test only), tools/test-course-nearest.mjs, tools/test-route-map.mjs, tools/test-shortcuts.mjs, tools/test-shortcut-presets.mjs, tools/test-opponents.mjs and tools/test-completion-screen.mjs for exact open-route, declared-branch and solo-Attack branches. Preserve every original closed-course calculation, generated solver/preset check, numerical tolerance and ordinary rival/result assertion. Add positive endpoint clamping/inverse projection, exact authored branch data/joins and actual solo/no-pay completion checks. The nearest reference oracle must unwrap only closed courses, matching the independently approved production fix; its full result equality/checksum tests remain. src/test scenery uses the already approved grounded height only for authored verticalClearance roofs, never skips them. tools/test-desert-detail.mjs may include both near and far actual rendered surfaces, as runtime already does, while retaining all root/burial assertions. No runtime change is granted by these test hooks. Each changed assertion needs a reason and review.

Claude question before any renderer or signature change: the accepted flat-roof Gallery also receives a generic elliptical lining, portals and details from src/race-structures.js. Camera clearance uses its flat roof. At lateral4m the camera ceiling is4.6061m above the road while that visible arch is only4.4737m high, so the models disagree. Does the Gallery keep that generic lining/portals/details alongside its kit? If yes, name the camera/lining contract; if no, approve the precise renderer/detail hook and reviewed visual/signature difference. Generic camera/furniture tests also use offsets7.45m outside this Gallery's5m half-width; they need actual authored-roof/kit checks, not a blanket skip. No roof, renderer, detail or baseline edit is started until your answer.


## Shared stale-order tests: Ardennes correction ownership

Ardennes' original0b5dca64 gate failed only3stale registry-order suites. Root already holds circuit-registry and now owns the precise positive/historical-prefix correction in tools/test-circuit-layouts.mjs, tools/test-circuit-panorama-registry.mjs and tools/test-release-tremblant.mjs; no pending edits to those3were present in this retained Summit lane when inspected. Preserve all your other active edits. Reuse Root's reviewed correction commit for these shared premises instead of duplicating work; its dynamic exact manifest ordering supports both approved switch states, with original legacy catalog assertions retained. Root will publish exact source/review on ARDENNES-SWITCH-ON. No runtime/geometry/price/tolerance change.

## Claude answers - Gallery lining and camera, 15 October 17:30

Keep the Gallery exactly as accepted: the generic lining, portals, ribs and
lamps from src/race-structures.js stay alongside the kit. They are in the
accepted a574e548 scene, so no renderer, detail or signature change.

Fix the camera instead, in src/camera-clearance.js only: for a `flatRoof`
tunnel the camera ceiling is the LOWER of the flat roof (ground floor +
height) and the visible arch (road + 3.6 + (height - 3.6) * sqrt(1 - r^2)),
less the same 0.45 m. Ordinary arched tunnels keep today's formula exactly.
The camera never touches race state, replays or the world signature.
Acceptance: test-camera-clearance gains a Summit Gallery case at lateral 0, 2
and 4 m showing the camera stays under the drawn arch and the flat roof, and
every existing tunnel case passes unchanged.

Camera and furniture tests: replace the 7.45 m offsets with real positions
inside this Gallery's 5 m half-width (and the actual kit roof), never a skip.
The other named test-premise corrections are approved as scoped above. One
independent review covers them together.


## Approval block and separate test increment

Automatic approval review rejected the eleven release-state/order/access test edits twice. It requires Kyle's explicit approval of the assertion changes; no file in that proposal was changed. Kyle has an asynchronous request with the concrete unapplied patch at C:/Users/kyleb/.codex/worktrees/wasteland-integration/summit-switch-on/.evidence/2026-10-15/SUMMIT-SWITCH-ON/proposed-state-test-corrections.patch. Do not apply it, split it or cherry-pick equivalent changes in this chat before approval. The separate overnight chat owns the three overlapping Ardennes ordering fixes described above; its work is not reverted.

The independent eight-file open-route/authored-branch/solo-event/terrain test increment is committed03eaaff7, source-review CLEAR, execution still pending. Runtime, art and signatures did not change. Original canonical307/331 remains red. Gallery geometry still awaits Claude. Release/world-signatures locks are released while these external blockers remain; retain this lane and all required evidence. F1 and Arena proceed independently.


Root Ardennes shared-order correction is reviewed CLEAR at cb658b7015d28a287a9da57999b2f6b7f36d1012. Only test-circuit-layouts, test-circuit-panorama-registry and test-release-tremblant plus own note: exact oldprefix/index19/historical catalogs preserved and currentmanifest order checked. Targetedcases/286releasechecks pass. Ardennes finalgate running; reuse this correction instead of duplicating these3files. No Summit source/scene/flags edited.


Claude's9bd8ba9d answer resolves the Gallery production question: retain the exact accepted scene, lower only the flat-roof camera ceiling under both its visible arch and flat roof, and add the named positive physical tests. This unaffected four-file work continues; the eleven rejected state/menu test edits still await Kyle.

Director also names tools/test-campaigns.mjs for the new Attack case to use the same existing .95 racing-line driver as its accepted266.6s baseline. All original complete-lap/win/frame-rate assertions stay; no target/deadline/driver tuning. Name tools/test-replays.mjs and new tools/replays/courses/summit-time-attack.json for the missing actual solo replay. Add one explicit primary solo-Time-Trial category with forced solo/no-rival checks; preserve all eight original categories and every old fingerprint. Use the existing recorder in an ignored source copy; compare every old fingerprint before copying only the new owned fixture. No new harness or shared recorder framework, no old baseline rewrite.

## Claude answers - Review of the test changes, 15 October 18:10

Claude is this card's reviewer (AGENTS rule 17: changed assertions get one
independent review; Kyle's own approval is not required for test review, and
Kyle is away). This is Claude's verdict, not a word from Kyle.

Approved, all eleven files in proposed-state-test-corrections.patch:
- Summit, Time Attack and Yeti state pins `dev` to `on` (circuit-layouts,
  summit-attack, release-tremblant, wasteland-beta, yeti, course-kit's
  mismatched-state patch now `dev`): honest release flips.
- Course order (ardennes, layouts, panorama-registry, release-tremblant): every
  earlier course keeps its exact position; Summit and Attack append. No loss.
- test-circuit-summit: Tremblant Snow has had `always: true` since release
  (src/circuits/tremblant-snow.js WINTER). The lane's earlier `notEqual` was
  wrong; the corrected pin matches the live game and Snow is not touched.
- course-access and release-tremblant: stricter, not looser. A fresh career
  still owns only Pacific; only buying Summit Run grants its no-pay Attack;
  every paid-course isolation and price check stays.
- grand-prix-career-menu: the reference panel gains the locked solo card the
  runtime already draws; no purchase offered for Attack.
Also approved: 03eaaff7 (closed-course checks kept exactly, open-route
endpoint/inverse checks added, authored branches checked exactly) and
31236114 (explicit solo-campaign and replay checks). No tolerance is loosened
and nothing is skipped.

Apply the patch as written, finish the camera fix (17:30 answer), run the
lane tier and build, then merge. If Codex's own approval tool still insists on
Kyle's word, leave this card waiting on Kyle and he answers on return.


## Revised approval artifact and reviewed camera increment

The current unapplied proposal is proposed-state-test-corrections-v2.patch in the same evidence folder. It supersedes v1, which remains immutable. V2 preserves all eleven original proposals and adds the existing Summit camera assertion required by Claude's lower-ceiling answer. It retains the1e-6 precision and Open Road unchanged-camera guard. Independent artifact review CLEAR; SHA256 d3bd711dc14cec68baabe85a20be4d2f6f0d80822c41f85a24548d30bc97a2e9. Kyle's updated asynchronous request explicitly supersedes the earlier one. Neither version is applied.

Camera source and three positive physical tests are committed d80954bc, independently reviewed CLEAR. The accepted renderer/assets/signatures are exact, ordinary arch arithmetic unchanged. New source execution remains pending shared capacity; no canonical pass is claimed. Original307/331 stays red and retained. Triage has identified the causes and scope; no further investigation is needed while awaiting approval/verification.

## Claude answers - v2 patch review, 15 October 18:30

Reviewed proposed-state-test-corrections-v2.patch (SHA256 d3bd711d...a2e9).
It is v1 plus one change in test-circuit-summit.mjs: the existing Gallery
camera expectation now uses the lower of the flat roof and the visible arch,
exactly the 17:30 answer, at the same 1e-6 precision, with the Open Road
"camera unchanged" check kept. Approved as Claude's review. Codex's hold for
Kyle's own word is respected; the status stays as Codex set it. Claude's
earlier status change is withdrawn.


## Missing solo replay captured without changing old pins

Existing tools/test-replays.mjs --record ran in an ignored copy matching all1235tracked source files on425aacb3. Actual writer passed24cases at30/60/144FPS in46.598seconds. New Summit solo hash is e06505a8f7e9f6e0ced8a925c80353b7acb618be5ff8424073c4cb4b70806eb2 at all three cadences. All19existing replay JSON files match recomputed data and their actual source bytes stayed exact. Only the new challenge fixture is copied back; source commit/review follows. Receipt/log remain in this lane's evidence. This is capture evidence, not a canonical pass: original307/331 remains red and the rejected eleven-file v2 patch is still unapplied pending Kyle.


## Claude answers needed: two measured physical findings

The reviewed336a5e48 three-suite rerun passed camera2073checks in the unchanged scene, but shortcuts and tunnel detail remain red. No tolerance or renderer was changed. These are now source-proven findings, not further test-premise edits. Original gate307/331 remains red; Kyle's eleven-file v2 approval is still independently required. Keep waiting_on:kyle for that separate block.

1. Open Road scenery. The authored branch is offset18m to the left and has halfWidth6m:12mwide, not18mwide. The actual grounded Titan-sized lane-2.8 sweep meets rock-60 (seed1989, station10725.272529803233, offset-26.152646988630295, world2847.686221157984/584/5099.897542741844). Its near face intrudes into the legal branch corridor. Titan can climb this particular1.9021m rock, so this does not prove Titan stops; it still violates the intentionally clear road envelope. Authored scatter in src/track-script-course.js never reserves f.shortcuts; legacy scenery does. An early roadClear rejection would shift later random draws/placements. Proposed narrow fix: AFTER all original scatter and autumn colouring, before kit solids/bucketing, filter only natural scenery intruding into authored road corridors AND its matching colliders. Keep every proposal/RNGdraw/survivorobject/order/ID exact, no refill, no authored wall/kit removal. May Root re-slice that exact final-filter hook and its existing shortcut verification?

2. Gallery seam precision. The actual rendered tunnelSeam triangle2 is0.00027118077328985857m off the actual stored lining plane; unchanged limit is<0.00015m. Ray direction is normal to that face. At its world X3026/Z4592, Float32 spacings are0.000244140625/0.00048828125m. Lining stores its row endpoints first; detail interpolates unrounded endpoints then separately stores interior corners, so the mismatch is real. Your earlier accepted-scene-exact instruction prevents silently changing it. Proposed scope: repair only this authored Gallery's actual encoded detail corners in src/tunnel-detail.js buildTunnelWallDetails/wallPoint against the existing stored lining face; keep the lining/portals/kit and every ordinary tunnel byte-exact. If a shared actual-face accessor is essential, name only src/race-structures.js addTunnel as the companion hook before code. Do you authorize this tiny real detail-geometry correction and its reviewed affected-scene recapture? No test-point snap, substitute oracle or threshold increase is proposed.

If approved, unchanged physical guards must pass and actual differences must be reviewed before any Summit/Attack signature update; other course signatures and replay pins stay exact. No scene edit or signature capture has begun. Findings were bounded from18:24; source diagnosis is complete and no further investigation continues while awaiting your direction. Evidence: three-contracts-336a5e48.json and original positive-contracts-31838105.json in this retained lane's .evidence/2026-10-15/SUMMIT-SWITCH-ON.

## Claude answers - two physical findings, 15 October 18:40

1. **Open Road rock:** approved as proposed. After all original scatter and
   autumn colouring, and before kit solids and bucketing, drop natural
   scenery (and its matching colliders) that intrudes into an authored road
   corridor, using the same reservation legacy scenery uses for shortcuts.
   Every random draw, surviving object, order and ID stays exact; no refill;
   authored walls and kits untouched. Re-slice that final-filter hook and its
   existing shortcut verification.
2. **Gallery seam:** approved. Correct only this authored Gallery's encoded
   detail corners in `src/tunnel-detail.js` against the stored lining face;
   every ordinary tunnel, the lining, portals and kits byte-exact. Use
   `src/race-structures.js` addTunnel as a companion hook only if a shared
   face accessor is essential. Claude approves the resulting Summit scene
   recapture in advance; record old and new rows.
The v2 test patch still waits for Kyle's word, as Codex set it.


## Director re-slice after Claude physical approvals

Claude c150e044 authorizes the two bounded repairs. The scenery worker owns only src/track-script-course.js final post-scatter natural-placement filter and tools/test-shortcuts.mjs positive coverage. It keeps every random draw, survivor identity/order/ID and ordinary-course placement exact; no refill or authored-kit removal. The Gallery worker owns only src/tunnel-detail.js encoded Gallery corners and tools/test-tunnel-detail.mjs positive coverage; src/race-structures.js addTunnel is permitted only for an essential actual stored-face accessor. Lining, portals, kits and ordinary tunnels remain exact, and the existing0.15mm guard is unchanged. Workers share the retained lane, never edit each other's files, and run no heavy checks until Root admits them. Root owns review, change note, actual affected-picture comparison and later signature capture. No signature lock is claimed while Ardennes holds it. The eleven rejected files remain unapplied, waiting_on:kyle stays.


## Approved physical source ready

Retained lane ecee3e81108f5e16a5ccf6306deb6b2c785e0d50 contains only the two named physical source repairs, their positive existing-suite coverage and the consolidated change note. Independent Gallery and scenery reviews CLEAR; syntax checks pass. Actual unchanged mesh/vehicle suites await global capacity; no pass, picture, signature or merge claimed. Source helper no-ops on all current non-Summit courses. Kyle's eleven-file v2 patch stays unapplied. Old answered inbox requests were folded here and into EARN-CAR-2/its current review rather than left as stale holds.


## Physical repair verification green; actual scene inspection next

Exact ecee3e81108f5e16a5ccf6306deb6b2c785e0d50 stayed clean before/after the existing two-suite/jobs2 run:2/2pass,0unrun,89.964seconds. Shortcuts:93generated branches over63circuits and18authored branches,2,822,175clear obstacle sweeps, minimum3D saving3.09percent/maxslope.617; all original guards remain. Tunnel detail:224224checks/19072triangles/6fixtures, maximum actual stored-wall gap0.094mm below unchanged0.15mm. Minimum projected Gallery detail4.980728242753716m stays outside occupied4.8m half-envelope; lining/roof/input guards pass.

The announced brief physical turn is consumed and its manual STARTING notice cleared immediately. Root next uses the unchanged existing summit-run native recipe on this same frozen source for actual High/Performance scene inspection, under ordinary cap3. This physical regression check reuses the recipe, not another art design round. Its ignored folder will be physical-views-ecee3e81; source/saves/readiness/error guards remain. Only after inspecting the affected scene may Summit/Attack rows be recaptured, with every other scene exact. No such capture, canonical pass, merge or Kyle patch approval is implied.


Actual physical scene inspection on the same clean ecee3e81 passed19views/zeroissueswarnings/private10393/memory-only in60.398seconds;377208-byte ignored sheet. Root viewed it and the accepted original SUMMIT-FINAL sheet: no broad appearance change is visible; the submillimetre seam correction and specific far rock removal are not claimed as visually resolved by these broad views. Strict physical tests provide their direct evidence. Claude c150e044 already authorized bounded affected-row recapture; actual capture/strict foreign-row comparison remain pending the new Ardennes release hold. No scene signature was regenerated. Kyle's eleven-file v2 patch remains unapplied.

## Kyle approved the test patch, 15 October 20:20 PT

Kyle, in the Claude Director chat, answering "Summit's switch-on needs your
word on its test changes (I've reviewed them; nothing is loosened). Approve,
so Codex can apply them tonight?": **"Approve."** This is Kyle's explicit
approval of proposed-state-test-corrections-v2.patch (SHA256 d3bd711d...a2e9)
as Claude reviewed it. Apply it as written, with the approved rock filter and
Gallery seam fixes, run the lane tier and build, and merge. waiting_on is
cleared.

## Overnight continuation after Kyle approval

Root resumes the existing clean ecee3e81 lane under Kyle's overnight instruction. The original card-answer chat left it ready; Root now holds busy-game-files, circuit-registry and world-signatures for this switch-on. Claude remains RELEASE-SUMMIT Release Manager. Apply the exact approved v2 artifact first, then sync integration. Preserve the newer reviewed Ardennes historical-prefix and dynamic manifest-order assertions when resolving their overlapping test hunks; add Summit's precise on/parent-owned expectations without replacing those assertions with stale lists. One independent review covers that union. Existing physical checks and 19-view inspection remain valid; do not repeat them. Only Summit/Attack scene rows may change after actual capture, with all foreign rows exact. No live install, release waiver or completed gate is implied.
## Approved patch applied; independent union review clear

Root applied the exact Kyle-approved v2 artifact in cd96cb33, then merged integration8529c466 into the retained lane as6ba450ab. Four overlapping test hunks keep the newer reviewed Ardennes admission cases, historical catalogs, Panorama index19 and dynamic manifest order. Paid-course isolation includes every actual released positive-price course, including Ardennes; free Attack remains strictly parent-owned. Existing independent reviewer returned CLEAR on6ba450ab, with old prices/wallet/save/access guards unchanged. No extra runtime change was made in this continuation.

Actual affected-scene capture, final canonical lane/jobs4 and build remain UNRUN on this union. Original failed packets and the ecee physical/19-view passes remain exact and are not repeated. Root has launched no heavy job: fresh shared inventory remains at or above3 outermost jobs despite the20:52 reserved next turn. Honor FACTORY8; start the existing --capture only below3/no hold, recheck after one minute, compare every foreign scene exactly, then update only Summit/Attack rows. Do not treat a pending capture, review or metadata head as a gate pass. Team Room remains Claude-owned; its already-running b7 canonical must not be duplicated. Claude retains Summit release checks/install/push.
## Current repaired scene receipt and final review

Actual6ba450ab capture finished65.8896s/exit0, all23enabled scenes once and21foreign signatures exact. Only Summit/Attack now share7a5a6a1c4dd0aecd2b6afd10a9b887541e6fb936471cb5dc9b02d093ebff9132 (666nodes/641meshes/21121instances; other counts exact). Source/fixtures committed clean92f80264; independent final delta reviewCLEAR. Wrapper37440/exec93020 drained. Final canonical lane/jobs4 and production build are still pending capacity; no second physical/photo/capture run or full tier is authorized by this note. busy-game-files remains released; only current named registry/signature ownership remains. Kyle explicitly directs other ready code work while checks wait.
## Actual final canonical green

Final92f80264 canonical finished2026-10-16T04:58:08.487Z:343/343/jobs4/exit0/zero failures or notRun, duration1666743.7509ms; source unchanged and clean. This includes the required test-circuits execution; do not repeat it manually. Actual lane receipt is .evidence/2026-10-15/SUMMIT-SWITCH-ON/final-92f80264/lane-receipt.json in the retained lane. Wrapper13692/exec78758 drained. One production build remains before green merge; required independent source/fixture review is already CLEAR. Later Stavelot integration changes are foreign source and must be preserved by the merge. Claude retains RELEASE-SUMMIT; no release or current frame pass is claimed.

Production build on exact clean92f80264 also passed1329.043ms (final-92f80264/build-receipt.json and build.log). Source/fixtures review CLEAR. Root now hands this green lane to integration; no repeat physical/native/signature/canonical check, release or timing waiver. The subsequent release remains Claude-owned and needs its applicable green checks.
