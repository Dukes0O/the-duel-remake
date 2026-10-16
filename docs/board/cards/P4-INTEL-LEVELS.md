# P4-INTEL-LEVELS

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: P4-INTEL-LEVELS
    title: "Team Room: earning intel levels and the reference ghost"
    owner: codex
    lane: RACE
    size: S
    needs: [P4-INTEL-TELEMETRY, P4-CAREER]
    status: ready
    flag: grand-prix
    owns: [src/intel-levels.js, tools/test-intel-levels.mjs, docs/changes/P4-INTEL-LEVELS.md]
    hooks: [src/screen-team-room.js, src/grand-prix-career.js, src/ghost.js]
    acceptance:
      - "Build the four intel levels in docs/CIRCUITS.md section 7b exactly, per event and named player, with the stated ways to earn them, and the level 4 reference ghost in Time Trial. Settles once; additive save fields; old saves unchanged."
```

## Incremental build claim —15October afternoon

Kyle directed continued building. New intel-levels/codex/intel-levels starts at current integration and claims busy-game-files/save-shape after TYRE-SLIP stopped and released them. First slice stays within already owned src/intel-levels.js/tools/test-intel-levels.mjs/ownnote: pure immutable per-profile/event progress, three validated native lap receipts, actual top-five/podium finish evidence, and the stated400/800credit purchases. Ownership grants map level1; progress is prospective, higher levels include lower access; purchases of already reached levels never charge twice. Preserve absent old fields and unknown additive/future data. No historical position inference, free wallet fill, new price or runtime wiring in this first slice.

Claude scope question before runtime wiring: current card names only screen-team-room/grand-prix-career/ghost, but native lap events and named-player/active-run guards live in App, optional profile normalization/finish duplicate guards live in progression, and the dossier provider is in screen-router. Please approve precise additional hooks: src/app.js existing lapCompleted subscription, guarded result settlement, menu-only buyIntel and TT ghost selection; src/progression.js optional intel normalization and validated prospective finish progress; src/screen-router.js current Team Room dossier/provider/callback wiring. Keep existing settlement/owner/wallet guards and old ghost/store budgets. Need the actual native position policy for two-car Duel finishes (results expose position only in Grand Prix): should only explicit valid GP positions earn3/4, or should completed Duel win/loss supply1/2? No invented historical position. Owned pure rules can be built/tested now; missing hooks/position semantics must be settled on this card before those edits. Independent code/save review and all native/nearby/build acceptance precede completed feature merge.

Owned pure increment6fd887b4 complete as a source slice:8focused cases/build pass, independent save/money review CLEAR after fixing an encoded-receipt duplicate guard and rejecting nonboolean proofs. No assertion relaxed. No runtime/storage/UI feature wired and no final gate/merge. Retain clean lane while Claude answers the extra hooks and Duel-position policy above. Board blocked/waitingClaude releases busy/save locks. No new lane or audio-clock claim was made by this handoff.

## Claude answers - hooks and Duel positions, 15 October 16:00

- **Hooks approved exactly as named:** `src/app.js` (the existing
  lapCompleted subscription, guarded result settlement, menu-only buyIntel,
  Time Trial ghost selection), `src/progression.js` (optional intel
  normalization, validated prospective finish progress), `src/screen-router.js`
  (Team Room dossier provider and callback wiring). Existing settlement,
  owner and wallet guards and ghost/store budgets stay.
- **Positions:** only explicit valid Grand Prix positions earn levels 3 (top
  five) and 4 (podium). A two-car Duel win is not a top five in a field, so a
  Duel finish does not count for 3 or 4; Duel, Time Trial and race laps all
  count towards level 2's three laps. Credits buy 3 and 4 as stated.


Codex resumes the retained6fd887b4 lane after Claude16:00 approved the exact App/progression/screen-router hooks and explicit GP-only positions3/4. Reclaim busy-game-files/save-shape released by the new tyre stop. Continue native lap receipts, named-player settlement, menu-only purchases and level4 TimeTrial reference ghost using the approved pure core. Duel/TT/race valid laps may earn2; no Duel-position inference or historical credit. No new lane; no existing off-state save mutation or ghost/store budget change. Required code/save review, native acceptance and nearby/build precede merge.


## Reference-ghost data and selection question before that code

Actual bundled referenceLap(panorama-ridge) keys are eventId/route/seed/car/driver/cpu/fixtureVersion/lapMs/sectorMs/trace/corners/courseFingerprint; trace rows are [distance metres, speed kmh] only. There is no native time/position/lateral/heading/air pose record. Existing sampleGhost requires a real pose sample stream and current metadata. Synthesizing centreline positions or integrating the sparse speeds would not be the actual recorded reference lap, so no stand-in ghost is being built.

Claude: approve the exact additional existing build-data hooks tools/build-reference-laps.mjs (retain native pose samples from its actual selected best lap), src/generated/reference-laps/<event>.json (add that actual pose stream without silently replacing old reference timings/analysis), and src/reference-laps.js (validate/read that optional bundled stream). Existing src/ghost.js hook can sample the bundled reference separately, with event/route/course fingerprint checks, without inserting it in personal ghost storage or increasing its budget. If current source no longer reproduces the old reference exactly, stop/name that difference rather than relabel it.

Also settle selection: should reaching4 automatically choose the team ghost under the existing TimeTrial ghost toggle, replacing personal playback while keeping all personal records, or should the menu let the player choose personal/reference? The latter needs a precise existing menu control hook (src/screen-menu.js plus its existing binding) not named by the present card. Native earning/owner-safe menu API continues in the existing lane; no ghost generation, pose estimate, new fixture, menu control or unapproved source hook starts before this answer.


## Native earning increment handoff

Clean retained a32b36e1 now wires the approved native lap/GP finish/purchase hooks. New tests failed first (8original passed/3new failed), then11/11pass including a real original3lapGP24.29s and duplicate/owner checks. Existing save fixtures13shapes/437checks and progression27checks pass unchanged; build2138.8688ms; independent drive_lesson_save_review CLEAR. This is an incremental source result, not final card acceptance: TeamRoom level gating/purchase failure messaging and real reference-ghost playback remain unwired; no final nearby tier or merge. Await the precise data/control answer above, retaining source and tests. Also name existing tools/scenarios/team-room.mjs and team-room-photos.mjs if their disposable earned-intel fixtures need to change for the new level gates; preserve their pictures/read-only/semantic assertions. No scenario source or capture has been changed here. Release busy/save locks while waiting; fold final source-review verdict into own note with the next genuine source edit.

## Claude answers (15 October, evening): the team ghost

- **Hooks approved:** `tools/build-reference-laps.mjs` keeps the native pose
  samples from the selected best lap; `src/generated/reference-laps/<event>.json`
  gains that pose stream as an optional addition; `src/reference-laps.js`
  validates and reads it; `src/ghost.js` samples it separately, with the
  event, route and course fingerprint checks, never in personal ghost
  storage and without raising its budget.
- **Same lap or nothing:** the pose stream must come from the very lap whose
  timings are stored. Rebuild each event; where the rebuilt lap's `lapMs`
  differs from the stored one, keep the old timings untouched and give that
  event no team ghost yet (level 4 still unlocks its other rewards). List the
  events affected in the change note. Never estimate poses.
- **Choice:** the player chooses. Approved hook: `src/screen-menu.js` and its
  existing binding, so the existing Time Trial ghost toggle cycles Off, My
  best, Team. Team appears only once level 4 is earned for that event and its
  ghost exists. Personal records and ghosts are never replaced. The choice is
  per named player, defaulting to My best.

## Claude answers - Team Room scenarios, 15 October

Yes, `tools/scenarios/team-room.mjs` and `team-room-photos.mjs` may change
their disposable earned-intel fixtures so each view reaches the level it
pictures under the new gates (give the fixture profile the laps, finish or
purchase that level needs). Keep every picture, read-only and semantic
assertion as it is, and add one check that a locked level shows its lock and
price.


The evening reference-data/control and disposable-scenario answers are received. Existing a32b36e1 remains intact; pause source while TYRE-SLIP holds the shared busy/save lease. No unanswered-Claude blocker is implied and no new lane is needed. Resume this existing lane after the lease is free.


## Core lease returned

Cups is merged and its newly created lane recycled. Tyre recovery now waits for the specific written outcome decision on its own card, with no retuning or repeat measurement. Intel may resume its existing approved UI/reference-ghost hooks under save-shape and busy-game-files. Existing source a32b36e1 and green native earning/purchase evidence stay retained. Ardennes release work has priority; no extra native batch during its eventual alone gate.


## Kyle hard finish-or-handoff deadline, 15 October20:27PT

Team Room is Root's first work. Finish and merge by22:30PT (2026-10-16T05:30Z), or commit its exact unfinished source and hand it back to Claude, releasing both busy-game-files and save-shape. Do not extend this deadline or hold the eight-card queue for further work. Current clean sourceebb926d0 contains reviewed earning/purchases/UI/ghost selection and prepared native-pose builder/scenario fixtures. Actual native pose generation, existing browser scenarios and final canonical lane/build/review on the current integration union remain. Preserve all prior acceptance; no completed-feature claim yet.
