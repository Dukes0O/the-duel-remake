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