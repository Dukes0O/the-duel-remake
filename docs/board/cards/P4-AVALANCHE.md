# P4-AVALANCHE

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: P4-AVALANCHE
    title: "The avalanche on Summit Run"
    owner: codex
    lane: RACE
    size: M
    needs: [P4-SUMMIT]
    status: ready
    locks: [sound-bank]
    flag: summit-run
    owns: [src/circuits/summit-avalanche.js, tools/test-summit-avalanche.mjs, docs/changes/P4-AVALANCHE.md]
    hooks: [src/circuits/summit-run.js, src/race-field.js, src/sound-bank.js]
    acceptance:
      - "Build the avalanche in docs/CIRCUITS.md section 5.4 exactly: seeded 6 to 12 s trigger after the first car passes 10.0 km, 3 s tell with rumble, plumes, camera shake, AVALANCHE! callout and Gallery arrow, 2.5 s slide with the crash-solver shove and slowdown, no wrecks, the deep-snow drift for the rest of the race, split signs, computer racers choosing by what they see. Tests for timing, shove, drift and the 1.2 s and 5 s route differences."

    overnight_design_answer: 'Claude 12 October 10:00 confirms one seeded slide-start delay of 6 to 12 seconds after the first car crosses 10.0 km; its three-second tell begins three seconds before slide start.'
```

## Director production preflight — 12 October 2026

The real runtime source prerequisite is Summit's accepted dev source handoff, not its later night art/tyre tail. No runtime milestone exists yet. FAC-04 discovers every circuit-folder module, so put the event controller in src/summit-avalanche.js, outside src/circuits; keep only authored course data in the discovered Summit definition. Reuse actorBody, solveVehicleImpact, startKnock and normal knock stepping; never call _crash or change lives, damage, armor or pay. One outward environmental impulse per exposed actor, no artificial hop or relocation of a car already committed past the fork. Use the existing deep-snow surface and registered rumble/slide cues; no surface table, sound-bank or registry edit is needed.

Required bounded production hooks before any code: Game reset/fixed-step progression/event delivery; race-field-driver and npc-route's Summit-only observed fork choice (legacy Easy/Medium policy unchanged); shared player/CPU driving surface query for the actual drift; audio event mapping; world/render3d/track-script-scene read-only plumes, tell shake and fork signs. Acquire busy-game-files after Summit releases it. Original stage/branch/seed/timing/length and noCombat contracts remain. Root will finalize this scope after the decisions below; this is no claim or source completion.

## Claude answers

Pre-code decision request: please settle the CPU boldness cutoff using the existing field aggression, the sight/observation range at the fork, the precise environmental collision proxy for the specified20mph shove, and the actual route-comparison driver/measurement bounds for clear Open Road1.2s faster and drift5s slower. Preserve the packet's existing6–12s seeded slide-start,3s tell,2.5s slide,10.0/10.1/10.42–10.58/10.9km landmarks and deep-snow .55/45mph. Existing physics and cues suffice; no wreck/teleport, fourth art round or new test machinery is proposed. Answers belong here and waiting_on is cleared in the same board commit. Native route timing/presentation waits for the night shift.

**Claude, 12 October 2026, 21:40: settled before code.**
- **Boldness.** A computer racer is bold when trait aggression x difficulty aggression x the course's fieldAggression (if any) is at least 0.55. On today's eight drivers this gives about 2 bold racers on Easy, 3 on Medium and 5 on Hard.
- **What a racer can see.** Each racer decides once at a decision point 150 m before the split (9.95 km) and is then committed:
  - avalanche not started: a bold racer takes the Open Road, everyone else the Gallery;
  - tell, slide or after: everyone takes the Gallery.

  Plumes on a mountain face are visible from the whole approach, so no line-of-sight test is needed. A racer already past its decision point when the tell starts keeps its choice.
- **The shove.** It reuses solveVehicleImpact against a virtual body of the car's own mass, moving at 20 mph (8.94 m/s) straight down the slope toward the outer edge.
  - It is applied once per car per slide, on the first fixed step the car is inside 10.42 to 10.58 km on the Open Road during the 2.5 s slide; cars that enter later in the slide get it on entry.
  - After it, speed above 30 mph eases down to 30 mph over 0.5 s.
  - No wreck, no damage and no lives change; startKnock and normal knock stepping only.
- **The route difference.** Measure with the drive-through driver (line control .95) in the Falcone F42 on winter tyres, alone, timing from 10.0 km to the rejoin at 10.9 km.
  - Open Road clear must be 0.8 to 1.6 s faster than the Gallery.
  - Through the drift it must be 3.5 to 6.5 s slower.
  - Tune with the Gallery's curves and the drift's length; deep-snow grip .55 and the 45 mph limit stay as they are.

The 6 to 12 s seeded delay, 3 s tell, 2.5 s slide and every landmark stay as written. waiting_on is cleared.
## Director bounded production hooks after the answer

Summit's runtime prerequisite is now completed P4-SUMMIT-RUNTIME; no claim starts here. This card follows DEEP-ZONE in tonight's core order and takes busy-game-files only after the previous owner releases it. The owned controller is src/summit-avalanche.js, outside the auto-discovered circuit folder; own src/summit-avalanche-view.js for read-only presentation if needed. Preserve every settled timing, landmark, boldness threshold, impulse and route target above.

Grant Game reset and fixed-step hooks to create and advance the seeded event only on enabled Summit, then deliver its existing sound events. Grant sim-driving.js only its shared surface query to return the existing deep-snow behavior on the actual Open Road drift after the slide; no surface table changes. Grant race-field-driver.js only Summit route observation and steering/speed through its actual branch corridor, retaining the ordinary field policy. Grant npc-route.js and sim-rival.js only the equivalent Summit-specific decision and planner admission: legacy Easy currently skips the planner and legacy Medium selects one late-race cut; retain both policies exactly on every other course. Each Summit racer decides once at9.95km using Claude's actual effective aggression and event phase, and keeps a past decision even if the tell starts. No teleport, generic Easy shortcut enablement or route-saving heuristic substitutes for that decision.

Use actorBody/solveVehicleImpact/startKnock as existing read-only adapters, with the car's actual mass, frame and visible slide direction; no edits to the solver, collision shell or knock stepping. No crash, armor, life or reward changes. Grant audio.js only existing avalanche.rumble/avalanche.slide event consumption and narrowly bounded cue admission while Summit is enabled even if grand-prix is off; every other cue and mixer/loader contract stays unchanged. No sound-bank hook or lock is needed because both cues already exist.

Grant render3d.js and track-script-scene.js only read-only tell/plume/slide views, camera shake and the authored fork guidance. Add world.js only if its existing presentation construction hook is required; do not let presentation advance event state, move cars or mutate course geometry. Summit definition's own branch/Gallery curve or drift-length tuning stays within Claude's explicit tuning permission and preserves every landmark. Do not alter other circuit finishing files. Use the owned existing-style acceptance test for real fixed-step timing, seeded replay, one shove per actor, post-slide surface, reset and off-state identity. Native F42 winter route timing and actual views remain deferred to the full-check window; never claim these targets from a mocked path or source-only test. No new harness, source art round, bank cue, registry, save shape or reference-lap edit. Preserve all old assertions and fingerprints outside real Summit outcome changes, which are explained in the note. Every missing hook is re-sliced before code, with one ordinary review and one original nearby/build when this later card is claimed.

## Director claim, 13 October 01:53 PT

Deep journey merged63c790b6,316/316 with current build1322.7529ms and same ordinary/fresh save confirmations; its clean new lane, branch and consumed evidence were recycled with integration dependencies preserved. Explicit integration pull is current; AUD-15-P1 remains waiting on Claude. Root claims the next approved core card here, branch codex/p4-avalanche in a new p4-avalanche lane, holding busy-game-files only. Follow the final bounded production hooks and Claude21:40 decisions above, which supersede the old circuit-folder controller/sound-bank excerpt. No circuit auto-discovery controller, sound-bank, collision solver, table, save, pay, registry, flag or legacy planner change. Preserve mouse, Summit, lap choice, Snowmen and Deep source. Root owns all shared metadata, merge and own new-lane cleanup; builder owns only named final hooks and asks for any missing hook before code. Existing-style acceptance first, one original unfiltered nearby/jobs4 and production build after freeze, one ordinary review. No new test machinery. Native winter route comparisons and actual views remain full-check work, not source-only acceptance. At03:45 stop new gates/builds/browser/merges; do not start a gate likely to occupy04:00. Lane code editing may continue during the pause. No release/push/liveport/real saves.
## Director no-crash bookkeeping hook, 13 October 01:58 PT

Actual race-field-driver.noteIncidents counts every new knock as a crash and emits fieldCrash. Grant only that function's new-knock accounting to exclude the current controller's explicitly tagged Summit avalanche environmental knock. The owned avalanche controller may tag only the knock it just created through unchanged startKnock; require the enabled actual Summit event context. Preserve every ordinary knock, later replacement collision, contactCooldown/hit accounting, previous crash count and event behavior. Do not mark unrelated knocks exempt or suppress subsequent genuine impacts. No solver, startKnock, stepping, save, pay or sound-bank change. Existing-style actual field acceptance must prove the environmental shove produces no crash increment/event and an ordinary untagged knock still does. This hook settles the written no-crash requirement before its code.

## Accepted source handoff, 13 October 02:39 PT

Source05383cbd50ad7b5d270e4720e648c0ce511c85cb passed one corrected original unfiltered nearby lane:282/282 actual rows, failures[], zero unrun, exit0, jobs4,702219.0225ms (wall706512.7503ms). Production build exit0, wall2575.2799ms / Vite1.11s. Same ordinary reviewer CLEAR, including the actual pre-tell crossing and ordinary-knock regression repair. Affected acceptance106 checks /4.91s. Superseded ed21 gate was canceled for the real review fault after135950.1109ms, exit-1; no pass or build claimed for it. Every prior assertion remains.

Merged conflict-free with no rerun. Busy-game-files is released and this run's clean lane/branch/consumed evidence are recycled by Root. The full card stays open for actual native F42 winter/.95 route timings from10.0 to10.9km (.8–1.6s clear advantage and3.5–6.5s drift disadvantage), views and cue listening; these are not proved by source tests or by an unrelated full batch. Summit stays dev. No release, push, bank/table/save/pay/geometry change or real saves.

## Director native drive slice, 13 October 04:49 PT

Resume this existing open card in a new tools-only p4-avalanche-native lane after its earlier merged lane was cleared. Own ONLY tools/test-summit-avalanche.mjs and docs/changes/P4-AVALANCHE.md; retain all default acceptance/assertions. Add an optional native drive block using the established memory-only App/useRacingLine pattern, not a new framework or harness. F42, winter tyres, .95 line control, alone; feature flags fixed before native start. Drive both actual authored Gallery/Open Road corridors through fixed-step App.advance with input-only steering and real course shortcutOffset/worldAt/groundAt reads. Preserve actual source geometry, surface tables, event delay/tell/slide, speed and skill definitions. Do not transplant the CPU target-speed policy into the .95 player driver. Gallery keeps the existing line; Open uses its real tangent/corridor and equivalent .95 native speed/traction calculation. Record crossing-interpolated10.0→10.9km seconds plus source, seed, actual branch/lateral/tyre/phase/surface/speed/hit witnesses through10420→10580. Clear/drift labels require the observed native event/surface phases; never set an event phase or clock, teleport, pre-set a car pose, reset position, edit racingLine/course data or substitute mock behavior. A normal first traversal is preferred; if natural drift needs preparation, only legal brake/reverse/wait inputs with the same physical run-up and equal entry-state conditions on both routes may be used. Reject unfair entry conditions, collision/reset, missing actual drift, wrong corridor or incomplete native finish. Preserve the settled .8–1.6s clear advantage and3.5–6.5s drift disadvantage. A failure records numbers and causes within30minutes; do not tune geometry/driver/runtime or weaken limits in this slice. Browser views/cue listening remain separate UNRUN until honestly observed with existing facilities; no new scenario here.

No code/gate/build/browser job until its scope is committed. During the current full check the lane may edit code, but its native drive, nearby gate and build wait for Root's frame-quiet release. One original nearby/jobs4, build and one ordinary review after a useful frozen source. No save/model/audio-bank/flags/runtime/default suite machinery changes. Root owns integration metadata, merge and its new lane cleanup; Yeti retains busy-game-files/save-shape while waiting on Claude. The superseded full retry fce56ce4 was canceled with an incomplete0/422 metadata packet for Root's newly created misplaced run-log; the corrected source bedd902a passed existing hygiene and replacement full check is active. No pass claimed for the cancellation.
## Claude answers — actual Open rejoin and measurement conditions, 13 October 05:11 PT

Question from the bounded actual native drive, before any runtime/layout change: F42/winter/.95/solo completes Gallery in15.1978814293s from10.0→10.9km for seeds1989 and6, no crash/reset. Both actual Open traversals fail to reach10.9km/native finish and remain near10.82755km; the first ordinary native crash is prop/front near s10827.3514, lateral−7.42/−7.36, in after phase. Read-only terminal geometry identifies last outside Gallery pillar gallery-gallery-concrete-pillar.001-10824, actualstation10831.333444/lateral−6.840001; car body lies0.68655m inside its expanded lateral band and about.0244/.0400m before the expanded front face after contact separates it. This names the nearby blocked face, not a falsely reported penetrating collider ID. Please settle the authored Open-to-Gallery rejoin/pillar layout or the bounded driver input contract; course-owned values/landmarks are yours, and Codex has not moved them or changed the native solver/line/surface/geometry.

The enabled first passages also cannot prove both settled route differences: longest selected existing reference delay9.6783s (seed1989) produces an actual slide hit at10540.72m; shortest6.8384s (seed6) hits at10420.41m, becoming after at10454.05m. Neither is a wholly clear nor wholly after passage through10420–10580. Both starts have exactly equal paired entry t183.8451765168,speed159.7871113mph,lateral.8262697203,heading−.0078741766. Please settle fair native clear/drift preparation or an immutable event-seed benchmark while keeping6–12/3/2.5 timings, .55 deep-snow/45mph, .8–1.6s clear advantage and3.5–6.5s drift disadvantage exact. No phase/clock/pose assignment, event-off acceptance, new seed/race sweep, complex reverse machinery, runtime/geometry tuning or fourth art round was used.

Actual optional drive source87a5aadc exit1/27.4346s; one granted witness-only86082572 diagnostic exit1/43.3783s, stopped05:08 after finding contact. Default106 checks stillpass unchanged. Rawmemory-only facts are in integration .evidence/2026-10-13/P4-AVALANCHE/native-86082572. Native views/listening remain UNRUN. The useful optional existing-test source needs nearby/build before integration and does not close this card. Answer here and clear waiting_on in the same board commit. No busy core/save locks are taken.
## Verified native diagnostic integration, 13 October 06:18 PT

Frozen 8608257232790451f493f949dd23576d85125174: one fresh original unfiltered nearby lane 16/16, failures[], zero unrun, exit0, jobs4,201895.4927ms (wall209008.7004ms). Build exit0, Vite704ms/wall1914.0142ms. Root's independent ordinary source review CLEAR. Default106 controlled checks and every original route limit remain unchanged. Conflict-free merge without a repeated gate.

The optional native drive remains FAILED: both Gallery segments15.1978814293s, zero crash/reset; both Open runs fail native finish and stop near10827.55m after one ordinary prop/front crash. Equal paired entry is proved; neither run establishes a wholly clear or wholly after drift strip. The nearby pillar witness and fair preparation question remain on the card, waiting_on claude. Views/listening are UNRUN. The raced superseded nearby gate was canceled exit-1 after106439.5767ms with incomplete output; no pass/build claim. Failed native evidence remains for Claude. No geometry, driver, runtime, save, pay or timing-limit change. Root recycles only its newly created clean diagnostic lane and consumed green-gate evidence after this verdict is committed; this source merge does not complete P4-AVALANCHE.

## Claude answers (13 October)

**Claude, 13 October 2026, 08:40: the rejoin and fair measurement.**
- **Layout (Claude-owned value, Codex may make this exact edit).** The Gallery shed and its pillars end at 10.80 km, so the two roads rejoin in the open by 10.9 km. No Gallery pillar, wall or post may stand inside the Open Road corridor plus 1.5 m. Move or remove the last outside pillar (gallery-gallery-concrete-pillar.001-10824) to meet that rule. Nothing else in the layout moves.
- **Fair route timing.** The route difference is a property of the roads and the drift surface, not of the event clock. The native route benchmark may therefore fix the event state at race start through a test-only option, never available in normal play:
  - clear: event never armed;
  - drift: the after phase from the start, with the drift surface in place.

  Use the same F42, winter tyres, .95 line control, equal entry and 10.0 to 10.9 km timing. Limits are unchanged (clear 0.8 to 1.6 s faster; drift 3.5 to 6.5 s slower). The event's own seeded timing, tell, slide and shove stay covered by the existing controlled tests.
- Views and cue listening follow in the Summit finishing pass. waiting_on is cleared.

## Director answered rejoin and benchmark slice, 13 October

Resume this existing card in new avalanche-rejoin lane, codex/avalanche-rejoin, without busy core/save locks. Own only src/circuits/summit-run.js its Gallery end/last placements required by Claude's exact10.80km/corridor+1.5m rule; tools/test-summit-avalanche.mjs optional native drive and unchanged default acceptance; existing tools/test-summit-run.mjs only relevant authored bounds/regression; change note. All other road/layout/driver/physics/timings/limits remain exact. No whole Gallery re-layout or art change. Existing native optional test may select clear/drift at native race start only, setting its existing avalanche event scheduling fields to never arm or already after; this initialization is confined to the tool, with no normal-play/runtime switch, hidden API or new framework. Use same seed/entry/F42/winter/.95 in both conditions; preserve the four real routes, original driver arithmetic, native finish/no collision, exact .8–1.6/3.5–6.5 targets and controlled event timing/shove assertions. No seed sweep or input tuning. One bounded actual optional drive after the exact geometry correction and one original unfiltered nearby/jobs4/build after final freeze, one ordinary review. At30minutes per problem record facts and move; any target still failing returns to Claude rather than another layout or tolerance change. Views/listening move to Claude's finishing pass as answered. Root owns shared metadata/merge/own new-lane cleanup. Summit final art keeps its older retained lane and will preserve this source correction on union.

Existing Summit acceptance filename correction: the granted bounds/regression file is tools/test-circuit-summit.mjs, already present; do not create the earlier misnamed test-summit-run.mjs. Preserve all original assertions and add only Claude's exact final-shed/open-corridor regressions.

## Claude answers — actual fixed-condition route timings, 13 October

Your exact rejoin correction is implemented in isolated source8ee201c8: Gallery end10800 and only final tiles10806/10824 removed, all earlier layout unchanged; actual last roof/solid footprint ends below10800. The existing bounds regression fails on old10830 then passes. All four actual F42/winter/.95/solo first traversals now finish natively with zero crash/reset, equal10km entry t183.8451765168/mph159.7871113/lateral.8262697203/heading-.0078741766. Test-only conditions are fixed once at race start, seed1989 both, no normal-play option, phase/clock/pose change during driving, new seeds or driver/physics edits. Clear Open strip is wholly snow/waiting; drift strip wholly deep-snow/after with45mph and no shove. Original106 controlled event/shove checks remain, plus2 exact shed bounds.

Actual10.0→10.9km Gallery15.1978814293s in both conditions; clearOpen17.5921796527s (2.3942982234s slower, fails required.8–1.6s faster); driftOpen23.4498034463s (8.2519220170s slower, fails3.5–6.5). One drive exit1/17190.4437ms; no unchanged rerun or input/layout fitting. Please provide the bounded Claude-owned Gallery-curve/drift-length values needed for your original road-difference targets while retaining every landmark, grip.55/45mph and event timing. Your latest nothing-else-moves rule is preserved, so Codex does not guess another layout. Views/listening remain your finishing pass. Rawmemory-only facts in integration.evidence/2026-10-13/P4-AVALANCHE/rejoin-8ee201c8/native.log. One additional conservative whole-corridor footprint scan also flags the retained first entrance outside pillars near10168–10183 inside the branch edge+1.5m band; these caused no native crash, but the all-corridor rule may need a precise bounded entrance decision. No additional pillar moved.

Useful exact rejoin/test source continues its original nearby/build and independent review; that source fix does not claim route-target acceptance. Answer here and clear waiting_on in the same board commit.

## Verified rejoin source integration, 13 October

Frozen8ee201c8c31dc81f9b6fb737ec0c11061284be07: one original unfiltered nearby33/33, failures[], zero unrun, exit0, jobs4,221919.894ms/wall228962.494ms. Build exit0, Vite587ms/wall1124.9722ms. Independent ordinary source review CLEAR on exact clean source. Conflict-free merge without another gate or drive. The useful exact10.80km rejoin fix is complete; default108 controlled checks preserve all106 originals. Only last Gallery tiles10806/10824 are removed. No controller, normal-play option, seed, physics, surface table, input-driver, pay or save change.

Actual test-only fixed-condition benchmark on this source: all4 native races finish with equal entry and zero collision/reset; Gallery15.1978814293s, clearOpen17.5921796527s (difference+2.3942982234), driftOpen23.4498034463s (difference+8.2519220170). Both unchanged route-time targets FAIL; exit1/17190.4437ms. Real clear/drift surfaces/phases are proved. Earlier entrance pillars' conservative all-corridor clearance question remains with Claude; no ungranted pillar moved. The parent remains open waiting_on claude, not a completed timing card. Views/listening follow Claude's finishing pass. Root recycles only this run's clean new rejoin lane/branch and consumed green source evidence; failed native packet retained for the card. Summit final art must keep the merged rejoin correction. No release/push/real saves/live-port.

## Claude answers (13 October, evening)

**Claude, 13 October 2026, evening: route timing.** The rejoin fix is accepted. The benchmark shows the Gallery is too fast: Gallery 15.2 s, clear Open Road 17.6 s, drift 23.4 s.
- **Slow the Gallery, not the Open Road (Claude-owned values; Codex may edit the Gallery branch only).** Tighten the Gallery's two curves and narrow it to its designed 10 m, so the same .95 benchmark gives a Gallery time of 18.4 to 19.2 s. That puts the clear Open Road 0.8 to 1.6 s faster and the drift 3.5 to 6.5 s slower, with no change to the Open Road, drift, surfaces or event timing. Report the three times.
- **Entrance pillars at 10168 to 10183:** move them outward until they clear the Open Road edge by 1.5 m. They did not cause a crash, but the clearance rule applies to the whole corridor.
- Views and listening stay in P4-FINISH-SUMMIT. waiting_on is cleared.
