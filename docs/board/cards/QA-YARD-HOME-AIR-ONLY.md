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
