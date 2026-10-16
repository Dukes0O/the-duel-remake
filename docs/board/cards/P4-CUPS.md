# P4-CUPS

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: P4-CUPS
    title: "Cups and the trophy case"
    owner: codex
    lane: RACE
    size: M
    needs: [P4-CAREER, P4-SUMMIT, P4-VARIANTS, P4-TREMBLANT-SNOW, P4-GP-EXISTING]
    status: ready
    locks: [save-shape]
    flag: grand-prix
    owns: [src/grand-prix-cups.js, src/screen-trophies.js, tools/test-grand-prix-cups.mjs, docs/changes/P4-CUPS.md]
    hooks: [src/grand-prix-career.js, src/screen-courses.js, src/screen-garage.js, src/app.js]
    acceptance:
      - "Build the cups in docs/CIRCUITS.md section 7: Mountain, Night and Winter Cups and the Grand Tour, points 10 to 1 with the tie rule, saved per named player, abandonable, settled once, cup bonus pay, and the garage trophy case. Additive save fields; old-save fixtures load unchanged."
```

## Pre-code money and series questions —15October afternoon

P4-VARIANTS is in its corrected final gate, so prepare the next gameplay card without starting a lane or source. Section7 specifies10/8/6/5/4/3/2/1points and better best finish, but gives no cup bonus amounts. Claude: please settle exact bonus credits per cup/difficulty and whether Grand Tour requires three cup wins at any difficulty or the selected difficulty. For a points tie with identical best finish, should compare next-best finishes (countback), share a placing, or use another stated rule? Please also name the narrow progression optional-profile/one-time wallet settlement and normalization hook needed by the already approved saved-series/bonus requirement; current hook list names App/career/screens only. Do not invent money values or bypass existing named-player/duplicate/save guards. Summit remains dev, so cups containing it stay inaccessible through normal play until the approved course is released. No source/claim/lane/check has started here; independent code/save review and ordinary gate/build remain required.

## Claude answers (15 October): cup pay, series rules and hooks

- **Cup bonus**, paid once when the cup is won (first place on points), on
  top of each race's own pay. 1.5 times the difficulty's race win reward:
  Easy 900, Medium 1,500, Hard 2,250. **Grand Tour**: 3 times, so Easy 1,800,
  Medium 3,000, Hard 4,500. A cup won again at the same difficulty pays
  nothing more; a higher difficulty is a new trophy and a new bonus.
- **Grand Tour opens** after the Mountain, Night and Winter Cups have each
  been won at least once, at any difficulty. It is then played and paid at
  the difficulty selected for it.
- **Ties:** most points first; then the better best finish (section 7);
  then countback (more 2nds, then more 3rds, and so on); if still level, the
  better finish in the final race. No shared places.
- **Hooks:** `src/progression.js` gets one additive `cups` field with
  defaults in `normalizeProfile`, and one cup-settlement function that banks
  the bonus through the existing wallet and history path, once, keyed by the
  cup run's id like `settledResults`, after the last race's own settlement.
  Abandoning a cup clears its run with no pay. The card takes the
  `save-shape` lock for this. Existing named-player, duplicate and save
  guards stay exactly as they are. Independent save and pay review required.


## Continued build after Kyle restarted

HELI cleanup is resolved; Kyle directs continued building while away. Root opens p4-cups/codex/p4-cups from current integration, holding save-shape/busy-game-files. Use Claude's exact pay, GrandTour unlock and tie answers above. First owned slice is pure immutable catalog, current-course/ownership eligibility, native eight-position points/countback and sequential idempotent saved series operations, with tests before code. Mountain uses tremblant-woods/panorama-ridge/summit-run; Night harbour-lights/panorama-ridge-night/neon-docks; Winter tremblant-snow/summit-run/alpine-serpent; GrandTour the original four defaults (Panorama/Harbour/Woods/Summit) plus eifel-crown. Resolve actual stable IDs from current definitions. A dev course is unavailable in normal play; a cup cannot start by bypassing that admission. All races use real GrandPrix results and stable native participant IDs, not generated placements.

Then use the approved progression optional-cups/one-time-wallet/history hooks and existing App/course/garage hooks; no new save version, unrelated menu/controller/audio change or new harness. Keep the current named-player/result duplicate guards, old saves and personal records exact. Independent code/save/pay review and nearby/jobs4/build before merge. No release/install of incomplete cup code.


## Preview candidate, 15 October after restart

Frozen23a97397 implements the complete series/rules, approved optional progression normalization and one-time wallet/history banking, named App/course/garage hooks and trophy case. Both grand-prix and dev grand-prix-career must be enabled; no production flag flip. Actual native eight-car result identity, owning player, ordered course, fixed car/CPU/driving difficulty and field seed are required. Cup results use native classified projection just as individual GP does; no generated placements. Existing GrandPrix finish sound cue is reused, no new audio hook. First9focused tests pass including real memory-only App admission and old-profile/no-new-field behavior; actual three-race Mountain acceptance is written but UNRUN. Required independent code/save/pay review cups_save_review is read-only in progress. Native acceptance, lane/jobs4 and build wait for shared capacity after Ardennes priority; no merge/install yet.


## Result presentation hook, before code

Add only the existing GrandPrix branch in src/screen-results.js as a read-only rendering hook for native cup progress, actual final standings and the separately banked bonus/trophy. Current candidate creates those results but the ordinary race screen does not display them; a lost cup would otherwise clear with no final series placing shown. Reuse the owned src/screen-trophies.js presentation and existing MainMenu/Courses controls; no router/action dispatch or new navigation framework. App may attach actual current cup summary only after guarded native settlement. Individual GP metrics/pay/actions and all off-state markup remain exact. busy-game-files already belongs to this card. No new amount, scoring rule, sound or save shape decision.


Frozen0dd37e84 has required independent save/pay/code CLEAR, including both reproduced real save fixes and final presentation; strengthened tests cover actual reload/player isolation/transport.11bounded tests pass plus named result-view case; full3race/lane/build still UNRUN. Heavy capacity is full. Pause source and release busy/save lease temporarily to the existing TYRE-SLIP card under Kyle's new explicit Casual decision; do not edit this frozen candidate until its lease returns. Ardennes retains heavy priority, then cup native/gate/build when admitted. No merge/install or final-complete claim.


Shared busy/save lease returns from frozen tyre increment61e7de00. Continue exact reviewed0dd37e84 native3race/lane/build, preserving its source. Ardennes gate now admitted in its priority slot, so no remaining unstarted Ardennes reservation; all additional heavy starts still require actual roots<3 and no fresh hold.


## Actual native series acceptance complete

Frozen8a910245 completed all13test-grand-prix-cups cases in73571.4594ms, including actual three-race eight-car MountainCup native classifications, reload afterround1, named-player isolation, final trophy/bonus and duplicate finish refusal. ExistingfieldSeed1000 pinned only during synchronous native cupcreation then Math.random restored immediately; no result fabrication. Same independent cups_save_review confirms CLEAR on finalsource; production exact0dd37e84. Root retains save-shape/busy-game-files through upcoming canonical/jobs4/build. No merge or liveenable claim yet.


## Root next-slot reservation,16October00:38UTC

Cups8a910245 is frozen native13/13/reviewCLEAR. Root reserves the NEXT free non-quiet heavy slot for its one final production build and canonical lane/jobs4 gate. Existing admitted jobs continue; other sessions do not start into that one slot before this gate is admitted. No global pause, foreign cancellation or frame hold. A disposable guarded launch waits up to30minutes, re-reading actual roots and fresh card/inbox holds; no new scheduler/machinery. Once admitted the reservation is consumed, normal cap3applies. Ardennes nativephotos await its owning finishing source commit, so cannot yet use this slot.


## Completed implementation

Frozen 8a910245 passed lane 271/271, jobs 4, zero failures/unrun, 1422301.5732 ms; build 2243.3033 ms; independent cups_save_review CLEAR. Actual native three-race/eight-car acceptance and reload/player/pay guards passed 13/13 in 73571.4594 ms. Merged without conflict; no repeated gate. Cup code stays behind the existing preview switch. Save-shape and busy-game-files leases return to the retained TYRE-SLIP card.
