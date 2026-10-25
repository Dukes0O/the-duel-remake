# GP-RACECRAFT

Kyle approved one new lane despite the HELI cleanup hold. Work is preview-only; cpu-racecraft remains dev. Owned files and the settled design are on the card.

## Implementation decisions before code

Keep the complete old path when the switch is off, including state shape and all random draws. Enabled racers start with their actual grid bias, relaxing over the greater of500m and the first braking entry only when the merge lane is clear. Recent player pace uses two-second sectors from the last ten seconds, normalized to the player's own road speed profile; lap pace is used after a completed lap. CPU nitro scales the player's upgrade/car formulas: extra acceleration and extra ceiling at0.5, recharge and close-pass refill at0.5, unchanged tank/drain. Existing contact, pace tuning and catch-up numbers stay unchanged. No new random draws are needed for boost use.

## Acceptance and verification

Three pre-change exact30-second complete field/RNG hashes are pinned in the existing race-field suite. Add opt-in grid, boost, passing, pit safety and determinism cases. The card-authorized racecraft-rate tool will compare the same seeds with the switch off/on across Panorama, Woods and Pacific Canyon, preserving actual failures and the20-race thresholds. A small probe precedes the full measurement. Final nearby/jobs4, production build and one independent code/numbers review are required; no full check or frame measurement here.

## Removed

Nothing yet. Existing drivers and all disabled-switch behavior stay required. No saves, released settings, artwork or current assets are removed.

## First probe and measurement definition

09c20a17 paired seed1989/field1000 on all three courses: slower-player passed3/3, nitro-from-last lap-one first0/3 versus2/3 baseline; normal CPU passes Panorama3->10, Woods10->10, Pacific3->6. No20-race pass claimed. Disabled Panorama already has18 recorded crashes versus12 enabled; the card's unchanged less-than8 bound is not met. Race-time changes in these pairs are all below1percent.

The initial tool sampled width only on the single frame when pole crossed braking entry. The implementation now measures the actual first braking zone (entry through apex), requiring all three cars to be inside it with the exact half-width longitudinal band and real lateral clearance. The original entry-frame verdict and all car positions remain in the packet for independent review. This fixes the newly written tool's coverage; it does not waive the card's3-wide/15-of20 threshold or claim that any previous probe passed.

## Bounded prototype handoff, 15 October 13:15 PT

Runtime/test/tool source87956894 is retained, off and unmerged. The final field suite passed1,275 checks, including the three pre-change full field/RNG hashes, enabled determinism, grid bias, measured player pace, half upgraded acceleration/ceiling, half refill/close-pass awards and no repeated/contact refill. The final production build passed in1.69s with the existing large-chunk warning. The later own-note commit changes no runtime.

The final first-zone diagnostic used actual App/stock-driver/physics with memory-only storage and no graphics: Panorama seeds index0 through5, each run long enough for every car to leave the actual braking-entry-to-apex zone (startZoneComplete:true). All six returned wide:false. Six failures already make15 successes out of the planned20 impossible for this source/seed series; the other14 starts and full20-race acceptance were not run. These60-second diagnostics are explicitly incomplete whole races, not finish/crash/balance passes. Receipt: integration .evidence/2026-10-15/GP-RACECRAFT/final-start-probe.json.

The earlier complete six-pair Panorama batch at318a3b58 had all7 CPUs finish in every enabled race, mean CPU-on-CPU passes4.8333 versus1.3333 disabled, and maximum paired mean CPU-time change1.9926percent. It still had zero three-wide starts and9 to16 recorded crashes per enabled race, above the unchanged less-than8 bound. That earlier source is not substituted for current-source whole-race evidence. Receipt: panorama-six-318a3b58.json. Earlier09c20a17 three-course probes retain their own exact results. No default fingerprint, tolerance, contact, track or pace table was changed.

The255-suite nearby selection on318a3b58 was intentionally cancelled during progress at75/255 before changing the nitro planner; its log ended at queued76/255. Only Root's exact GP runner15276 and verified own Node descendants were stopped. It is incomplete, not a suite failure or a lane pass. Final87956894 has no completed canonical lane tier or independent review. Do not merge, wire the preview switch on or count this card complete. Claude's Fire checks were untouched.

Stop this failed start-formation investigation here, within the30-minute rule. Next work needs a different start-lane approach in this same approved lane, preserving the settled design and all acceptance thresholds. The current planner now includes actual available nitro speed when deciding passes, but the final formation result still fails. After a substantive source fix, rerun the meaningful affected cases and current-source acceptance, then one complete nearby/jobs4, build and independent code/numbers review before merge/preview. No further lane exception, release, live change or cleanup bypass is granted.

## Distinct absolute-lane start approach, 15 October afternoon

After the Snow merge released the core lock, Kyle's continued-build instruction resumed this retained lane. Keep the real two-column grid. Replace the failed moving-line relative blend with an absolute road-lateral grid lane held through max500m/first-corner apex, followed by a smooth500m merge toward the current line only with a clear lane ahead. New state is switch-on only; avoidance/contact handling, CPU nitro0.5/0.5 and acceptance thresholds are unchanged. Add meaningful held-lane/current-line/late-corner regressions; old off fingerprints stay exact. This is a bounded new approach, not acceptance of earlier failures; probe and full acceptance remain pending.

## Revised start measurement implemented while heavy slots are occupied

Claude's16:00 answer keeps the absolute grid-lane runtime and replaces the obsolete three-wide verdict. The existing racecraft-rate tool now takes one actual first-braking-entry snapshot, including the player if first. It uses real per-car collision half-length/half-width, requires at least half the shorter car length of longitudinal overlap with no lateral body intersection, and finds distinct pairs so a car cannot count twice. Population lateral standard deviation uses only the leading six cars at that same instant. Two pairs and spread>=3m each need15/20. The old three-wide fields remain diagnostic only; old failed packets stay failed. Baseline pair/spread values are reported, not guessed from prior three-wide data.

Only tools/racecraft-rate.mjs and its already-owned new cases in tools/test-race-field.mjs change. Complete reporting now rejects duplicate/missing case identities, and retains every crash/pass/nitro/time/finish limit. Source runtime, pace, contacts, RNG and CPU0.5/0.5 values are unchanged. Initial import failed for missing new export; after implementation19pure formation/report checks pass, including exact half-length/3m boundaries,14versus15successes, single-file/overlapping bodies, shared-pair reuse, ignored seventh-car spread, missing snapshots and duplicate baselines. Both files parse and diff check passes. This fast arithmetic-only check starts no races and uses no heavy slot. Native twenty-race acceptance, complete field suite, final lane/build and independent code/numbers review are still pending. No preview/live enable, new lane or full batch has started.

## One bounded formation follow-up under Claude4084b892

Hold each absolute grid lane until its actual first braking entry, release it there into existing steering smoothing rather than holding through the apex. Formation blocks pass/dive/defend overrides but preserves safety/following clamps, pace and contact rules. At that first corner an outside overlapping car eases off with the existing following limit unless ahead by more than half its own body length; inside priority mirrors corner direction. Grid/core/contact constants and CPU nitro0.5/0.5 unchanged.

Claude written revised design: pairs/spread report-only beside actual off readings; per-course >=8-crash race count no worse than off, mean crashes<=off*1.1 and pile-ups<=off+1; passes>=2x off below8 mean, otherwise>=1.5x. Slowplayer-all, nitro<=5/20, complete fields and time2% unchanged. Existing test-race-field fixed fixture crash<8 stays untouched. Changed only this card new report/start-lane cases to the newly approved design; explicit boundary tests guard every new comparison.31 changed pure cases PASS, source parses/diffclean. Initial isolated block selection accidentally included an unchanged refill block without its import; corrected selection excludes that block, no simulation retry. One actual20racebatch/independent review/gate/build still pending; old failed360packet stays failed.

Current integration union had one feature-flags conflict: preserve released Yeti on and every current row plus cpu-racecraft dev. Coach, TeamRoom/poses, Summit and Ardennes current source kept; no runtime/asset/reference regeneration.


## Approved switch inventory completion, 16 October morning

Claude's written 08:30 card answer approves the precise CPU racecraft dev inventory row. Updated tools/test-feature-flags.mjs to require cpu-racecraft among the dev switches and count29 non-course entries rather than28; tools/test-wasteland-beta.mjs now names the same dev row in its exact catalog. Every existing catalog field, release-state assertion, physics/state fingerprint and crash fixture stays unchanged. The existing course-kit fixture copies these two files directly (tools/test-course-kit.mjs), so its copy receives the correction without another hook or framework.

Actual pure catalog checks: feature switches91checks PASS; wasteland8/8 PASS in102.4645ms. Neither command starts a browser, simulator, balance job, build or canonical gate. The source change is inventory only: the reviewed3b175051 runtime and its pending one approved native batch remain unchanged. No preview flag enable, native acceptance, lane/build or merge is claimed. The original failed packet remains failed, and interrupted restart packets remain incomplete.

Removed: no files or runtime paths replaced; no disposable outputs were created by these checks.


## Completed bounded follow-up failed, 16 October 10:59 PT

The one approved 20-seed, three-course, normal/slow/nitro, off/on batch completed all 360 actual cases on clean c674605fe921c96f2f3ee0b8fac6c9bbf9683a31 (runtime3b175051 plus approved inventory rows). Receipt source/after are equal, exit1, jobs4, duration3590872.3709ms, ended17:59:13.737621UTC. Wrapper43724, runner33468 and its children are verified drained. Every case finished the player and all seven CPUs. Actual report/receipt remain in this lane's .evidence/2026-10-16/GP-RACECRAFT/accept-c674605f. No gate, build, preview enable, merge, new simulation or retune follows this failed result.

| Guard, off -> on | Panorama Ridge | Tremblant Woods | Pacific Canyon |
| --- | --- | --- | --- |
| CPU passes, required factor | 1.65 -> 5.65; 2x PASS | 9.95 -> 10.15; 1.5x FAIL | 3.55 -> 7.70; 2x PASS |
| Races with >=8 crashes, on <= off | 16 -> 20 FAIL | 4 -> 10 FAIL | 0 -> 1 FAIL |
| Mean crashes, on <= off x 1.1 | 12.55 -> 13.45 PASS | 3.75 -> 8.50 FAIL | 0.10 -> 2.10 FAIL |
| Early pile-ups, on <= off + 1 | 2 -> 9 FAIL | 1 -> 3 FAIL | 0 -> 0 PASS |
| Slower player passed in all20 | 10/20 FAIL | 20/20 PASS | 16/20 FAIL |
| Nitro lap-one leaders <=5/20 | 0 PASS | 0 PASS | 3 PASS |
| Maximum paired CPU time change <=2% | 2.542759% FAIL | 1.690259% PASS | 1.752851% PASS |

Normal enabled crash ranges were8–24,2–17,0–8. Report-only distinct start-pair successes were2/20,2/20,1/20; spread>=3m successes5/20,0/20,5/20. These diagnostic readings are not gating and do not change the failures above. No cause is inferred from those counts.

The report and comparison rules were read once; no further simulation or changed target was used to diagnose the outcome. Claude's written one-attempt/fail decision now applies: park the retained lane. Its conditional preview-after-failure exception required crashes no worse than today, which this packet does not meet on any of the three courses. A different implementation/design needs Claude's written next direction; current targets, old fingerprints, original fixed crash fixture and CPU0.5/0.5 stay unchanged. Previous failed packets remain failed and the restart-interrupted packets remain incomplete.

Removed: nothing. Keep this unmerged source, the completed failed packet and its verdict; no foreign work, save, asset or live behavior changed.

## Racing-only batch FAILED, 24 October 2026

Start formation removed under `cpu-racecraft` (Claude 16 October 13:10): `startLaneTarget`, `insideCornerPriority`, the formation state in `race-field.js` and their tests are gone; grid bias starts at 0 as with the switch off. Field suite 1,296 checks pass; off-switch hashes unchanged; integration merged in (one feature-flag inventory conflict, the `cpu-racecraft` dev row kept). The one 20-race batch on 3b69ceb7 failed the crash, pile-up, slower-player-passed and (Woods, Pacific Canyon) passing targets, and Panorama and Pacific Canyon moved race time by more than 2%; the full table is on the card. No retune. The lane tier, build and preview flag were not done because the batch failed. Removed: the start-formation code and its tests.

## Nitro and real pace only: batch FAILED, 24 October 2026

Claude's 24 October direction: under `cpu-racecraft` keep only CPU nitro (0.5 / 0.5) and real-pace judging of the player; the extra pass types (racing-line side pass, 1.5 s window, passes before 10 s, nitro speed in the closing rate, wider crowded check) are off. Two choices where the direction was not exact: the nitro-aware closing rate was treated as an extra pass type and removed, so CPU nitro attacks and defends only on its own conditions; and `tools/racecraft-rate.mjs` now treats CPU passes, slower player passed and nitro leader as report-only. The test for opening passes before ten seconds and the reporter's passing-factor assertions were removed with the behaviour they described; no other assertion changed. Field suite 1,295 checks pass; off-switch hashes unchanged. The one 20-race batch on 98b936eb failed the crash guards (Panorama 8+-crash races 16 -> 17; mean crashes over the 10% allowance on Woods and Pacific Canyon) and Panorama race time (9.09%); full table on the card. Lane tier, build and preview flag not done. Removed: the extra pass-type code paths and their test.

## Accepted for Kyle's preview, 24 October 2026

Claude (design lead) accepted the nitro-and-real-pace batch (card, "Claude answers", 24 October): pile-ups match today on all three courses, the crash overages are within noise on tiny counts, and the 9% Panorama time change is the intended effect of CPU nitro. `cpu-racecraft` stays dev and is added to the desktop preview list in `start-preview.bat` (`tools/preview-flags.mjs` only prints the course-manifest flags, which the launcher test reads separately, so the switch is in the launcher's literal list and the launcher test passes, 23 checks). Production build passes. Nitro still decides lap one on Panorama and Pacific Canyon; that goes to GP-PASSING-2. Kyle drives the preview before anything goes live.

Checks on 98b936eb plus the preview and note commits (cloud Linux session): `node tools/run-tests.mjs --tier lane --changed --jobs 8 --keep-going` passed 262 of 268 suites, including the field suite, feature flags, wasteland beta, preview launcher and replay and signature guards; `npm run build` passed. The six suites that could not run here need the laptop (Windows Recycle Bin, Blender, the art library path or PowerShell, none touching this card's files): `test-course-kit`, `test-earned-cars-ui`, `test-full-check`, `test-medals`, `test-salt-flats-art`, `test-salt-flats`. The laptop's own lane tier before merge covers them.
