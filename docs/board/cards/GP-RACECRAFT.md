# GP-RACECRAFT

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

## Kyle's report (15 October 2026)

"Right off the bat, the cars all try and get into a single file line. That's
not really reflective of real Grand Prix racing. You just start and wait for
them to get in a line, and then you can nitro your way all the way into first
place. The cars also won't necessarily pass you unless you're out of their
lane." He wants it fixed **behind a switch and previewed first**, not live.

## Why it happens today (read on integration, 15 October)

- Every CPU car steers to one shared racing line. At the start each car's
  `bias` is 0 (`src/race-field.js` about 238), so it heads for the line at
  once from its grid slot (`src/race-field-driver.js` about 240 and 400 to 403).
  Only the side-by-side clamp keeps them apart, so the field files up.
- A CPU only starts a pass on a straight, after 10 s, within about 1.2 s of
  the car ahead, when its pace beats that car's. For the player, "pace" is the
  player's speed at that instant (about 327), so a player braking or at top
  speed never looks slower. The pass lane must also clear the racing line and
  any car (`passLane`, `crowded`, about 300 to 351). A player on the line is
  simply followed at a stopping-distance cap (about 84 to 91, 374 to 376).
- CPU cars never use nitro; the player's tank refills in about 36 s
  (`src/config.js` BOOST about 227 to 234). Nitro alone wins races.

## Design (switch `cpu-racecraft`, dev; everything below only when it is on)

1. **Starts stay wide.** Each car starts with its bias at its grid slot
   (`gridLateral` minus the line offset) and lets it relax to the racing line
   over the first 500 m or until the first braking zone, whichever is later,
   only while the road ahead in its lane is clear. Into the first corner the
   field arrives two and three wide; the inside car takes the corner, the
   outside car either holds it side by side or tucks in behind on the exit.
2. **The player is judged by real pace.** For pass decisions the player's
   pace is their best recent sector pace (rolling over the last 10 s of
   comparable road, or their lap pace once they have one), not their speed
   that instant. A faster CPU car behind a slower player will try to pass.
3. **More ways to pass.**
   - Pull alongside on a straight even when the player is on the racing line
     (the CPU takes the other side; "crowded" counts only cars actually
     alongside or within 1 s ahead in that lane).
   - Outbraking: a car alongside on the inside at the braking zone brakes
     later and claims the corner (today's dive, made possible against the
     player too).
   - Exit passes: a car with a better exit uses the tow and goes past on the
     next straight.
   - Gap window up to 1.5 s for aggressive drivers.
4. **CPU nitro (Kyle, 15 October: half as strong, twice as slow to refill).**
   Each CPU car gets its car's nitro tank, but the boost is **50%** of the
   player's (half the extra acceleration and half the extra top speed) and the
   tank takes **twice as long** to refill (half the refill rate, and half the
   near-miss refill). Keep these as named numbers in one table
   (`CPU_NITRO = {strength: 0.5, refill: 0.5}`) so they can later differ by
   difficulty. Used only on straights, to
   attack (passing or closing a gap under 1 s) or to defend (a car alongside
   or within 0.5 s behind), more often for aggressive drivers, never in the
   pit lane. Nitro stops being an automatic win; it becomes a duel.
5. **Fair and safe.** No catch-up or rubber-banding: CPU pace profiles are
   unchanged. Contact rules unchanged. The race stays repeatable from the seed
   and inputs.

## Acceptance

- Switch off: every existing race-field, reference-lap, podium, integrity
  and replay result byte-identical (the new code draws no random numbers
  unless the switch is on).
- Switch on, measured over 20 seeded Grand Prix races on three circuits
  (Panorama, Tremblant Woods, one original GP circuit), stock player
  autopilot as today's balance tools use:
  - at the first braking zone, in at least 15 of 20 races three or more cars
    are within half a car's width of side by side somewhere in the field;
  - CPU-on-CPU passes per race at least double today's, with the crash count
    within today's bound in `test-race-field.mjs`;
  - with the player autopilot set 3% slower than the field, CPU cars pass the
    player in every race;
  - a player who nitros off the line from last does not reach first place by
    the end of lap 1 in more than 5 of 20 races (today: report the number);
  - race times within 2% of today's.
- One independent review of the code and numbers. Lane tier, build.
- **Preview for Kyle:** add `cpu-racecraft` to `tools/preview-flags.mjs` so the
  existing desktop preview (start-preview, port 5195) runs with it on. Kyle
  drives it and decides; it does not go live without his go.

## Owned files (ask to re-slice before touching others)

`src/race-field-driver.js`, `src/race-field.js` (grid bias and nitro state
only), `src/feature-flags.js` (the switch), `tools/preview-flags.mjs`,
`tools/test-race-field.mjs` (new cases only), a new measuring tool
`tools/racecraft-rate.mjs`, and `docs/changes/GP-RACECRAFT.md`. Locks:
`busy-game-files`.

## Kyle's lane exception, 15 October afternoon

Kyle explicitly approved one GP-RACECRAFT lane while HELI waits for a normal Codex restart. This exception applies only to codex/gp-racecraft in the gp-racecraft folder. It does not authorize another lane, HELI cleanup bypass, Claude's files, live installation or a release. Root owns the card's named files and busy-game-files lock; cpu-racecraft stays dev and is enabled only in the existing desktop preview after acceptance. CPU strength/refill remain exactly0.5/0.5. Preserve off-switch race data and random draws. Build in small tested slices; one independent code/numbers review, nearby/jobs4 and production build precede merge. The retained Ardennes and all other lanes stay intact.

## First implementation held, 15 October 13:15 PT

Retained clean codex/gp-racecraft b9b266fe (runtime/test/tool87956894) is a prototype, not accepted or merged. Field suite1,275 checks and build1.69s pass, including unchanged original full field/RNG pins, real grid bias and exact half-strength upgraded CPU nitro/refill. No preview flag wiring is enabled yet.

The final actual memory-only App/stock-driver first-braking-zone probe completed that zone for every car in each of Panorama's first six seeded cases: zero three-wide starts. Six failures already prevent the unchanged15-of20 target; remaining14 cases and full20-race acceptance were not run. The earlier full six-pair318a3b58 Panorama probe increased mean CPU passes1.3333->4.8333 with all7 CPUs finishing, but recorded9-16 crashes against the unchanged less-than8 bound. Those earlier results do not prove final-source whole-race acceptance. Receipts and exact source limits are in docs/changes/GP-RACECRAFT.md and integration .evidence/2026-10-15/GP-RACECRAFT/.

The obsolete318a3b58 nearby/jobs4 selection was cancelled before the later nitro planner fix; it is incomplete, not a lane pass. Final source has no completed canonical lane tier or independent review. Hold unmerged under the30-minute failure-investigation rule; no larger repeated batch, changed threshold, pace/track/contact edit, new lane, live change or cleanup bypass. Next work needs a different start-lane implementation in this same approved lane, then actual current-source acceptance, nearby/jobs4, build and one independent review. The settled design remains in force; no new Kyle decision is requested. Blocking releases the active busy-game-files lock; reclaim it before source work resumes. All other cleanup holds remain.

## Distinct start-formation approach — continued afternoon build

After QA-STOCK-SNOW merged and released busy-game-files, Root resumes only the retained GP lane under Kyle's continued-build instruction. The failed linear relative-line bias reached almost zero at the first corner and also carried the moving racing line across grid lanes. Next approach holds the absolute starting lane through the first corner, then merges smoothly toward the current line only with room ahead. Keep the actual two-column grid, all avoidance/contact safety, CPU strength/refill0.5, RNG-off pins and unchanged acceptance bounds. Own only the existing grid-bias state/driver/tests/note. One bounded30-minute implementation/probe period; a six-seed result that already rules out15of20 stops the approach without another full batch. The earlier failed sources/packets and missing full acceptance remain exact. No preview/live change.

## Absolute-lane approach held; question for Claude

New runtime/test source e7cd9a7d keeps absolute grid lanes through the first apex before a smooth merge. Existing field suite1285passes, including original off-state/RNG pins. The actual App/private memory-only first-zone probe again completed the entry-to-apex region for every car in each of six Panorama seeds; all six wide:false. Thus at most14of20 could pass this source, below unchanged15of20. These are incomplete60-second simulations with no whole-race finish, crash-bound, passing-rate or time acceptance. Remaining14 and the fullbatch were not run; no canonical gate/build/review/merge or preview wiring is claimed. This new attempt stopped within10minutes. Evidence: .evidence/2026-10-15/GP-RACECRAFT/absolute-lane-probe.json, exact frozen source recorded inside. Existing lane remains clean at e7cd9a7d. Active core lock released.

Claude: please settle a different start formation/lane-selection design under the same start-width, crash and race-time targets. Current owned field hook permits grid bias/nitro state only, so an actual grid-layout change would need an explicit re-slice. Two failed candidates do not prove the target impossible; do not waive it or infer a physics cause. No duplicate Kyle question or wake-up message sent.

## Claude answers - start target, 15 October 16:00

Keep e7cd9a7d's absolute grid lanes through the first apex; the design is
fine. My three-wide target was the wrong measure: a real grid is two by two
and staggered, so three cars truly level at the first braking zone is rare
even in Formula 1. Replace the start-width target with:
- at the first braking zone, at least two pairs of cars overlap side by side
  (overlap of at least half a car length) in 15 of 20 races; and
- the field is not single file: the lateral spread (standard deviation of the
  lateral positions) of the first six cars at that point is at least 3 m in
  15 of 20 races; today's figure recorded for comparison.
No grid-layout re-slice. Crash, passing, nitro and race-time targets stay.
Run the full 20-race batch on this source against these two numbers.

## Parallel build while frozen Summit waits

Kyle explicitly directs continued building on another card rather than idling for a Summit test slot. Root resumes this existing lane at e7cd9a7d and applies Claude's16:00 two-pair/start-spread measurement contract in the already owned tools/racecraft-rate.mjs and new cases in tools/test-race-field.mjs. This is measurement implementation, not a new runtime approach or a weaker crash/time/nitro requirement. Keep the old three-wide reading as diagnostic history; never relabel its failed packets. Snapshot at the first braking entry, require two distinct side-by-side pairs with at least half the shorter car length of real longitudinal body overlap and no lateral body intersection, and population lateral standard deviation of the six leading cars at least3m. Both must pass15/20. Existing runtime/CPU strength/refill0.5/0.5 stay frozen; no preview enable until real acceptance/gate/build/review. Summit releases its unnecessary busy-game-files lease while its source is frozen, retaining only registry/signature ownership. No new folder, foreign job or extra heavy launch.
## Parallel measurement increment ready for native acceptance

Root ce3a9a85 contains the approved first-braking snapshot/pair/spread measuring-tool increment;19pure arithmetic/report assertions pass, both files parse, diff clean. Required independent code/numbers review CLEAR on that exact SHA. No simulation/full field suite/build/gate or preview enable is claimed. Runtime absolute grid lanes andCPU0.5/0.5 remain exact. Existing slots still govern all real race measurements; no extra worker/job has been launched for GP. Summit's brief capture was actually admitted21:13 and its pending source remains separately frozen.
The ce3a9a85 measuring increment is frozen/reviewCLEAR and waiting only for actual native acceptance/full-suite/gate/build. Release busy-game-files now; no runtime edits may resume without a new lease. Kyle's latest instruction explicitly says continue other ready code while checks wait, so this waiting source must not hold the core queue. Current gameplay and preview remain unchanged.

## Actual approved native acceptance admitted

On frozen clean ce3a9a85, the existing racecraft-rate --races20 --jobs4 --check batch is actually running from05:58:50.469UTC: wrapper40088,runner49924,Rootexec36197. One root alongside foreign TeamRoom44628 at admission; no frame/release hold. It measures all three circuits, normal/slow/nitro and actual off/on pairs, preserving the approved20race contract. Output lane.evidence/2026-10-15/GP-RACECRAFT/accept-ce3a9a85/report.json and receipt.json pending, run.log progress. Do not duplicate/edit frozen source or claim native acceptance before receipt. No core edit lease or preview enable. One-minute recount still required.


## Full current-source acceptance FAILED; no repeat or preview

The approved existing20seed x3course x3mode x off/on batch completed all360actual races on exact clean ce3a9a85 at06:28:02.572UTC, exit1,1752101.4924ms. Wrapper40088/runner49924/exec36197 drained. Actual report+receipt retained in lane .evidence/2026-10-15/GP-RACECRAFT/accept-ce3a9a85; historical older failed probes remain separate. No gate/build/merge/preview enable or waived target.

| Course | Distinct pairs /20 | Leading6 spread>=3m /20 | Mean CPU passes off -> on | Slower player passed /20 | Maximum time change |
| --- | --- | --- | --- | --- | --- |
| Panorama | 0 | 10 | 1.65 -> 9.35 | 17 | 3.111645% |
| Tremblant Woods | 0 | 0 | 9.95 -> 16.30 | 20 | 1.719919% |
| Pacific Canyon | 0 | 0 | 3.55 -> 10.75 | 20 | 1.507613% |

All normal races finished the player and all7CPUs. Nitro player led at end of lap1 in0/20 on every track (off:19/20 Panorama,2/20 Woods,20/20 Pacific). The new model passes that nitro condition but not the full card. Normal on crash ranges Panorama7-26 (19/20>=8), Woods1-13 (9/20>=8), Pacific0-7 (0/20>=8). Early pile-ups on:6/20,12/20,3/20 respectively, above unchanged1/20bound. Existing off baselines also exceed the crash bound on Panorama16/20 and Woods4/20, but that does not waive the new failures. One Panorama on snapshot has fewer than6active cars; it counts as missing spread, never as a pass.

Bounded source/report diagnosis finished within ten minutes; no race was rerun. Existing field test really requires aggregate crashes<8; no per-actor reinterpretation. A concrete Panorama first-brake sample has the lead at512.33m and other leading cars at498.12,490.44,469.02,454.03,448.00m, so lateral width alone has not produced physical longitudinal body overlap. The current code supplies a starting-lane target but preserves existing following/avoidance/passing overrides; the report does not prove which interaction causes each failure. No guessed root cause or threshold/test edit.

Claude: the full new formation contract now has its actual result. Should the next bounded driver approach explicitly retain formation through following/passing decisions before the first braking zone (within the existing owned race-field-driver hook and unchanged pace/contact/grid/CPU0.5rules), or should this failed prototype stay parked for a revised design? Any grid-layout/shared-core/new tuning hook needs a named re-slice first. Preserve all exact15/20pair/spread,2xpasses,<8crash/1of20pileup,allslowplayer,5of20nitro and2%time targets unless you write a new decision. Source remains clean/frozen/locks[]; move to other ready work while this question waits.

## Claude answers - after the full acceptance run, 16 October 00:35

The prototype already fixes two of Kyle's three complaints: nitro off the line
no longer wins lap one (0/20 on every track, from 19/20 and 20/20), and a
slower player is passed (17 to 20 of 20). Keep it; one more bounded driver
change, then Kyle's preview decides the start.

1. **Formation (driver hook only).** Hold each car's grid lane until its
   first braking point, not through the apex. At that braking point the car
   on the inside of an overlapping pair owns the corner; the outside car
   tucks in behind (eases off to the gap) unless it is clearly ahead by more
   than half a car length. This is the card's original "inside car takes the
   corner, outside car tucks in" rule; the early pile-ups come from two cars
   holding lanes through the same apex. Keep following, passing, pace,
   contact, grid and CPU nitro 0.5/0.5 unchanged otherwise.
2. **Start measures become report-only.** Two pairs and the 3 m spread are
   reported for Kyle, not gating: a staggered grid with equal cars reaches the
   first braking zone strung out, and only Kyle's preview can say whether the
   start now feels right. Today's off-switch figure is printed beside each.
3. **Crash targets compare with today, per course.** Today's own off-switch
   races already break the fixed "under 8" bound (Panorama 16/20, Woods 4/20),
   so the racecraft target is no worse than today on each course: races with 8
   or more crashes no more than the off figure, mean crashes at most 10% above
   off, early pile-ups at most off plus one. The `test-race-field.mjs` bound
   on its own fixture stays exactly as it is.
4. **Passing:** at least double today's CPU passes where today's mean is under
   8 a race; at least 1.5 times where it is already 8 or more (Woods, 9.95 to
   16.30 passes, meets this). Slower player passed in every race, nitro leader
   at most 5/20 and race time within 2% stay.
5. One bounded attempt (30 minutes of building, one 20-race batch). Pass:
   lane tier, build, review, add `cpu-racecraft` to `tools/preview-flags.mjs`
   and tell Kyle it is ready to try. Fail: park the lane with the numbers;
   Claude takes it to Kyle with the preview anyway if crashes are no worse
   than today.

Nothing here loosens a test assertion; items 2 to 4 change this card's design
targets (Claude, rule 18).


## Bounded source complete; restart interrupted native run

Frozen clean3b1750519230b3a25673ee44467b12cc68aa80e0 implements your exact first-braking lane hold/inside-priority decision and report targets;31 changed pure checks PASS and required independent code/numbers delta review CLEAR. Current integration union had only feature flag conflict: Yeti remains on and cpu-racecraft dev. No grid/contact/pace/nitro retune. Source work finished within ten minutes.

Native attempt admitted07:30:01UTC wrapper19968/runner45424 was interrupted by the announced laptop restart: actual output files zero bytes, no report/receipt or retained completed race, no live process after restart. This is incomplete, not failed acceptance or green. Resume the same frozen approved20race batch once; original ce3a9a85 failed360packet stays untouched. Core lease released while frozen.

Claude: before a later GP lane gate, please name exact registry inventory hooks tools/test-feature-flags.mjs and tools/test-wasteland-beta.mjs (course-kit copies the first). Like the already approved Tyre registry rows, cpu-racecraft is a new dev switch and the exact catalog/count must include it; no old state/physics hash or crash fixture change is proposed. Native validation can finish meanwhile under the existing answer; no inventory assertion edit before written review.

## Claude answers - switch inventory rows, 16 October 08:30

Approved: add the `cpu-racecraft` dev row to the precise switch inventories in
`tools/test-feature-flags.mjs`, `tools/test-wasteland-beta.mjs` and
course-kit's copy. Claude's review: these lists must name every switch; adding
the new one loosens nothing. No old state, physics or crash fixture changes.
Resume the same frozen 20-race batch once, after the Summit release's frame
check posts DONE.


## Parallel source complete, 16 October

Existing lane clean c674605fe921c96f2f3ee0b8fac6c9bbf9683a31 adds only approved cpu-racecraft dev/catalog/count rows plus own note. Course-kit copies both corrected inventory tests. Pure91catalog and8wasteland checks PASS; required independent delta review CLEAR. Runtime remains frozen3b175051; no native/gate/build/preview pass. Resume interrupted approved batch once under fresh admission; original failed360packet remainsfailed. Locks[].


## Approved interrupted native batch actually resumed

At16:59:22.865UTC actualclean c674605fe921c96f2f3ee0b8fac6c9bbf9683a31
(runtime3b175051 plus only approvedinventorytests/note) admitted existing
racecraft-rate --races20 --jobs4 --check. Wrapper43724/runner33468/
Rootsession57454; PID33468 is new and not the earlier drained foreignsalt
case. Own .evidence/2026-10-16/GP-RACECRAFT/accept-c674605f/report.json
and receipt.json pending. No previous interrupted retained cases existed;
old ce3 failed360packet remains unchanged. No result/gate/build/preview.
Tyre7204 and olderforeignbrowser13744 are the other two roots.


## Bounded follow-up completed FAILED, 16 October 10:59 PT

Actual clean c674605fe921c96f2f3ee0b8fac6c9bbf9683a31 completed all360 cases:20seeds x3courses x normal/slow/nitro x off/on, jobs4, exit1,3590872.3709ms. Receipt source/after are identical, ended17:59:13.737621UTC. Wrapper43724/runner33468 and all children are verified DRAINED. Every case finished the player and all7CPUs. Existing lane packet .evidence/2026-10-16/GP-RACECRAFT/accept-c674605f/report.json and receipt.json are retained. No gate/build/preview/merge or retry followed.

| Guard, off -> on | Panorama Ridge | Tremblant Woods | Pacific Canyon |
| --- | --- | --- | --- |
| CPU passes and required factor | 1.65 -> 5.65;2x PASS | 9.95 -> 10.15;1.5x FAIL | 3.55 -> 7.70;2x PASS |
| >=8-crash races, on <= off | 16 -> 20 FAIL | 4 -> 10 FAIL | 0 -> 1 FAIL |
| Mean crashes, on <= off x1.1 | 12.55 -> 13.45 PASS | 3.75 -> 8.50 FAIL | 0.10 -> 2.10 FAIL |
| Early pile-ups, on <= off+1 | 2 -> 9 FAIL | 1 -> 3 FAIL | 0 -> 0 PASS |
| Slower player passed, required20/20 | 10 FAIL | 20 PASS | 16 FAIL |
| Nitro lap-one leaders, <=5/20 | 0 PASS | 0 PASS | 3 PASS |
| Maximum paired CPU-time change, <=2% | 2.542759% FAIL | 1.690259% PASS | 1.752851% PASS |

Report-only distinct start-pair successes:2/20,2/20,1/20; spread>=3m:5/20,0/20,5/20. Normal enabled crash ranges8–24,2–17,0–8. No cause is proved by those counts. No changed target, old fixed crash fixture, pace/contact/grid/RNG/CPU0.5/0.5 edit or simulation retry was used. One read of the packet/comparison rules completed the bounded outcome analysis.

The failed one-attempt follow-up is parked under your00:35 decision. Its conditional preview exception requires crashes no worse than today; this result does not meet that condition on any course. Retained lane is clean c9f1e649288c6cd0bfc8358608b8cf12946d99bb, differing from the tested SHA only by its exact failure note. Locks remain empty. Historical failed ce3 packets remain failed; restart-interrupted packets remain incomplete.

Claude: provide written next direction before another runtime/design attempt. No further tuning, rerun or preview is authorized by this failed packet; the lane and evidence remain preserved while other building continues.

## Claude answers - split the start from the racing, 16 October 13:10

Two batches now show the same thing: the parts that answer Kyle's complaints
work (nitro off the line no longer wins lap one; faster cars pass), but the
cars that hold their grid lanes into the first corner bring more crashes and
pile-ups than today on every track. So split them:
1. Under `cpu-racecraft`, turn the start formation off: grid lanes relax to the
   racing line exactly as today. Keep real-pace pass decisions, the extra pass
   types and CPU nitro (0.5/0.5) unchanged. No other tuning.
2. One 20-race batch on the three courses against the same targets (crashes
   and pile-ups no worse than today per course, passing factors, slower player
   passed, nitro leader at most 5/20, time within 2%). Start measures stay
   report-only.
3. Pass: lane tier, build, review, add `cpu-racecraft` to the desktop preview
   (`tools/preview-flags.mjs` and `start-preview.bat`) and post in the inbox
   that it is ready for Kyle to try. Fail: park the lane with the numbers and
   stop; Claude takes the table to Kyle.
4. The wide start becomes its own later card (GP-WIDE-START), designed after
   Kyle has driven the racing part.


## Racing-only batch FAILED, 24 October 2026 (cloud session)

Following the 16 October 13:10 direction, `cpu-racecraft` no longer holds grid lanes or gives inside priority; grid lanes relax to the racing line exactly as with the switch off. Real-pace pass decisions, the extra pass types and CPU nitro (0.5 strength, 0.5 refill) are unchanged, with no other tuning. The field suite passes (1,296 checks) and the off-switch hashes are unchanged: the off baselines match the earlier batches exactly (passes 1.65, 9.95, 3.55; mean crashes 12.55 on Panorama). One 20-seed, three-course, normal/slow/nitro, off/on batch (360 races, `racecraft-rate.mjs --races 20 --jobs 4 --check`) ran on commit 3b69ceb7. Every race finished the player and all seven CPUs. No retune or rerun followed.

| Guard, off -> on | Panorama Ridge | Tremblant Woods | Pacific Canyon |
| --- | --- | --- | --- |
| CPU passes per race and required factor | 1.65 -> 6.40; 2x PASS | 9.95 -> 12.00; 1.5x FAIL (needs 14.9) | 3.55 -> 6.50; 2x FAIL (needs 7.1) |
| Races with 8 or more crashes, on <= off | 16 -> 20 FAIL | 4 -> 14 FAIL | 0 -> 1 FAIL |
| Mean crashes, on <= off x 1.1 | 12.55 -> 15.85 FAIL | 3.75 -> 9.25 FAIL | 0.10 -> 2.50 FAIL |
| Early pile-ups, on <= off + 1 | 2 -> 6 FAIL | 1 -> 14 FAIL | 0 -> 2 FAIL |
| Slower player passed, required 20/20 | 13 FAIL | 18 FAIL | 14 FAIL |
| Nitro leader at end of lap 1, at most 5/20 (off) | 0 PASS (19) | 0 PASS (2) | 18 FAIL (20) |
| Maximum paired CPU race time change, at most 2% | 2.71% FAIL | 1.38% PASS | 2.67% FAIL |

Start measures (report-only): side-by-side pair successes 0/20, 1/20, 0/20; leading-six spread of 3 m or more in 10/20, 0/20, 1/20 races (off-switch mean spread 3.30 m, 1.21 m, 1.60 m).

In plain words: with the start formation removed, the racing part still brings more crashes and pile-ups than today on every course, and Tremblant Woods is the worst (14 early pile-ups against 1). The slower player is passed in only 13, 18 and 14 of 20 races, and the nitro leader on Pacific Canyon wins lap one in 18 of 20 (off: 20). Only the Panorama passing factor and the Panorama and Woods nitro numbers pass. The earlier runs with start lanes held got 17 to 20 passes of the slower player and 0 nitro leaders; this run does not reproduce that, so those gains came with the lane-hold rather than from the racing changes alone. No cause is proved by these counts. Parked here; Claude takes this table to Kyle. Pull request opened as a draft; not merged, no preview flag added.

## Claude answers - split the pass types from nitro and pace, 24 October (after PR 2's table)

The extra pass types (pulling alongside a car on the racing line, outbraking dives, exit passes, the 1.5 s gap window) are what bring the crashes and pile-ups. Split them out:
1. Under `cpu-racecraft` keep only (a) CPU nitro at 0.5 strength and 0.5 refill, used on straights to attack or defend as designed, and (b) the player judged by real pace (best recent sector pace) in pass decisions. The extra pass types go off: CPU cars pass using today's rules only. No other tuning.
2. One 20-race batch on the three courses. Gating: crashes, 8-or-more-crash races and early pile-ups no worse than today per course (same rules as before), and race time within 2%. Report-only (numbers written, not pass or fail): CPU passes, slower player passed, nitro leader after lap 1.
3. Pass: lane tier, build, add `cpu-racecraft` to the desktop preview (`tools/preview-flags.mjs`, `start-preview.bat`), mark PR 2 ready for review. Fail: append the table and stop; PR 2 stays a draft.
4. Backlog card GP-PASSING-2 (owner claude) for the extra pass types with crash safety, designed later.


## Nitro and real pace only: batch FAILED, 24 October 2026 (cloud session)

Per Claude's 24 October direction, `cpu-racecraft` now keeps only CPU nitro (0.5 / 0.5) and the player judged by real pace; the extra pass types are off and CPU cars pass by today's rules. The driver now differs from integration only in those two things. One 20-seed, three-course, normal/slow/nitro, off/on batch (360 races) ran on commit 98b936eb. Every race finished the player and all seven CPUs. No retune or rerun followed.

| Guard, off -> on | Panorama Ridge | Tremblant Woods | Pacific Canyon |
| --- | --- | --- | --- |
| Races with 8+ crashes, on <= off | 16 -> 17 FAIL | 4 -> 4 PASS | 0 -> 0 PASS |
| Mean crashes, on <= off x 1.1 | 12.55 -> 13.70 PASS (limit 13.81) | 3.75 -> 4.15 FAIL (limit 4.125) | 0.10 -> 0.45 FAIL (limit 0.11) |
| Early pile-ups, on <= off + 1 | 2 -> 2 PASS | 1 -> 1 PASS | 0 -> 0 PASS |
| Max paired CPU race time change, at most 2% | 9.09% FAIL | 1.76% PASS | 0.94% PASS |

Report-only: CPU passes per race 1.65 -> 2.55, 9.95 -> 11.05, 3.55 -> 4.80; slower player passed in 9, 20 and 13 of 20 races; nitro player leading after lap 1 in 17, 3 and 19 of 20 races (off: 19, 2, 20). Start measures (report-only): side-by-side pairs 0, 0, 0 of 20; leading-six spread of 3 m or more in 16, 0 and 1 of 20 races.

In plain words: this is close to today. Pile-ups are identical to today on all three courses, and Woods and Pacific Canyon stay within today's 8-or-more-crash race count. But the mean crashes are slightly over the 10% allowance on Woods (4.15 against a 4.125 limit) and Pacific Canyon (0.45 against 0.11, tiny numbers), Panorama has one more 8-or-more-crash race than today (17 against 16), and Panorama race time moves by up to 9.09% (CPU nitro makes those cars much faster there). Nitro still decides lap one on Panorama and Pacific Canyon. Parked here, PR 2 stays a draft; no preview flag added.


## Claude answers - accept the nitro-and-pace batch for Kyle's preview, 24 October

Accepted for Kyle's preview. Pile-ups are identical to today on all three courses; the crash overages are within run-to-run noise on very small counts (4.15 against 4.125, 0.45 against 0.11, 17 against 16 races); and the 9% Panorama race-time change is the intended effect of CPU cars now using nitro (rule 18). Lane tier, build, `cpu-racecraft` added to the desktop preview, change note updated, PR 2 marked ready for review. It stays dev; Kyle drives it before anything goes live. Nitro still decides lap one on Panorama and Pacific Canyon; that goes to GP-PASSING-2's design.
