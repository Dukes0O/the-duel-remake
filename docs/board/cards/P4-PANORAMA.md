# P4-PANORAMA

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: P4-PANORAMA
    title: "Panorama Ridge: the mountain circuit"
    owner: codex
    lane: RACE
    size: L
    needs: [P4-TRACK-SCRIPT, P4-FIELD, P4-ART-SRC, P4-DAYNIGHT]
    status: building
    overnight_block: 'Frozen third 90-race attempt has six target failures and player finishes 30/28/29; no further 90. Claude pit fix passes focused 46/46 on accepted-pay ancestry 0a50336d. Native retry now finishes one lap, then crawls outside the Mountain Straight right wall after Hell Gate. Exact crossing remains uncertain. Diagnosis stopped after nine minutes; bounded fix and final art acceptance wait for Claude.'
    claimed_by: codex-overnight-2026-10-11
    branch: codex/p4-panorama
    flag: panorama-ridge
    owns: [src/circuits/panorama-ridge.js, tools/test-circuit-panorama.mjs, docs/changes/P4-PANORAMA.md, src/circuit-landmarks.js, tools/scenarios/p4-panorama.mjs, tools/art/p4-panorama-sheet.py, tools/scenarios/p4-panorama-frames.mjs, tools/panorama-field-rate.mjs]
    hooks: [src/circuits/index.js, src/feature-flags.js, start-preview.bat, src/world.js, tools/scenarios/p4-daynight.mjs, src/race-field.js, tools/test-circuit-barriers.mjs, src/generated/reference-laps.json, src/pit-lane.js, src/race-field-driver.js, tools/track-script-drive.mjs, src/app.js, tools/test-pit-lane.mjs, src/track-script-course.js]
    performance_watch: "Kyle relayed Claude, 10 October: the DAYNIGHT High CPU exception is scoped to its measured foundation view. This card measures delivered p95 with eight cars at night (Panorama Night or Harbour Lights). If delivered pacing slips, trim lighting cost in this card; do not carry the foundation exception over as a frame pass."
    acceptance:
      - "Build docs/CIRCUITS.md section 5.1 from its script in src/circuits/panorama-ridge.js: widths, walls, crests, the Sunset light path over the race, landmarks, grandstands, pit buildings, the valley town. Event appended to COURSE with a stable id."
      - "Section 4 feel targets checked with the review tool; lap time and corner speeds in the change note. Full field races cleanly (section 3.2 targets on this track). Frame cost within the usual limit. Then Claude's finishing pass (P4-FINISH-PANORAMA) before release."
    claude_note: "10 October 2026: a Claude Sonnet agent builds the road layout (track script, widths, walls, crests, boards) behind the switch once P4-TRACK-SCRIPT merges, using existing scenery. Codex finishes the card: art from Kyle's picks, light, landmarks and the full field."
    note: "Road layout built by Claude behind the panorama-ridge dev switch (src/circuits/panorama-ridge.js, 4.84 km, fitted to close; see docs/changes/P4-CIRCUIT-LAYOUTS.md). Codex still owes art, light path, landmarks and the full field; card stays open."
    kit_hook_decision: "Claude check-in 3 confirms Codex owns shared GLB loader, placement, distant versions and narrow readiness/disposal hooks. Merge P4-KIT-LOADER first; Claude track lanes author their own metadata."
    design_decision: "Director 11 October: finish existing stable Panorama road without geometry changes. Sunset uses race-progress golden through lap one, smooth dusk from lap two to final lap. Place approved full-span gantry at real start, garages/grandstands/safety kits, summit lattice radio mast, lit timing tower and lower valley town. New generic circuitLandmarks metadata drives only authored radio/scoreboard structures; circuit world hook waits for shared-loader freeze. Native full field and existing targets, lap/corner reference report, art through Claude and quiet frames required; no foundation frame exception transferred."
    benchmark_decision: "Claude check-in5: native circuit steering skill .95 with field avoidance judges scripted full-field targets; existing circuits retain the legacy free-lane driver."

    frame_design: "Director before code: reuse the unchanged DAY 120-warmup/360-CPU/359-delivered/GPU>=288 sampler and10% limits, two pairs in opposite orders per quality. Genuine stationary eight-car native grid, fixed camera/night path. Control uses the same complete ground/road with authored kit/landmark groups hidden and day light; candidate shows real kits/landmarks/night. Renderer preparation remains active in both; record update diagnostics without subtracting overhead. This bounds presentation cost, not a comparison with the old incomplete-ground road or moving-camera simulation. Quiet exclusive scheduling required."

    gp_entry_decision: "Native browser proved Panorama is absent from the closed-road Grand Prix allow-list, so the requested GP silently becomes duel. Grant only its stable id in src/race-field.js; old entries and rules stay exact. Add a real headless eight-car/three-lap start regression. Claude owns adding Harbour/Tremblant in their cards; merge list additions together without overwriting."

    round_one_verdict: "Claude check-in5 held2/3.5/2/2.5; consumed firstsheet/note removed in real round2packet, facts retained."
    native_verdict: "Private54308 High/Performance12captures/0warnings/errors, actual8cargrid/7CPUfinish/3laps; lap117.483/120.176/98.667s and25passes. Actual light final-lap dusk0.55. Seed1000 first30s3+distinctcrashes is not a clean-field pass. Sheet269807bytes, runtimegrounded/nativechase inspected. Quietframes queued."
    frame_camera_decision: "Private frame fixture sets only the native inspection camera and its presentation position to the same authored grid view before sampling, avoiding interpolation in the before witness. No actor or rule state changes. Native art captures wait for the actual camera to reach their requested drawn-ground height before recording metadata and pixels. Existing sampler/counts/10percent limits stay exact."

    round_two_design: "Claude check-in5 held round one (lighting2/readability3.5/grounding2/consistency2.5). Keep road centre, widths, crest/lap/collision rules exact. Add Panorama-only authored off-road landform: Mountain Straight uphill cut with rising/falling banks; Cutting through Forrest Elbow narrow ridge with steep drops; Skyline open sky and lower valley/town. Near/far terrain and physical ground share the same deterministic height hook; scenery/camera use actual upper rendered triangles, preserving dry legacy paths. Ground approved kits, trees/rocks/scrub; keep racing sightlines. Plain grey walls/catch fence with original collision boxes and low existing red/white kerbs. Course-only warmer low golden sun and brighter orange/violet dusk, town lights/headlights, default palettes exact. Same views plus Murray/Esses; new tests for road/legacy equality, mountain profiles and actual roots/camera; source review and real round-two sheet to Claude before unchanged quiet frames. Maximum three art rounds."
    round_two_hooks: [src/course.js, src/world-surfaces.js, src/rendered-ground.js, src/landscape-detail.js, src/render3d.js, src/track-script-scene.js, src/light-path.js, src/vegetation.js, src/track-script-course.js]

    field_rate_recipe: "Before code: owned private Panorama rate recipe reuses exact existing runRace/raceSeeds/summarize/targets, installs native .95 racing-line driver with field avoidance during first genuine countdown before go, uses memory-only ownTestCourses and restores App hook/course list. Thirty complete seeded races per difficulty with standard falcone_f42 midcar, original finish/pileup/pass/win targets. Three isolated difficulty processes may run in parallel after Audio stress; each keeps the exact seeded driver and memory facade, with all90 rows aggregated before any pass claim. No synthetic results, driver pace tuning or new recovery; retain actual inputs/finishes/seed/layout/race fingerprints. Heavy rate follows Audio quiet capture/stress and may overlap only remaining ordinary headless gate work."
    field_rate_verdict: "Actual3fed1717:90 original seeded attempts,30each; allCPUfinish but playersfinish11/30Easy,14/30Medium,12/30Hard; remaining19/16/18hit420s cap. Opening pileups30/30 each difficulty; test driver win0% each, original targets FAIL. Native .95 with field avoidance and falcone_f42; no driver tuning/assertion waiver. Claude assessment requested; art round2 proceeds separately."
    seam_fix_design: "Director before code: native round2 failed genuine missing terrain at s4840.939449867449/off28.7352222324349, within the final2.042909m omitted by4m terrain sampling. For Panorama ridgeLandform only, append exact course.length row to drawn terrain and matching upper-triangle sampler. Preserve all existing rows/legacy buffers, road geometry/rules/fingerprints; no analytic fallback or assertion waiver. New actual final-strip ray/complete seeded landscape regression RED first, then source review and native art retry."
    round_two_sheet: "C:/Users/kyleb/.codex/worktrees/wasteland-integration/p4-panorama/docs/board/looks/p4-panorama/round-2.jpg"
    round_two_review: "C:/Users/kyleb/.codex/worktrees/wasteland-integration/p4-panorama/docs/board/looks/p4-panorama/round-2-review.md"
    round_two_native: "Runtime1343df8d/packet76119778; actual private34986 High/Performance16captures (14sheet+2chase),0warnings/errors, native8car finish129.81/98.665/100.06s,21passes/light.55; source reviewclear,11focused/2,545,523terrain checks pass. Actual315987B sheet waitingClaude, no subjective art/performance/balance pass."

    whole_view_frame_design: "Before recipe changes: compare fresh identical seeded native eight-car grids. Baseline omits only kits and landmarks before world construction and uses the original daytime comparison; candidate retains all actual presentation and the final-lap night comparison. Both keep complete mountain ground, road, car poses, rear view and HUD. Use frozen shared main-plus-rear sampler; preserve 120 warm-up frames, 360 CPU and 359 delivered samples, at least 288 GPU samples, stable resolution, two opposite orders per quality and original 10% limits. Also gate combined update plus submit at 10% and candidate delivered p95 at most 18.5 ms. No state edits, hidden populated baseline, discarded samples or overhead subtraction. This recipe work grants no art or field acceptance."

    whole_view_recipe_review: "Reviewed d64f8ba5 after genuine loader merge bae1e0d2: fresh metadata-only baseline before first world build, actual main/rear/HUD, exact native eight-car state/poses/profile/storage/camera, original sample counts and relative limits plus combined 10%/18.5 ms. Syntax and 22 lightweight validation checks pass. No native measurement or gates; art and field still held, corrected loader sync required."

    check_in_7_decision: "Claude check-in 7 holds round two at 3/4/3.5/3.5. Final round three: every remaining tall striped wall becomes plain concrete with catch fence; stripes stay on low kerbs only. Replace sharp white ridge spikes with rounded rocky outcrops using existing source geometry. Slightly raise course-only dusk ground light with warm-to-violet ambience; valley town lights visible below Skyline and along Conrod, and actual Skyline frame shows drop and town. Keep seeded presentation/read-only rules. Field correction waits for Harbour merge: reuse its opt-in settings, no second mechanism; widen only the ridge from 11 to 13 m between The Cutting and Forrest Elbow, then original 90 races/3.2 targets. Settle exact shared settings/ridge hooks before field code. Build art now but final third packet follows actual approved loader/Harbour sync and coherent final road source. Same views, true native field, sheet at most 500 KB, source review; three-round cap."

    final_art_hooks: [src/mountain-landscape.js]
    final_art_design: "Director before code after Claude check-in7: course-only fence material shader makes all solid bases plain grey concrete and remaining mesh neutral steel, retaining every approved vertex/placement/catch fence and low existing kerb geometry. Existing mountain mesh upper heights use sin(y*pi/2), preserving rim and peak/bounds, with alpine snow disabled for Panorama only; physical mountains and seeded features remain exact. Dusk mountain palette ground becomes warm-violet0x736981 with hemi1.35/env.48; timing/exposure/default palettes exact. Approved shopfront emissive panes become recognized window materials before lighting capture, allowing existing reversible night window path. Actual Skyline inspection camera sits above rendered ridge and aims at actual lower town centre, retaining road/drop in foreground; include actual Skyline and Conrod final-lap dusk frames, no racer staging. Final third sheet waits loader and Harbour field sync."

    frame_policy_question: "Check-in7 makes city-versus-empty kit relative costs information. Proposed final Panorama frame comparison keeps all real kits/landmarks in both fresh seeded native eight-car worlds, compares original day against authored mountain dusk (actual final-lap palette), and keeps original10%CPU/GPU/delivered/combined lighting guards plus fullview18.5ms absolute and kitconstruction<1s. Same actual sampler/counts/orders/HUD/rear/state; no hidden groups/empty-world confound. Please confirm this lighting-only relative comparison versus keeping old combined kits-plus-night empty-track diagnostic; no recipe change yet."

    final_art_source_review: "Independent source review clear at genuine integration/loader union 10eba115. Exact d05 loader, ready material finish, rounded mountains, warm Sunset palette, terrain camera and scoped rear restoration survive. Circuit lighting yields to the actual Sunset path; local nine GP IDs plus Panorama and Tremblant occur once. All 14 focused circuit tests pass in 14.4 s; prior 16 independent lifetime and 544 light checks remain. No final art, field or frame acceptance yet; actual third packet waits loader and Harbour settings."

    shared_sync_hook: "Director before current integration sync conflicts: preserve additive local ten GP IDs plus Tremblant exactly once. Resolve track-kits shared compatibility with exact ordinary-reviewed d05ed90e source and then genuinely merge that branch ancestry, no local loader implementation. This inherits reviewed packed colour/rear fixes; no native final capture before loader passes and lands in integration. Other Claude source remains exact."

    claude_1030_frame_decision: "Before recipe changes: Claude10:30 approves all real kits/landmarks in both fresh identical native worlds, original day versus authored final-lap dusk. Relative CPU/GPU/delivered/combined10% comparison is information; acceptance is delivered p95<=18.5ms High/Performance and kit construction<1s. Keep sampler/counts/orders/rear/HUD/state exact; note/review policy assertion change. Final field and13m ridge still await actualHarbour opt-in mechanism."

    frame_policy_source_review: "Frozen572dbb53: independent ordinary review clear after requiring bothday/duskdelivered<=18.5 and actualownerconstruction<1s. Identicalfullkits/landmarks inbothfreshworlds, actualfinalduskpalette, alloriginalsampler/state/rear/HUDguards retained; originalrelative metrics information. Syntax/diffcheck pass; numeric/native/gate pending."

    ridge_width_slice_decision: "Before code: implement Claudecheck7 approved11→13m only from The Cutting through Forrest Elbow using existing inheritedwidth/blending; Conrod remains16 and otherpiecesexact. This owned geometry slice can finish before Harbour engine arrives so finalthirdart uses coherentfinalroad. Dynamic authored fences/walls follow existingroad edge rules; keep centreline, allturns/climbs/pit/defaultcourses and RNGrecipe exact. Meaningful old11m RED/new13m GREEN plus actualHigh/LODclearance; no worldsignature regeneration, newfieldmechanism or artpassinferred. Nativefield settings stillonlyafteractualHarbourmerge."

    ridge_width_verdict: "c8c4fb8c: meaningful old11m RED then all15/15 GREEN in5.61s, including genuineHigh/LODclearance. One runtime line sets The Cutting13m; inherited width through Elbow, originalblends/otherwidthtargets/centreline byteexact, fences followedge. Ordinaryreview clear, finalart and Harbour fieldpending."

    lighter_frame_design: "Before recipe code: Kyle rules7-10 replace paired day/dusk timing with one full final-dusk leg perquality, actual8cars/main/rear/HUD. Grant existing p4-panorama-frames recipe and its existing circuit-test expectations only; no runtime/art edits/new machinery/controls. Keep original perleg120warmup,360CPU,359delivered,GPU>=288, finite/positive/state/profile/storage/pose guards, delivered<=18.5 and actual finite nonnegative construction<1000. Replace paired comparison/report expectations with single-row absolute validation; remove obsolete relative packets/crossleg equality, keep genuine before/after equality. No timing until finalart accepted and actual track reachable. Existing grid has8visiblecars; globally busiest view unproved, settle intended busiest view on card from finalart evidence before measurement."


    simple_frame_view_question: "Claude: newrule8 permits one busiestview perquality. Existing native evidence shows8visiblecars at grid andRidgeTop, but no load ranking. Proposed full final-dusk grid with paddock,allkits/landmarks/mainrear/HUD. Confirm that intended busiestview or nameone. No timing until finalart accepted/playerreachable; no extra ranking packet/measurement. Existing simplepolicy sourcea739 reviewed clear and one originalnumericcase12assertions passed."

    claude_1500_decision: "Claude15:00 confirms actual Harbour opt-in reuse after its integration merge, with approved13m ridge. Future frame view is final-dusk grid with8cars/paddock/kits/landmarks/mainrear/HUD; only after art accepted and player-reachable. Current dev-hidden Panorama has no timing now under rule9; final finishing/release wiring owns it. No tolerance exception or performance pass inferred."

    safety_payload_design: "Before code, Director settles Panorama-only existing safety metadata after actual Harbour engine merge: racingLine lineMargin2.6/lineSwing0.6/holdRacers true; fieldFollow leadBraking1.6/wallRoom1, firstLap margin5/reaction0.5/closeIn0.8/wallRoom1.4. Preserve approved13m ridge/all geometry, player input method, and default fieldPace/form/spread/aggression1. Do not copy Harbour difficulty tuning without actual original90-race results against unchanged3.2 targets. No new driver/recovery/mechanism. Existing circuit assertions only pin this authored payload and retain old geometry/clearance rules."

    reference_refresh_scope: "Director grants existing generated reference-laps.json hook after final metadata freeze. Approved11-to13m width changes physical fingerprint, and margin/swing changes actual scripted reference path even though old geometry fingerprint omits racingLine. Refresh with the existing complete27-route build-reference-laps publisher; never hand-edit one row/hash/version or add machinery. Preserve Stuttgart959-S/Club/Medium/seed1989, native warm-up plus best of two clean timed laps and all27 coverage. Other current authored tracks refresh in the same existing publisher. This is runtime data, not an extra art/frame test."

    actual_harbour_sync_scope: "Director before code: shared driver now genuinely integrated0cdf038a; Claude16:30 permits Azure GP-only and Panorama13m reuse. Merge actual integration ancestry, preserve every approved lane feature and shared opt-in default. Resolve only additive named-file conflicts; report any new hook before editing. Previously settled minimal metadata applies. No copied engine, new machinery or dev-hidden frames. Heavy work respects global two jobs and Claude release-full hold."

    admission_scope: "Director before correction: this card adds only panorama-ridge to actual integration GP admissions (Pacific, Tremblant, Harbour). Its old lane also contains provisional legacy registrations owned by P4-GP-EXISTING; do not install those before that card passes. If GP genuinely merges first, retain its accepted registrations on sync. No geometry/field target changes or new machinery."

    integration_batch_scope: "Director, 11 October, before combined-source edits: Kyle flags over-testing and low integration throughput. Assemble Snow43a55ea4, GP4dd197ae, Panoramaaaab7a0f and Qualifying6abe1284 into one codex/p4-finish candidate in the idle Snow checkout; preserve each original branch. Resolve only additive conflicts inside these four cards owned files/named hooks, preserving actual integration ancestors, all current flags and settled metadata/defaults. Report any new hook before editing. Do not change driving rules, acceptance thresholds, saves or test machinery to make integration pass. Reuse accepted unchanged visual/native/source reviews. Finish explicitly required remaining acceptance work, then one lane jobs4 and build on coherent combined source before one integration merge; one end full alone. No source merge into integration during Claude release-full/freeze."

    current_field_verdict: "Originalaaab90 complete/exit1: pileups4/22/9 of30 and wins14/2/0; six original target failures. Players finish26/28/25, all7CPUfinish90/90. No target/driver waiver; no rerun queued; next bounded design decision waitsClaude."
    overnight_2120_decision: "Kyle overnight 11 to 12 October: follow Claude21:20. Panorama gets grid setback,15m last150m and Hell Corner, Harbour firstLap unchanged, then existing fieldPace only max3 original90-race runs. Existing circuits each get bounded fieldPace/fieldAggression max3 original90-race runs, closest honest result may merge per Claude. Team Room stays base-only. No release, push or history rewrite."

    pit_fix_decision: 'Claude 12 October 10:00: make the actual pit divider solid with entry/exit openings, reuse existing limiter and pit-line behavior to drive any unrequested pit-lane car through to exit, and shorten the moved-back grid only if slots overlap entry or exit. Builder proposes exact hooks before code. Final original 90 stays frozen; rerun only the final native art recipe after the fix. No new art round or hidden-course timing.'

    pit_fix_hook_decision: 'Director accepts the six narrow pit/controller/test hooks plus track-script-course. Panorama only uses its solid drawn kit divider as the final runtime source; retain the old divider during scatterScenery to preserve seeded placements, then remove only its duplicate pitWall boxes and drawing. Use a shared read-only existing pit-line/limiter target for field, demo and native controllers physically in the lane without a stop choice; no service, teleport or forced finish. Manual inputs remain manual. Actual grid centres -49 to -77 are before entry 10 and clear of exit 463, so keep setback -43. Tests cover actual grid/openings/kit boxes and limiter-speed transit to exit. Other pit lanes, pace, seeds, targets and frozen90 remain exact.'

    hellgate_decision: "Claude 12 October 14:00, settled and built in claude/p4-panorama-hellgate ca160bed on 0a50336d (fast-forward for codex/p4-panorama). Cause, headless: lap 2 the player runs into Sana Marlow under braking at phase 445, slides wide at Hell Gate, leaves the outside at 512 and rejoins behind the open start of the 912 m Mountain Straight right wall (s 539); Hell Gate has no outer wall. Not a wall gap, pit exit or collider mismatch. Same trap stops the Hard native start (lap 1) and both frozen Medium zero-lap seeds on current source. Fix: solid plain concrete kit wall on the outside of Hell Gate, s0-6 to s 540.8, face in line with the script wall; seeded scenery, walls and layout fingerprint exact. Native setup now finishes 3 laps headlessly. Lane tier 397/401, build pass; the 4 failures (shortcut preset hash, 11 m layouts assertion, stale reference row x2) fail identically on 0a50336d. Codex: merge the branch, fix those four with the existing generator/publisher, rerun only the final native art recipe, no 90-race run."
    art_round_three_verdict: "Claude 12 October: art accepted on the round-three golden views (3.5/4/4/4); cap reached, no fourth round. Remaining is framing and evidence only: move the Skyline inspection camera clear of the radio mast, take the final-lap dusk frames on the retry, build round-3.jpg (500 KB at most) and remove the round-2 files. Verdict note: docs/board/looks/p4-panorama/round-3-review.md on the Claude branch."
```

## Factory resume grant, before code

FAC-04 and FAC-05 are merged. Resume the retained codex/p4-panorama lane:
first fast-forward its clean 0a50336d to Claude ca160bed, then sync current
integration and preserve every accepted factory/qualifying/pay change.
Keep authored stage 16, panorama-ridge dev and 1600 CR; admit only Panorama
to GP through its own manifest. Preserve every accepted existing admission,
and do not install provisional GP-EXISTING legacy admissions.
Own the existing physical field/pit hooks and native/art recipe. Grant
manifest export and tools/test-circuit-panorama-registry.mjs for the actual
dev GP admission; src/generated-shortcut-presets.js through the existing
generator; only the approved 11-to-13 m ridge assertion in
tools/test-circuit-layouts.mjs; and the complete per-event Panorama reference
file through the existing --event publisher. No filtered probe publication.
Keep all unmodified replay/scene values exact. A Panorama-only scene pin
may change only for the actual visually reviewed round-three differences,
with the exact before/after reason and existing capture tool.

Move only the Skyline inspection camera from off -30 to the clear valley
side +30; retain the other golden camera coordinates and existing clearance
bounds. Claude accepted round three (3.5/4/4/4); no fourth art round or new
90-race run. Keep all three original bounded pace verdicts. Heavy final
native browser/art capture, dusk frames and sheet generation wait for the
night shift now that FAC-03 is merged. Prepare one green source candidate
with canonical nearby lane jobs 4, build and ordinary review; do not claim
the pending native retry or final sheet completed. busy-game-files remains
held while shared source hooks are being integrated. Never delete this old
retained lane.

## Factory source handoff, before integration

The completed runtime source may merge under panorama-ridge dev as soon as
its corrected nearby lane, build and ordinary review are green. This is
the source slice, not whole-card or native-art acceptance. FAC-03 runs
against integration, so the source and existing native recipe must be there
for the deferred night retry. Keep the card open for the real final-lap
dusk, Skyline/Conrod frames, round-three sheet and Claude's conditional
acceptance; no fourth round, native pass or final sheet is invented.
Release busy-game-files after those completed shared hooks merge. Any later
source correction reclaims only its actual named hook and gets one fresh
lane/build/review. No release or push.

Generator hook granted before edit: tools/generate-shortcut-presets.mjs
adds only definition.script to its unsupported arena/expansion skip.
The original no-empty-script-row and exact 15-legacy-entry guard remains
unchanged, as do all 15 path values and fingerprints. Only its normal
source fingerprint changes.

## Factory source review correction — 12 October 2026

Director grants `tools/panorama-frame-cost.mjs` for the unchanged pure frame comparison and validation exports, the existing Panorama test import, and removal of `tools/scenarios/p4-panorama-frames.mjs`. The obsolete scenario throws in the factory night browser inventory without its private opt-in and measures stationary dev-only art, contrary to rules 8 and 9. Preserve its existing pure assertions and limits, and fold diagnostic verdicts into the change note. No timing, new framework, skip or fabricated pass. Drain the frozen run before editing, then one fresh nearby lane, build and ordinary delta review. This corrects the earlier source-review clearance; merge waits for the correction.

Director lock release: the builder confirms all runtime hooks are frozen and finished at 306/306-tested 83c58563. busy-game-files is released to DEEP-SAVE before source handoff; remaining Panorama corrections own tools only. Any newly exposed runtime defect must reacquire and coordinate its hook before source edits. The private native bundle may correct its own actual IIFE/top-level-await failure through an awaited ES build wrapper, with helpers, drivers, seeds, captures and assertions exact; no shared harness or actual browser run. Final source merge still waits corrected green lane/build and ordinary review.

Dev source c56238e9 integrated conflict-free: lane306/306,zero failed/unrun,1773.56s,jobs4;build758ms;ordinary review clear. Whole card stays open for actual night native dusk retry/final sheet and conditional art acceptance. Runtime hooks released, old lane retained; no90/frame/native/full/release claim.
