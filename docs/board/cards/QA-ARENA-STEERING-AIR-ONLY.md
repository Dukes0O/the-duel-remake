# QA-ARENA-STEERING-AIR-ONLY

The 15 October full check found a scenario admission failure on detached source `1c0cb3d0`. No lane or code is claimed. The original browser batch continues; do not stop or duplicate it.

## Actual failure and diagnosis

`arena-steering` failed with `Production arena entry failed`. Its private, memory-only report has no console issues or warnings and retains four pictures: High Falcone full-lock/release, then High Titan full-lock/release. The next requested car is `koenigsegg_jesko`. The scenario passed with all 14 pictures in the 14 October full-check browser packet on source `7ee1958a` before the helicopter switch-on.

The current production path is explicit: `_startArenaFight` refreshes the owner, selects the unlocked car, then calls `_airOnlyRefused(car, venueId)`. Helicopter is on; `AIR_ONLY_CARS` contains Jesko; `carAt` defaults its unplaced location to Tremblant Woods. The steering fixture unlocks Jesko but never transports it. Scrapdome admission is therefore refused under Kyle's accepted rule. This is an obsolete QA fixture assumption, not evidence that the steering physics broke. It is not an unchanged-game flaky failure and gets no blind rerun.

Evidence: `.evidence/2026-10-15/FAC-03/night-QwGun4/browser/arena-steering/report.json` and the four original pictures. Historical comparison: `.evidence/2026-10-14/FAC-03/night-99wbhD/browser/summary.json`. Source diagnosis took less than ten minutes; no native run, source edit or test was performed.

## Claude answers

Please settle the fixture update before code. Proposed: retain Jesko as an explicit production refusal check, then use the existing road-legal `viper_proto` as the third positive arena steering car beside Falcone and Titan. Keep both qualities, full-lock/release thresholds, natural Sal half-yaw window, actual App admission, memory-only storage and all physics/fingerprint assertions. The Viper choice has not been tested or accepted yet.

Do not disable helicopter, forge a transported location, bypass admission, delete the Jesko policy coverage or relax a numerical assertion to pass. If a different car or coverage is required, name it here. This concerns a rule Kyle decided, so the lead does not reverse it under the one-hour backup.

## Future scope and acceptance

Owned files, once an allowed lane is available: `tools/scenarios/arena-steering.mjs` and `docs/changes/QA-ARENA-STEERING-AIR-ONLY.md`. No App, helicopter, save or vehicle tuning change. New lanes still wait for the merged-folder cleanup rule.

Explain and independently review the changed fixture/assertions; keep the old failed packet. Verify the revised scenario on a private autoport with memory-only storage, then one nearby lane tier/jobs4 and build before merge. Do not rerun finished full-tier, frame or combat stages. The current full-check browser result remains failed for this scenario until a real repair is verified; no release or whole-batch pass is inferred.

## Removed

Nothing yet. The future change replaces an invalid positive Jesko admission assumption with explicit policy coverage and an agreed third positive car, rather than removing steering or refusal coverage.

## Claude answers - 15 October 05:20

Approved as proposed. Keep Jesko as an explicit refusal check (the air-only
rule Kyle accepted), and use `viper_proto` as the third positive arena
steering car beside Falcone and Titan, with every threshold and both
qualities unchanged. Explain the fixture change in the change note; one
review.


## Resumed after HELI cleanup, 15 October

The new-lane blocker is cleared by actual cleanup d2fdd649. Card-answer chat takes one isolated qa-arena-air-only lane within factory limits. Claude's 05:20 answer controls: explicit native Jesko refusal plus Viper beside Falcone and Titan, every existing threshold and both qualities unchanged. Own only existing scenario and change note; no App/car/save/admission edit. Keep original failed packet. Root schedules the one actual private scenario, nearby/jobs4 and build under shared heavy cap; source can be prepared while Summit gate and F1 work continue.


## Native and lane checks passed; build queued

Exact5c47121b remained clean before/after both checks. Native private42800 passed both qualities, fourteen pictures, zero errors/warnings, with explicit Jesko refusal and unchanged yard/run state plus Falcone, Titan and Viper steering coverage. Original canonical lane/jobs4/changed/keep-going/JSON passed20of20, zero failures/unrun, in537.208seconds. Root independent source review is CLEAR. Receipts and original results are in this newly owned lane's .evidence/2026-10-15/QA-ARENA-STEERING-AIR-ONLY.

Production build is not run yet: actual global heavy capacity remained full after the gate. Please leave the next free slot for this brief final build, then this chat's queued focused/source-capture work. No lane rerun or browser repetition is planned on unchanged source. Only after build passes may integrate-lane consume exact evidence, followed by ownership-checked cleanup of this newly created lane.

## Root takes the already-queued final build

Cups final gate23232 is admitted, so its reservation is consumed. Root will execute the single remaining production build on clean5c47121b when actual global roots fall below3, then use the next turn for combined Ardennes High. The owning card-answer chat must not duplicate this build or start F1/Summit ahead of the recorded turns. No source, native scenario or lane rerun. Root writes .evidence/2026-10-15/QA-ARENA-STEERING-AIR-ONLY/build-receipt.json and build.log in that existing lane, with exact source/post SHA, exit code and measured duration. An already-current passing receipt is reused rather than rebuilt. Root may consume the already-reviewed green20/20/native14 evidence for the integration merge once this build passes; preserve this other-chat lane for its owning-session cleanup, with no false current-run deletion claim.


## Owning chat acknowledges the build handoff

Card-answer chat acknowledges Root's final-build/merge takeover above. Its own two admission guards held before npm started; no production build ran here, no receipt claims a pass and frozen5c47121b stays clean. Reuse Root's single exact passing receipt. When merging, fold the actual native14, canonical20/20, build and independent review results into this card's existing change note in the merge itself; its original Validation paragraph still says pending. This follows Kyle's no-result-only-commit rule and avoids changing frozen lane source merely to record outcomes. Owner retains the current-run creation receipt and will perform its own verified Recycle Bin cleanup only after the merged source is confirmed.

## Integrated after the queued final build

Root consumed exact5c47121b native14/bothqualities/zeroissueswarnings, canonical20/20/jobs4/zero failures-unrun537207.8662ms, independent Root source review CLEAR and productionbuild4297.1685ms/clean before-after. Conflict-free merge, no rerun. Actual validation replaces the pending paragraph in the same merge. Historical night batch remains119/129 with this original failure retained, not retroactively green. Owning card-answer chat may now perform its own current-run receipt-checked Recycle Bin cleanup; Root does not remove this other-chat lane. No release/live change.
