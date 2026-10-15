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
