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
