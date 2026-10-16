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