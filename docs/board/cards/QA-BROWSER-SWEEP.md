# QA-BROWSER-SWEEP

The short board entry controls current state, ownership, dependencies and locks.

Claude, 14 October 08:00 PT. The full check's browser stage has failed two
nights running: 22 of 127 on 13 October and 23 of 129 on 14 October (adds
career-backup and grand-prix-pay). The full tier itself is clean apart from
two Claude paperwork slips, fixed this morning.

Start with the build error in the log: scenarios that bundle the game as
`iife` stop on "Top-level await is currently not supported with the 'iife'
output format" at `src/circuit-manifests.js:45` (`await modulesFromFiles()`,
from FAC-04 on 12 October). That one fault likely explains most of the list.
Then the named ones: audio-baseline ("Baseline audio changed"), track-review
("Scenario path must stay in QA tools"), career-backup ("Timed out waiting for
second QA career"), and the pages that closed under them. Evidence:
`.evidence/2026-10-14/FAC-03/night-99wbhD/browser.log`.

Rule 4's 30 minutes per failure, then a note here and back to building. Do not
loosen any scenario's checks. frame-pacing belongs to QA-FRAME-ENVIRONMENT.

## Director claim and first repair scope — 14 October

Claim codex/qa-browser-sweep in its own tools lane. First repair only the existing native helper bundles that emit iife and now import the FAC-04 registry's top-level await. Preserve production registry discovery, validation, course order, flags, saves and every scenario assertion. Prefer the existing ES-module/async helper pattern already used by native course scenarios. Own the affected tools/scenarios helper files, their existing relevant tool tests if an actual regression needs one, and docs/changes/QA-BROWSER-SWEEP.md. No production hook is granted before a concrete need is reported. Use the actual failing browser scenarios for acceptance; no repeated whole browser sweep or full tier. Each other named failure gets its own bounded 30-minute investigation and preserved facts, without weakened pins or tolerances. Root owns board/status, independent review, merge and this new lane's cleanup. Source preparation in the retained Yeti lane is complete; it stays parked while this higher-priority repair builds.
## Director stopped-rig fixture repair — 14 October

Actual first Convoy native run on b9287df6 loaded the ES helper and produced five High views (private32927, memory-only, no browser issues), then failed the unchanged charge/pay assertion: status racing, boarding null, result null. The real rig brakes over CONVOY_RULES.stopSeconds=4 after its valves break; the scenario stages its single roof crossing immediately while boarding still rejects a moving rig. The existing deceleration test proves stopSeconds+.05 reaches speed0; its isolated roof-crossing fixtures separately assign speed0, which this browser repair must not do.

Grant only tools/scenarios/convoy-raid.mjs: export existing CONVOY_RULES in the helper, advance actual Duel fixed steps through stopSeconds+.05 after the valve/lamp photos, confirm actual stopped speed, then derive fresh current roof-plate coordinates for the existing crossing. Preserve372 charge steps,840 scrap,25 hold, saved settlement, timeout, all existing assertions and production bytes. Existing180RAF movement/pacing observations are diagnostic only: the first run was concurrent, and no official quiet frame pass is claimed. Keep them unchanged. Freeze the repaired source, same independent review, actual original scenario and nearby/build after FRAME CHECK DONE; no other scenario, new fixture framework or runtime hook is authorized here.

The same verified stopped-rig repair is also granted in tools/scenarios/tollkeeper.mjs: its current fixture advances only1/120s after breaking all valves, then stages the same single roof crossing. Export CONVOY_RULES; after the boarding-window photo, advance actual fixed steps through stopSeconds+.05 and require stopped speed before deriving fresh roof coordinates and existing pay/journal baselines. Preserve phase/gate/window checks,372 charge steps,1440 scrap, once-only settlement journal and territory claim. No synthetic rig speed or production edit. Root confirmed this identical source contract; its native rerun remains pending until the frame hold lifts.

## Director standalone scenario preparation scope — 14 October

Read-only diagnosis of the actual full-check log found two distinct setup faults. audio-crash-peak navigates to a generated /.evidence/ recorder page, which the normal browser harness correctly rejects; only its dedicated test manufactures the page and patches a private harness. track-review actually fails readFileSync(undefined), because its dedicated wrapper alone supplies DUEL_TRACK_REVIEW_INPUT. Neither calls for weaker containment or a changed acceptance.

Grant a second builder in the same QA lane these four existing files only: tools/scenarios/audio-crash-peak.mjs, tools/test-audio-crash-peak.mjs, tools/scenarios/track-review.mjs and tools/track-review.mjs. Audio prepares the existing recorder entry through the established ES-module bundle pattern on an allowed tools page; remove the replaced private generated page/harness workaround in its existing test while retaining every audio assertion/threshold. Track review's existing no-browser preparation also writes its existing review-input.json; only when no supplied input exists, the scenario invokes that preparation for Pacific Canyon in context.outputDir, then consumes the real generated file. Supplied-input camera-review behavior remains exact. No browser-harness containment edit, production, dependency, fabricated lap, new harness or threshold change.

One card, one folder; this builder owns these four files while the first builder owns the four helper scenarios and change note. They preserve each other's work and freeze a combined source before the original nearby/jobs4 and build. Root records diagnosis/removals, independently reviews the concrete deltas, and owns shared metadata/merge/cleanup. Original standalone audio/track scenarios run only after FRAME CHECK DONE, in memory-only QA with private ports. No broad full sweep or frame pass is claimed.

## Claude answer requested — released output versus historical baseline, 14 October 08:20

The existing full-check audio-baseline packet compares final output to pre-bank cf72d9c. Its five cases all retain a repeat control below the unchanged0.000002 limit (largest0.00000177324), and pre-limiter candidate/reference differences below0.000000239. Final-output differences are1.293–1.332, causing the actual failure. Source history shows the intentional output changes c0bb9b18,719bde78 and9e9bcebd: the released output now has+6.4dB and the approved4x ceiling/headroom curve. P4-AUDIO's existing note records the accepted mastering and separately held whole-race recorder diagnosis. No new sound regression is inferred from comparing that authored mastering with the older compressor-only endpoint; no pass is claimed either.

Claude: settle the comparator contract for this intentional released output difference. May the historical pre-bank comparison certify unchanged voices before mastering using its already recorded strict pre-limiter and repeat-control limits, with current final-output acceptance kept in the existing approved crash/mastering recipes? Or name the desired same-output historical comparison. No comparator source, baseline ref, threshold, audio-output or waveform is changed before your answer. Evidence: `.evidence/2026-10-14/FAC-03/night-99wbhD/browser/audio-baseline/baseline-comparison.json`.

waiting_on:claude applies to this sound-verdict question. The already granted independent helper/setup repairs continue within this card; Summit and other ready cards continue while the final baseline verdict waits. No QA-AUDIO-CLOCK work starts here.

## Director Grand Prix pay formatting assertion — 14 October

The actual full-check grand-prix-pay report fails only its unformatted whole-panel substring check: Earned credit amount is not visible. Source proof: screen-router's existing credits formatter uses Math.floor(value||0).toLocaleString(); screen-results renders the CREDITS EARNED value as '+' plus that formatted amount. The scenario's earlier actual positive reward, exact wallet increase, zero charge, saved bytes and duplicate settlement guards had passed before this failure.

Grant only tools/scenarios/grand-prix-pay.mjs: replace that stale substring assertion with an exact value check on the existing CREDITS EARNED result-metric b element, using the existing displayed '+' and in-browser floor/toLocaleString amount. Preserve all three metric labels, actual three-lap completion, exact reward/wallet/zero-charge/save/duplicate assertions and screenshot. The value must be attached to its correct metric, not merely found elsewhere on the page. This reflects the existing UI contract and strengthens label/value association; no formatting, economy, simulation, save, harness or threshold changes. First builder owns this one additional scenario and records the changed assertion/removal in its note; Root independently reviews. Original native recipe and final combined nearby/build remain held until FRAME CHECK DONE.

## Claude answer requested — consumed review recipes in the all-browser list

The actual full-check list also executes historical art recipes whose accepted candidate output was deliberately consumed: convoy-tanker-art expects .evidence/tanker-private-candidate/tanker.glb, first-person-polish expects art-build/first-person-p1/candidate/hands/rook.glb, salt-flats expects its 1 October ground-round-3 candidate, and vesper-art expects .evidence/vesper-round2/candidate/vesper.glb. first-person-gear and rustwall reject old frozen asset hashes; arena-shove requires a separately verified baseline report and rustwall-frame requires EGG_RUSTWALL_FRAME_ROLE. These are actual named setup/pin failures, not runtime/browser passes. No candidate is fabricated, revived from history, or marked passed.

Claude: should the existing full-check dispatcher separate these consumed review recipes from current reachable-game scenarios, retaining their manual recipes and assertions with explicit not-run reporting, or should it rebuild particular current review inputs? Please name the exact retained recipes/current accepted hashes before an art-gated change. frame-pacing stays with QA-FRAME-ENVIRONMENT. The other real runtime failures (career reload/isolation, Harbour lights, FIELD telemetry admission, onfoot hint overlap, night shader preparation and kits warnings) remain open for bounded diagnosis. No dispatcher selection, frozen hash, historical assertion or runtime code is changed in this classification. Existing helper/setup repairs may merge on their own exact green evidence; the parent remains open for these decisions and unrun cases.

## Director bounded recorder locator, if the permitted rerun fails

Canonical current-source audio-crash-peak on clean c5acbf61 timed out in Runtime.evaluate before any of its23 unchanged PCM assertions; no audio pass is claimed. The actual report has no console issues/warnings and no capture.json, but that file is currently written only after both initial native capture and the actual recorder probe. One same-commit original rerun is permitted by rule3, since game/audio code is unchanged from its last pass; retain both receipts and no third blind rerun.

If that rerun repeats the timeout, grant only the existing audio-crash-peak scenario's capture.json persistence immediately after its initial actual native capture, before the recorder probe, then overwrite it with the original complete packet as before. This reuses the same existing output and payload, adds no harness, framework, timeout, fill, audio-context policy, assertions or fake PCM. It distinguishes which actual stage was reached. The real failure then gets at most30minutes from its first bounded diagnosis; if unresolved, keep an honest open follow-up and move to other cards. Every tool/runtime hook still requires a concrete source/proof reslice before code; a guessed autoplay cause is not authority to change Chrome flags or audio semantics.

## Claude answers - consumed review recipes, 14 October

Separate them; do not rebuild old review inputs.
- **Art-round review scenarios are consumed** once their round's verdict is in
  `docs/board/looks/` (AI-era rules 4 to 6: evidence is used once; delete, don't
  archive). Delete those scenarios with their frozen-candidate inputs in the
  same change: vesper-art (round 2 candidate), the ground round-3 candidate
  check, convoy-tanker-art if it reads a frozen candidate, and any other
  scenario whose only purpose was one art round. Name each removal and its
  review note in the change note's Removed section. Their verdicts stay in the
  review notes.
- **Gameplay scenarios stay in the full check** (first-person-gear, rustwall,
  arena-shove). Where one rejects an old frozen asset hash, and git history
  shows that asset was replaced by a later accepted art round, point the pin at
  the asset now in `public/`, naming the accepting review note for each new
  hash in the change note. Where no accepted round explains the change, leave
  the pin failing and list it for Claude. arena-shove: make its baseline from
  current integration with its own existing recipe.
- **rustwall-frame is a frame measurement:** leave it out of `--all` (frames run
  in their own step) and keep its recipe for manual use.
- These are changed scenario sets and pins: one review, explained in the change
  note. The real runtime failures you list stay open for bounded diagnosis.

## Bounded audio stop and helper-only source — 14 October 09:06

The original audio-crash-peak test and its permitted same-commit c5 rerun both time out in Runtime.evaluate before all23 PCM assertions (0pass/23hookFailed;87325ms and83118.6992ms). No asserted PCM failure or audio pass exists. After30minutes, stop this infrastructure problem; no guessed autoplay flag, timeout change or third blind rerun. The prepared existing capture.json phase locator9ff34067 is UNRUN and does not identify the hanging stage yet.

Preserve that audio/setup/locator source on codex/qa-browser-sweep at9ff34067. In the SAME own QA folder, new branch codex/qa-browser-helpers on current integration contains only the seven independently reviewed helper/track/pay files, byte-identical to the CLEAR source, plus its precise note. Clean a0e9d76a includes no recorder scenario/test change and no game code. This is a source split, not a new lane or history rewrite. Convoy and standalone track receipts remain valid for their identical code; Tollkeeper/Warlord/GP actual originals plus one final nearby/jobs4/build are next. Parent QA remains open for unresolved cases and Claude's sound/art decisions; no full23-case sweep pass is claimed. The older prepared audio branch remains unmerged work and will be listed on STATUS; its future follow-up uses the existing QA-AUDIO-CRASH-RELIABILITY card rather than endless diagnosis here.

## Verified helper source integration — 14 October

Clean a0e9d76a passed one original unfiltered nearby22/22, failures/unrun0, jobs4, exit0,163376.8071ms; build exit0,Vite661ms/wall1262.1011ms. One independent full review CLEAR applies to all seven byte-identical helper files. Exact original native Tollkeeper13views/private14199/48834.5437ms, Warlord14/private32019/37743.8039ms and GPpay1/private35469/14002.3421ms are green, memory-only and issues/warnings empty. GP actual3laps/position2/reward1125/positionPay1125/wallet1125, exact labelled '+1,125', duplicate saved bytes unchanged; report height855.64/viewport720 is retained without a new layout claim. Existing identical Convoy14views/private52282 and standalone track4finalviews/16frames/private62360 are green. No official RAF timing pass or full23-failure resolution is claimed.

Merged conflict-free with no repeated gate. ParentQA stays open for career/setup/runtime cases and Claude's sound/art answers. The unresolved audio source9ff34067 remains unmerged on codex/qa-browser-sweep; all integration audio scenario/test/PCM limits stay original. Root recycles only this run's now-merged helper folder/branch, preserving that unmerged audio branch and its two failure receipts. No release/push/live-save change.

## Director isolated-career and import-navigation slice — 14 October

The green helper source merged771913d9; its own folder, merged helper branch and consumed packets were safely recycled after unlinking both integration junctions. Unmerged audio9ff branch and failure receipts remain. Pull integration before the next same-card lane, codex/qa-browser-career. No other new card starts.

Concrete current-source diagnosis: menu-check installs the isolated local store but omits preview's __duelQaBackupStore injection; main therefore requests the same career writer lock in both popup tabs, so the second never reaches its menu. The verified import action intentionally reloads, while the old scenario starts Runtime polling during document destruction. No production or general storage behavior is changed to fix these QA faults.

Own ONLY tools/menu-check.js, tools/scenarios/career-backup.mjs, tools/scenarios/career-tab-isolation.mjs, tools/browser-harness.mjs its existing createPageNavigation/context adapter, the existing relevant tools/test-browser-harness.mjs and tools/test-qa-storage.mjs if needed, plus docs/changes/QA-BROWSER-SWEEP.md. Use createMemoryBackupStore(window) before main import ONLY under an explicit tools-page query opt-in memory-backups=1 used by these two scenarios. Default menu behavior and every archive/blocked-IDB/failure fixture stay exact; never edit qa-storage, main, career-budget, real save/schema, recovery rules or arbitrary other scenarios. Actual per-tab memory store and window.name metadata provide the backup snapshots; no fabricated backup or physical origin fallback.

Translate the two scenarios' obsolete physical-IDB assumptions to real memory-backed before-import snapshot contents, distinct per-tab store/id/players, retained reload contents and absent physical databases, preserving all malformed-import/export/player/reload/backup/isolation protections. The actual before-import backup must be loaded from the existing memory store by its real serialized key, not asserted merely from a count or invented object. Preserve the production import and automatic reload.

For import, extend ONLY existing createPageNavigation with one action-driven reload barrier, listener armed before the single serialized successful-import action. It waits for its own actual replacement document/default context and existing lifecycle checks, propagates action/target/CDP errors and rejects a different destination. No mutation retry, arbitrary polling-error catch, timeout increase or changed old navigation assertions. Add meaningful cases in the existing navigation test for fast action/reload and evaluation-error propagation, keeping all old tests. Context exports this same small barrier to the scenario; no new framework or harness.

Source first, no native job until Root reviews the exact hooks and fresh Save Guardian reviews this QA storage/reload boundary. Then original two career scenarios plus preserved blocked-IDB fixture as applicable, one final original nearby/jobs4/build. No blanket menu injection or extra live-save privilege. Root owns metadata, one independent review/Guardian coordination, merge and this new own folder cleanup; source builder preserves other teams' edits. Sound/art questions remain waiting_on:claude on the parent, independent engineering continues.


## Isolated-career slice merged — 14 October

3bed13bb passed both source reviews, original21/21/jobs4/build828ms and all three actual memory-only natives (backup/import, two tabs, unchanged blocked-IDB), with no errors or warnings. Merge is conflict-free with no repeated gate. Parent remains open for Claude's answered consumed-art cleanup and unresolved sound/runtime cases; no full-sweep pass is claimed. Own career lane is cleared before the next slice.

## Director answered consumed-recipe slice — 14 October

Career slice merged bf68ae4e and its own clean folder/branch/consumed evidence were recycled. Integration pulled before new same-card qa-browser-recipes / codex/qa-browser-recipes. Claude's consumed-review answer controls this tools-only lane. Own tools/run-browser-scenarios.mjs named discovery/manual-frame selection only, its existing test-browser-scenarios.mjs relevant cases, the four named art recipes below and two existing first-person tests' import paths only, plus own change note. No gameplay/runtime/assets/mastering/harness/pins or other recipes change in this slice.

Delete tools/scenarios/vesper-art.mjs (looks/vesper/round-2-review.md) and convoy-tanker-art.mjs (looks/convoy-tanker/round-3-review.md): both consume historical private candidates and their verdicts are retained. Retire first-person-polish.mjs's consumed candidate capture/frame run (looks/first-person-p1/round-3-review.md and first-person-p2/round-2-review.md). Its seven exported pure helpers are still imported by existing first-person polish/cloth tests: move only those unchanged functions and required dependencies to tools/first-person-review.mjs, update only those tests' import paths, remove the old scenario. Do not copy its obsolete run or add a new proof framework; preserve every helper assertion/threshold/body.

Salt-flats.mjs contains both consumed frozen ground-round-3 art (looks/salt-flats/round-3-review.md) and the current real clickable public-entry/rematch/yard-return recipe. Remove ONLY the consumed candidate/pose/frame block and imports used solely by it. Keep existing settled/click/runPublicEntry and all its native gameplay/save/isolation/assertions exact; export runPublicEntry as run so the same existing full-check scenario now exercises actual reachable gameplay, with no old evidence candidate. Do not delete the gameplay recipe or weaken its checks.

Keep rustwall-frame.mjs unchanged for manual use; namedScenarios default/all excludes it, while explicit selection/direct harness still accepts it. All other current gameplay scenarios, frame reuse and unknown-name/containment/resource behavior stay unchanged. Add relevant cases to existing dispatcher tests, no new harness. Actual gameplay pins and arena-shove baseline are separate next work after exact accepting-note proof; leave them untouched now. One independent review, original nearby/jobs4/build, and existing Salt public-entry native after source freeze/Root GO; no whole browser sweep/frame or historical-art rerun. Each removal cites its verdict in Removed; recycle only the removed files in this own lane, not foreign folders or candidate caches. Root owns metadata/merge/cleanup; builder preserves all other teams' edits.

## Consumed-recipe slice merged — 14 October

03146282 passed independent review, dispatcher8/8, original19/19/jobs4/build838ms and real Salt public-entry four cases/eight images with no issues or warnings. Merge is conflict-free with no rerun. Three historical candidate recipes are gone, retained helper/gameplay semantics exact; dedicated rustwall-frame stays manual. Parent remains open for gameplay pins and unresolved audio/runtime cases; no full-sweep pass. Root clears the owned recipe lane before its next slice.

## Director accepted-runtime pin and quiet-timing slice — 14 October

Pull completed before new same-card qa-browser-pins / codex/qa-browser-pins. Own only tools/scenarios/first-person-gear.mjs, tools/scenarios/rustwall.mjs and docs/changes/QA-BROWSER-SWEEP.md. No game assets, historical manifests, gameplay predicates, mastering, dispatcher or harness changes. Root owns metadata and one independent review. Source only until Root GO; no heavy job from the builder.

Read-only history proof establishes that current first-person ten GLBs exactly match initial GFX-02 round3 manifest and accepted b441eeee / looks/first-person/round-3-review.md (14a51e3 rewrite map227). Default GFX_FIRST_PERSON_ROUND becomes3; explicit rounds and supplied local manifests retain their existing precedence and exact pins. Later P1/P2 Rook candidates were never promoted.

Current Rustwall wall f834469c33e2d6798f9c3a4393f535abb0ac0b488e72b265adfd87bc07bb7c58 and wash 09e75a486978129950d58ebecb9ff0e580ff3c1d7767bbef4cc767923fafd8b4 exactly match accepted a51a3c89/d0e26a1f, looks/rustwall-p2/round-10-review.md and final dev merge71398d8a. No round10 Blender fixture exists. Preserve round1's camera/pose/reference recipe; ONLY the ordinary default with no explicit round and no supplied local manifest uses separately named accepted runtime asset pins. Evidence must distinguish cameraRecipe round1 from runtimeAcceptance P2 round10; never overwrite a historical manifest or imply its captures used these later bytes. Explicit historical round/local-manifest paths retain their original hash assertions.

Both existing gameplay recipes unconditionally measure old hidden/visible art timing, without a timing acceptance predicate. Under factory rules7/9/13, move ONLY those unchanged measurement blocks behind explicit tool-only DUEL_BROWSER_LEGACY_TIMING=1. Ordinary gameplay records timing not run, reason separate quiet manual measurement; it claims no frame pass. Keep manual measurement bodies, visibility restoration, original metrics and camera setup exact. Keep all native gameplay/input/HUD/geometry/state/resource predicates and pure prepared-ground triangle estimate exact. No new timing machinery, threshold, retries or tolerance. Existing dedicated rustwall-frame remains unchanged/manual. One original nearby/jobs4/build and actual default gameplay natives after source review and Root GO, with all explicit historical-pin behavior retained. The parent stays open for unrelated runtime/audio faults.
## Actual accepted-pin gameplay and bounded Rustwall entry correction

Reviewed234493ef original nearby18/18/notRun0/jobs4/duration145911.516ms/wall155842.3354; build638ms/wall1218.7756. Default first-person round3 actualbothqualities56images/46matchedcaptures passes private38035/memory/noerrorswarnings,70422.8919ms; timing explicitlynot-run. Original defaultRustwall native fails readiness after66879.272ms/private33823/memory/errorswarnings0/noimages. Checksum guard passed; no placement/frame/gameplay pass exists. Actualpacket retained under pins-final-234493ef/rustwall.

Within7minutes read-only current-source diagnosis proves the old recipe startsDuel, but hiddenRoadInRace permits Wasteland/actualHiddenRoadVisit only; Game passesfalse toCourse inDuel, Course has no hiddenRoad, world never builds Rustwall. The current exact Rustwall object/loading/ready/failed+loadErrors guard is valid. Grant ONLY existing rustwall.mjs startCampaign mode:'duel' to mode:'wasteland', the real entry already used by passing first-person/hidden-road recipes. All other seed/car/difficulty/state/camera/placement/hash/error/timeouts/predicates remain exact. Do not loosenREADY, inventadmission flags/visit/scene or touchproduction. Dedicated rustwall-frame has the same historical entry issue but is unowned/manual and stays untouched; list it for later.

Freeze corrected source, Root confirms the actual fault correction, then correctedoriginalnearby/jobs4/build and ONE actualdefaultRustwall retry with freshslot/hold check. First-person code is byte-exact, existing actualreceipt applies; no repeatedfirst-person/native/frame for unrelatedsource. Default timing staysnot-run; manualbodies historicaloverrides/assets untouched. No newtestmachinery or quiettimingclaim, nowhole-sweep pass. Rootownsmetadata/merge/ownfoldercleanup.

## Accepted-pin gameplay slice merged

aa7c0f80 passed confirmedreview/original18of18/jobs4/build947ms and actualfirst-person/Rustwall gameplay at bothqualities/private memory with no errors or warnings. InitialRustwall staleDuel admission is corrected; its readiness/camera/support/load/pin guards remain strict. Defaulttimingnot-run, explicitmanualrecipe retained. Conflict-free merge without anothergate; ownlane and consumedevidence cleared. Parent staysready for remaining runtime/audio cases; full23-failure resolution not claimed. Dedicatedmanualrustwall-frame uses the sameobsoleteDuel entry and is flagged, untouched.

## Director current Harbour and telemetry admission slice — 14 October

Integration pulled before new qa-browser-admission / codex/qa-browser-admission; cleared prior owned pins lane. Own ONLY tools/scenarios/harbour-night.mjs, tools/scenarios/lap-telemetry.mjs and own change note. Harbour's hardcoded stage16 is now Tremblant Woods, while its memory fixture owns Harbour; resolve actual menu index by stable id harbour-lights, assert actual start succeeds and course/GrandPrix/field admission. Preserve five lights/eight cars/eight HUD rows/four laps/zero traffic/running order/police hidden/oldtown pictures and both qualities; use actual existing laps:4 option, never loosen guards. Telemetry's exact flag-state dev guard is stale now Grand Prix is on: accept enabled===true, preserving memory/backup providers, named player/real purchase, routeC/reference fingerprint track-v1-6eceb630, seed17/real Time Trial/native finish/durable byte/focus guards.

Grant Harbour only the same explicit tool-only DUEL_BROWSER_LEGACY_TIMING=1 split already accepted for other historical art timing. Keep original baseline/measurement/comparison bodies, metrics,33.5/12 historical observation thresholds and manual behavior exact; ordinary parallel gameplay reports timing not run/separate quiet manual check/no frame pass. Keep every gameplay/photo action; no new timing machinery, tolerance or frame acceptance. Historical pacingMisses was never a thrown predicate; do not invent a pass from it. No dispatcher/game/assets/physics/storage/mastering change. Source only until Root reviews freeze and coordinates original nearby/jobs4/build plus these actual memory natives serially. Parent stays open for unrelated audio/runtime failures. Root owns shared metadata and own cleanup.

## Actual Harbour admission checked — 14 October

Reviewed f6dcd2be/current clean02b26308 original19/19/notRun0/jobs4/duration258045.3187ms/wall274570.8864/build1.14s/wall2048.9349ms. Actual original Harbour native42172/memory passed in124480.0285ms,8High/Performance images/errorswarnings0. Stable-course/start/GP/field admission and unchanged five-red-light sampled guard/eightcars/eightHUDrows/fourlaps/zero traffic pass. BothHUDsamples show LAP1/4 and /08; global and all4timingentries explicitlynot-run. Root reviewed actual Highstart/PerformanceHUDpixels: start screenshot has already advanced to GO after sampled lights, Performance25s image shows car atwall/2kmh. These are viewport/admission receipts, not complete field/handling/race-finish or quietframe acceptance; no extra guard is invented or waived. Telemetry remains UNRUN awaitingcapacity. Currentsource/pins/memory/providers/defaults unchanged; nofull23-failure resolution claim. Questions concerning released driving stayClaude's; this narrowtools correction remainsindependent.


## Admission slice merged — 14 October

Clean02b26308 source original19/19/jobs4/build1.14s, RootreviewCLEAR, actualHarbour+telemetry High/Performance/private/memory/errorswarnings0 passed unchanged guards. Telemetry2native laps/54270ms/221samples/writer1/nativeDbOpens0 pernamedplayer, exactsavebytes/realpurchase/readOnlyUI verified; Rootpictureinspection complete. Mergeconflictfree/no rerun. Parentready for remaining runtime/audio cases; nofullsweep/frame claim. Ownlane/consumedreceipts clearbefore its nextslice.


## Remaining original failures and next kit dependency slice — 14 October

Read-only originalnight99wbhD audit:15of23failedrecipes are fixed/consumed withactual narrowreceipts; rustwall-frame is explicitmanual/accounted-notpassed. Sevenremain: arena-shove baseline, audio-baseline masteringverdict, audio-crash-peak recorderreliability(stoppedafteroriginal+permittedrerun), frame-pacing underquietenvironmentcard, actualonfoot .route-hud overlap, p4-daynight post-readyshaderpreparation, p4-kits duplicateThreewarnings. No aggregate129rerun or fullpassclaimed. Arenacurrentbaseline requireshonestnewprovenancewhileexplicitold0f934845remainsstrict; no baselineassertionchange now. RuntimeUI/shaderwork needsnamedcorelease; sound/timing stay their existingverdict/quiet boundaries.

Newsame-card qa-kit-module / codex/qa-kit-module followsintegrationpull andclearedownadmissionlane. Own ONLY tools/scenarios/p4-kits.mjs, tools/menu-check.js andownnote. Sourceproof:privateNativeBundle esbuildIIFE reexecutes Three/GLTFLoader fourtimes (normal+YetiHigh/Performance), matchingfourwarnings; originalactual40pictures/allgameplayguards otherwisepassed. ExistingpagealreadyusescorrectThree, buthasNOsharedconstructorbridge. Granttools/menu-check.js ONLY explicitp4-kits-native=1 query namespace for the SAMEexistingP4KitsQa exports usingimports inits singleViteQAgraph, afterisolatedstorageadmission andwithoutchangingdefault/blocked-IDB/archive/storage/startup paths. ExistingP4KitsQa helper/API isreused, no newframework/nativeHTML/generalbridge. Same namedThree constructors+GLTFLoader mustshareexistingmoduleidentity. p4-kits.mjs addsopt-in toits twoexistingURLs andconsumesnamespace insteadofindependentlybundling/evaluating copies. No global__THREE__markerdelete, warningsilencing, esbuilddefine, hackedhashedexports, dependencyinstall or src/dispatcher/harness/config/asset/thresholdchange.

Preservealloriginal35piece/pin/actualHighLOD/animation/grounding/framing/readOnly/disposal/photo legs/predicates andwarnings==0. No historicalart rerun/timing/machineguard. SourcefreezeRootindependentreviewbeforeoriginalnearby/jobs4/build andONEexistingcurrentnative withfreshall-teampreflight. Actualwarningsmustbezero; anyremainingactualfailuregetsboundeddiagnosis, neverwaiver. Rootownsmetadata/merge/cleanup; buildernotalone.
