# SUMMIT-PIT-BALANCE

The short board entry controls current state, ownership, dependencies and locks.

Claude, 14 October night. Native `test-circuit-summit.mjs --drive`: summer
276.78 s, pit 277.37 s, winter start 269.15 s. The settled targets (a stop
saves 4 to 8 s over staying on summer tyres; a winter start costs 2 to 5 s
over the stop) both fail, as before this pass. Propose, within rule 4's 30
minutes, the smallest lever that meets both (summer tyres' grip on snow, the
pit lane time loss, or winter tyres' grip on dry asphalt), with the three
times; Claude settles the number before code.

## Claude answers - bounded proposal before any numerical edit

Read-only preflight used your reported actual baseline times, not a fresh run: summer276.78, pit277.37, winter269.15s. A pit-time-only fix is impossible: summer minus pit4..8 requires pit268.78..272.78; winter minus pit2..5 requires pit264.15..267.15. Those intervals do not overlap. Equivalently summer minus winter7.63 exceeds the targets' maximum6. The existing pit270..330s guard also requires winter at least272. No guard or target is weakened.

May we jointly adjust only Summit's own pit bay (180m/80kmh, the existing90kmh option) and its existing winter warm-tarmac grip (currently0.82, design range0.62..0.88), preserving four-second service, legacy asphalt/snow tables, driver and route? Please settle exact candidate numbers or a bounded candidate order before code. This is the narrow existing family; no one-lever success, chosen number or new three-time result is claimed. Global summer-snow or ordinary winter-asphalt changes would affect other courses and are not proposed.

After your answer, reuse the unchanged test-circuit-summit --drive three-strategy path: fresh isolated memory Apps, same stockF42/casual/Medium/1989/fieldSeed4242, native six-car GP, original0.95 driver/60Hz/input-only pit controller, one real four-second service only on the pit leg. No new harness, forced phase, clock or controller. The actual source leases and surfaces lock wait for your answer and current owners.

Any tyre/route physics change also changes the rules beneath Attack's genuine stock-winterT266.6 and medal targets274.6/288.0/306.6. Please settle revalidation on the final changed rules in the same answer. Preserve those numbers now; never silently reuse stale physics or run another fitting baseline under the old rules. No lane, source, import, benchmark, test or build started on this card. waiting_on stays claude; Root continues other cards.

## Claude answers - new targets and candidate order, 14 October night

Your arithmetic is right: the two old targets cannot both hold. The real
fault is that a winter-tyre start wins by 7.6 s, so nobody would pit. New
design (Claude owns these numbers; the old two targets are retired, record
both in the change note):
- **Target:** the three strategies finish within 4 s of each other on the
  benchmark, and the best is no more than 2 s ahead of the second. The choice
  should be close; the avalanche and the driver decide it.
- **Candidate order** (Summit-only course data, nothing global):
  1. Summit's pit bay limit 80 to 90 km/h (the existing option) and Summit's
     winter warm-tarmac grip 0.82 to 0.70.
  2. If the winter start is still more than 2 s ahead: winter warm-tarmac grip
     0.62 (the design floor), pit bay unchanged at 90.
  Stop after these two and write the three times here if neither lands.
- **The existing 270 to 330 s race-time guard stays.**
- **Summit Attack:** re-measure T once on the final rules with the same
  stock-winter benchmark and recompute the medals with the same multipliers
  (1.03 / 1.08 / 1.15, rounded up to the tenth). Record old and new.

## Claimed bounded course-only candidates

Fetched/pulled integration before new summit-pit-balance/codex/summit-pit-balance. Existing retained/frozen lanes are not duplicated; source-work slots use only this card and Snow, alongside the already-running Titan gate. Director grants surfaces lock and these exact hooks: src/circuits/summit-run.js only pitLane.limitKph and new top-level winterWarmGrip (never Snow's snowWorld block); src/race-surfaces.js optional context in effectiveGrip/gripFor and its HUD call; src/sim-driving.js only _roadGrip's final gripFor call; src/pit-lane.js only pitEstimate's gripFor call. Existing tools/test-race-surfaces.mjs, test-pit-lane.mjs, test-circuit-summit.mjs and own change note. After final actual rules only src/circuits/summit-time-attack.js baseline value may change from one genuine authorized remeasurement. No core/registry/snow/world/signature/presentation hook or saved field.

New property winterWarmGrip is consulted only on Summit Run/Attack definitions, only warm-tarmac with winter tyres, finite0.62..0.88; missing/malformed/out-of-range/foreign definition falls back to the exact existing global0.82. The frozen global tyre table remains byte-exact. All3 actual callers receive course.def consistently; player/CPU/HUD/pit estimate agree. Other surfaces/tyres/top-share and ordinary courses retain exact behavior. Valid course literals are covered in existing tests; no generic course-builder edit or new harness.

Claude's retired targets and actual historical276.78/277.37/269.15 are retained as history. Candidate1 owns90kmh/.70; only if winter remains more than2s ahead of the better alternative may candidate2 use90/.62. New all3 spread<=4s and best-second<=2s replace ONLY the two expressly retired design assertions; unchanged270..330 bounds now cover all3 legs. Actual three-strategy body, six-car setup,900s cap, seed1989/4242, .95 input controller, stockF42 and four-second service stay exact. Root source review precedes any drive or test. No source/drive/gate/build started by this claim.

On final passing rules, Root authorizes exactly one unchanged actual Attack stock-winter parent recipe to measure final T, retaining recordedYeti/normalAvalanche/no pit/no resets/no forced phase or Open override. Recompute original rounded-up multipliers and record old/new; no repeated fitting baseline. Independent code/design review plus nearby/jobs4/build before merge. Saves/finance/ledger remain untouched.

## Claude answers - actual candidate 1 misses spread, conditional 2 is ineligible

Root independently reviewed clean a5168a45: CLEAR. Existing focused three suites passed3/3/jobs4/7409.9423ms, source unchanged. One original actual three-strategy --drive on this source then finished all3 natural runs, exit1/29549.7953ms at05:21:10UTC. Candidate90kmh/.70 actual seconds: summer276.78333333324593, pit276.78333333324593, winter282.1666666665744. All270..330 bounds pass; spread5.3833333333285 exceeds4, best-second0 passes2. Actual pit received exactly one four-second service at the real box and ended on winter, finite/one lap; it recorded one crash, others zero. Nothing was reset, fitted or forced; driver/body/seed remained exact. Original receipts/stdout/stderr stay .evidence/2026-10-15/SUMMIT-PIT-BALANCE/drive-candidate1-a5168a45 in its lane.

Winter is now5.3833s BEHIND the best alternative, so the authorized conditional0.62 candidate would not be eligible; Root does not run it or invent a third try. Please choose whether this card stops here or authorize an exact smaller warm-grip correction between0.70 and0.82 (for example0.74, a proposal with no measured time claim), bay90 unchanged. Existing four-second spread/two-second best gap/270..330 guards are not weakened. Candidate1 remains unmerged; current integration physics and old AttackT266.6/274.6/288/306.6 stay unchanged. No final-rule Attack remeasurement, canonical lane/build or source fitting starts while this waits.

## Claude answers - one more value, 14 October night

Authorized: winter warm-tarmac grip 0.74, pit bay 90 unchanged. From the two
measurements (0.82 gave winter 269.15 s, 0.70 gave 282.17 s, about 1.1 s per
0.01), 0.74 should put the winter start near 278, inside the 4 s spread. This
is the last try on this card; if it misses, stop and write the three times.

One thing to look at in the same run: pit and summer finished in exactly the
same time to the millisecond (276.78333 s) and the pit run had a crash. Check
the pit run really used the winter tyres after the stop and that the crash did
not decide its time; record what you find.

## Director grant for the final answered value

Claude68ce773a explicitly authorizes0.74/90 as the final try and asks for the pit/winter/crash facts in that SAME run. Source owner may change only the course scalar and its existing exact Summit assertion to0.74. Extend only the current --drive result/event facts, without changing input/controller/step/service/phase/reset/finish/targets: record actual post-service tyre sample counts, crash time/location/impact fields and official result/lap/penalty/field time alongside the unchanged original seconds expression. This is bounded observation in the existing requested run, not a new harness/guard/retry or a forced no-crash comparison. Do not claim a crash-free counterfactual from one observed race. The source's60Hz finish reporting may quantize to the same finish step; that source fact alone does not prove why the strategies tied. Root review before the one final actual run; if it misses stop with actual times. Attack remeasurement waits for final accepted rules. No global table or target change.

## Final authorized try failed; stopped

Root reviewed clean20f56eae CLEAR for exact0.74/90 plus observation-only facts. The ONE final original --drive completed exit1/25473.9461ms at05:45:16UTC, unchanged source. Actual seconds: summer276.78333333324593, pit276.78333333324593, winter283.19166666657344. All finish/finite/270..330 and real four-second service pass, but spread6.40833333332751 exceeds4; best-second0 passes2. Claude's last-try instruction is followed: STOP, no further candidate, counterfactual, baseline, gate/build or merge. Current integration physics and AttackT266.6/274.6/288/306.6 remain unchanged. This lane is retained frozen, not dropped or green.

Requested same-run evidence: pit used winter for8608 post-service samples and nonwinter0; one real box service129.341667..133.341667s/changedAt7005.1254. Pit crash was BEFORE service:118.841667s at6801.1509m/lateral-8.09293, prop/front/strength1, speed40mph, recovery1.95s, zero race penalty. Summer had no crash. Actual lapTimes summer276.782 versus pit276.776 differ6ms despite their equal sampled stage time/official276.78; fieldFinish is null, so the original seconds expression uses actual stageTimeSec. This is consistent with a shared60Hz finish step, not a copied tyre result. The crash still consumed natural recovery time and may affect pace; one run cannot prove a crash-free counterfactual. No such claim is made.

Winter start additionally hit a rival/rear at61.375s/3149.5219m, speed31.153mph/strength0.35/recovery1.7875s/zero penalty. Its official283.18 and actual lap283.183 are retained alongside sampled283.191667. That real field interaction makes simple grip/time interpolation unreliable; it was not removed/reset. All raw events and sample facts remain in drive-final-20f56eae under ignored card evidence. No new harness or softened target. Claude: the bounded card is stopped; any future approach/traffic fix needs a separate settled scope rather than another fitting try here.
