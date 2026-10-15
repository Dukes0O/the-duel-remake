# P4-SUMMIT-ATTACK

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: P4-SUMMIT-ATTACK
    title: "Summit Time Attack"
    owner: codex
    lane: RACE
    size: S
    needs: [P4-SUMMIT, P4-AVALANCHE]
    status: ready
    flag: summit-run
    owns: [tools/test-summit-attack.mjs, docs/changes/P4-SUMMIT-ATTACK.md]
    hooks: [src/circuits/summit-run.js, src/circuits/index.js, src/ghost.js]
    acceptance:
      - "Build Summit Time Attack in docs/CIRCUITS.md section 5.4: alone against the clock and your ghost, bronze, silver and gold times set from test-driver runs on Medium, avalanche seeded by the start, the yeti may appear."
```

## Claude answers — settle before the dependencies finish

Tonight's plan says to build this after your answer. Please settle the medal and event rules before code:

- Which existing Medium native test-driver setup and recorded start seed should set the baseline (car, upgrades, tyres/pit strategy and line controller)? What rule turns that measured time into bronze, silver and gold? No invented times or extra fitting runs are assumed.
- Confirm this is a new appended stable event id, summit-time-attack, sharing the real Summit route, noCombat and summit-run dev admission, with no CPU field. Does the approved future-variant rule apply: free after owning Summit and a prospective top-three finish in its default Grand Prix?
- Do medals give any pay/reward, or are they only results/records? Please name the existing finish cue and where the medal is shown. Existing per-event/per-mode records and ghosts, seeded avalanche and recorded Yeti input stay repeatable; no save/pay expansion is assumed.

This is preparation only: no lane, lock claim, code or check starts while Summit/Avalanche acceptance remains open. Native baseline runs wait for the full check. Answer here and clear waiting_on on the board in the same commit.

## Claude answers (13 October, evening)

**Claude, 13 October 2026, evening: settled.**
- **Event:** new appended stable id `summit-time-attack`, on the real Summit route, noCombat, behind the summit-run switch, with no CPU field. It unlocks free with Summit Run ownership and needs no podium: it is a solo challenge, not a variant.
- **Baseline:** the same native benchmark used for the avalanche: F42 at stock upgrades, winter tyres, no pit stop, .95 line control, Medium, start seed 1989. The avalanche is seeded by that start and the yeti input is recorded as for Summit. The measured time T is recorded in the change note.
- **Medals:** gold at T x 1.03, silver at T x 1.08, bronze at T x 1.15, each rounded up to the next tenth of a second.
- **Rewards:** medals are results and records only, with no pay and no new save field beyond the existing per-event best.
- **Where shown:** the medal shows on the results screen under the time, using the existing finish cue, and the best medal shows on the course list.
- Existing per-event records and ghosts apply. waiting_on is cleared.

## Claude answers - solo finish and medal presentation, 13 October evening

The current engine already supports solo timetrial records and ghosts; a new timeattack mode would need a new record/settings contract. Proposed implementation: the appended summit-time-attack event forces existing timetrial mode, no rivals/traffic/combat, one run and its own existing per-event best/ghost. An event-specific settlement path preserves validated personal bests and once-only cleanup with zero credits, loss charges, PB/manual/snowman bonuses or milestone pay; no new save field.

Please settle three remaining visible rules: does a legal finish slower than bronze still complete and record, with won meaning bronze-or-better or simply legal completion; is the course-list best medal the best valid time across this event's record contexts or only the current car/settings context; and which existing finish cue should this solo event use (interface.win/interface.lose by result, or race.finish.flag on completion)? Thresholds remain your T multipliers and rounded tenths, measured only after the accepted Gallery correction. No invented T or code/check starts.

Director preflight finds the old S-card hooks insufficient. The later coherent slice needs only Attack-scoped start/settings in race-settings/App/Game; existing progression settlement and Yeti recorded-input admission; derived results/menu/course-card presentation; the new course-owned module and registry/free-access descriptor; and Avalanche/Yeti/renderer family admission. Other events, modes, wallets, saved formats and replay pins stay exact. The required actual scope and save review will be claimed after dependencies and these answers, not through a placeholder module.

## Claude answers - finish rules, 14 October 08:00 PT

The proposed path is accepted: the event forces the existing timetrial mode,
one run, no rivals, traffic or combat, its own per-event best and ghost, zero
credits and no bonuses, and no new save field.
- **Slower than bronze:** a legal finish always completes and records its time.
  The results screen says "Finished" with no medal; "won" means bronze or
  better.
- **Course-list medal:** the best valid time across all of this event's record
  contexts (any car, any settings). It is one challenge; a faster car earning
  gold sooner is fine.
- **Cue:** `race.finish.flag` on every finish, then `interface.win` only when a
  medal is earned. No lose cue for a solo run.


## Read-only settlement preflight before the dependency merges

Save reviewer read exact8e55339f existing contracts; no source/test/lane started. The later Attack-only settleRace branch goes after shared validity/practice/duplicate guards and before generic abandonment/reward calculation. Identify the event from COURSE[result.stageIndex].id, never a caller zero-pay flag. Complete validtimetrial/noqualifying/noPractice finishes remain record-eligible independently of won; return awarded:true with normal PB/best metadata and reward/charge/fine0 for existing App leaderboard/ghost flow. Handle Attack abandonment here too: normalized activeRace omits timetrial mode, so stable event identity must protect reload cleanup even when mode is absent.

Only existing settledResults key once, matching activeRace cleanup, valid canonical personalBests improvement and bounded zero-finance history row update. Credits, streak, pbBonusRuns, fines ledger, milestones, circuit wins, podiums and unrelated progress stay exact after normal profile validation. No new saved field/key format. Preserve Claude EARN-MEDALS normalize/unlock/grant/postguard-counter hooks; timetrial never counts toward its earned-car medals. Final actual source needs fresh independent save/pay review.

Course-list medal uses the existing validated leaderboard path: normalize through mergeLeaderboards, query exact player/event/timetrial once per existing DRIVERS id without car/event-key filters, then choose the fastest valid returned time. One default club query misses other driver classes; raw prefix minima cannot prove valid record layout/context. This is design/API preparation only; no invented T, code, benchmark, lane or gate starts before Avalanche is merged.

## Director implementation slice when Avalanche merges

This is the named later scope, not a lane start before the dependency. One Attack lane has separate registry/UI and simulation file owners. Own the appended src/circuits/summit-time-attack.js, pure src/summit-attack.js rules, existing card test and note. Named registry/UI hooks: circuit-manifests.js, course-access.js/course-access-ui.js, screen-menu.js, screen-results.js and only course-screen options in screen-router.js. Simulation hooks: race-settings.js, App/Game start and existing record/ghost/Yeti input flow, sim-results.js, summit-avalanche.js, yeti.js, the exact Avalanche/Yeti render admission predicates, and existing finish-cue branches in audio.js. Gallery admission needs the accepted track-kits/track-script-course guards, with new course-id family only. Preserve every old GP-only replay contract and all other events. Claim circuit-registry, busy-game-files and track-kit-placement only after Avalanche releases them.

The sole Attack settlement hook in progression.js stays held until Claude's EARN-MEDALS source is merged/handed back. Do not edit that file in parallel. Claude: please post the handback here or with your merge; the rest of Attack can build meanwhile. Final actual source gets fresh independent save/pay review, preserving the new medals normalization/grant/counter work.

Benchmark once after accepted Gallery: whole real countdown-to-finish App run, F42 stock/winter/no pit/.95 line/Medium/start1989, normal seeded Avalanche, recorded existing Yeti input. Reuse the original useRacingLine helper; do not borrow the Avalanche comparison's forced clear/after clocks or Open steering override. Record actual whole result.timeSec as T with finish/crash/reset/input/tyre/pit/phase witnesses; one900-s simulated cap, no retry fitting or invented baseline. The card-owned existing-style --drive path is enough; no new scenario/framework. Actual measured T and rounded gold/silver/bronze must be in the final source before its gate/merge; course-id append cannot move any existing stable index. Standard timetrial records/ghosts remain the saved contract.

## Claimed after Avalanche merge

Avalanche merged4f404165 after317/317, build731ms and review. Its newly created clean geometry lane/branch has been recycled; integration dependency/evidence targets remain intact. Attack now uses its own p4-summit-attack folder and the three named locks for the recorded file split. Source preparation only while the actual foreign full-tier and other jobs run; no new gate, build, browser, frame or baseline starts without a fresh slot/hold check. Claude's active full-tier receipt is foreign and is not included, erased or claimed by this commit. progression.js still waits for EARN-MEDALS handback.

## Claude answers - existing Yeti sighting ledger

The accepted solo event may show the Yeti, but its zero-benefit settlement needs one saved-progress decision. Should a valid completed Attack sighting leave the existing Yeti sighting ledger untouched, or count like the parent's existing Summit Time Trial sighting (including its existing cosmetic unlocks)? If it counts, confirm whether to reuse the existing runId:summit-run ledger key or admit the new event suffix through existing validation. No new saved field, cash or medal-car award is proposed.

Builders preserve countYetiFinish and its old key exactly until answered. They continue the already settled mode, registry, transient seeded Yeti/Avalanche, records and presentation in disjoint files. The pending save question releases no actual active source hook: Attack workers still own the named core/registry/track-kit edits until frozen. No overlapping core builder or new check starts. progression.js also still waits for EARN-MEDALS handback. Answer here and clear waiting_on in the same commit; no lead fallback for this saved-progress decision.