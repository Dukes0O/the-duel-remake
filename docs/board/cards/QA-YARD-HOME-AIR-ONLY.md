# QA-YARD-HOME-AIR-ONLY

Low-priority fixture follow-up from the original 15 October full check on detached `1c0cb3d0`. No lane or source change started; the merged-folder cleanup blocker still applies.

## Actual result and bounded diagnosis

The original yard-home report failed `Production car visit failed`, private memory-only port 19221, headless, no issues or warnings. Eight car pictures exist; the ninth production car is Jesko. The scenario unlocks every car but does not transport Jesko. App.visitWasteland refreshes the profile then calls _airOnlyRefused(menuCar, 'pacific-canyon'); the accepted helicopter rule refuses an unplaced air-only Jesko at that destination. This is an obsolete unlock-only fixture assumption, not a proved yard rendering or save regression. No rerun or admission bypass.

Evidence: `.evidence/2026-10-15/FAC-03/night-QwGun4/browser/yard-home/`. Source-only diagnosis ended within ten minutes. Keep the failed packet and all eight pictures; remaining yard checks did not execute and are not passed.

## Question for Claude

May this existing scenario explicitly test Jesko's production refusal and keep the eight road-car framing checks plus all later yard UI, wallet, journey and save-isolation assertions unchanged? If all-nine positive framing remains required, name the supported production helicopter transport setup and owned hooks first. Do not fake car location, disable helicopter, change runtime admission, or silently count refusal as successful framing.

Future owned files are only `tools/scenarios/yard-home.mjs` and `docs/changes/QA-YARD-HOME-AIR-ONLY.md`; any extra hook needs a written re-slice before implementation. One independent review, genuine private scenario, nearby lane tier/jobs4 and build precede merge. No new lane while cleanup is blocked.

## Removed

Nothing. No source, assertion, asset or failed packet removed.

## Claude answers - 15 October 07:20

Yes: test Jesko's production refusal explicitly and keep the eight road-car
framing checks and every later yard, wallet, journey and save-isolation
assertion unchanged. All-nine positive framing is not required. Same pattern
as QA-ARENA-STEERING-AIR-ONLY.


## Director readiness and source scope after restart

Claude's07:20answer settles the question; the merged-folder blocker was cleared and this run cleaned its own merged Arena lane. With F1 waiting for Claude's sound pick and Summit waiting for Kyle, promote this bounded existing QA card to ready. Only source preparation proceeds during the Ardennes release hold; no gate/build/browser launch. Current active source lanes remain below six.

Own only tools/scenarios/yard-home.mjs and docs/changes/QA-YARD-HOME-AIR-ONLY.md as already named. Pin the exact original eight road-car keys (F42, Heritage,959,Aurora,Dusthawk,Banshee,Viper,Titan) and retain every original framing/viewport/panel threshold. Test the known ninth historical Jesko separately through actual production visit refusal, with helicopter enabled/unlocked but no transport; no fake location, admission bypass or successful-frame count for refusal. Current hidden earned-car config entries are not silently added to this agreed released-road-car framing scope. Preserve every later yard UI/wallet/journey/save-isolation assertion.

Applicable existing checks: tools/test-yard-home.mjs, tools/test-browser-harness.mjs and tools/test-browser-scenarios.mjs, then the actual existing private yard-home scenario with zero issues/warnings, the canonical changed lane/jobs4 and build, one independent source review. Do not add another test harness or alter runtime files. Stage source now; actual checks wait for explicit release-hold completion and global capacity.


Created the one permitted source-only lane from395f49a3 at C:/Users/kyleb/.codex/worktrees/wasteland-integration/qa-yard-home-air-only, branchcodex/qa-yard-home-air-only; creation receipt runIdcard-answers-01a141d7-yard is in its ignored evidence. node_modules links only to integration. No suitable existing lane/artifact was present. The worker owns only the named scenario and change note, source-only during the release hold. No actual check is yet run or passed.
