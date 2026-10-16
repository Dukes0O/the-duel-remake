# DRIVE-LESSON-HOOKS

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/DRIVING_LESSONS.md`; this card names the slice, files and acceptance.

Codex. Packet sections 2 (the Instructor button), 3.2, 3.6 and 5. Needs
DRIVE-LESSON-1, DRIVE-LESSON-SAVE and DRIVE-LESSON-LINES.

The one wiring card for the race side, holding `busy-game-files` once:

- `src/feature-flags.js`: `driving-lessons: 'dev'` (the feature-flags test
  count rises by one; explain it in the change note).
- `src/game.js`: lesson options on a Time Trial through `startCampaign`
  (no rival, traffic, police, combat, pay, records, ghost saving, medals or
  damage cost; slip rules fixed on); the attempt reset at the start gate
  with the rolling speed.
- `src/app.js`: `startLesson`, the Instructor button on the main menu
  (shown only with `driving-lessons` and `tyre-slip` on) opening the board
  with the Driving group, Enter for the next attempt, Leave lesson on the
  pause screen, the result card and lesson panel, the radio lines, the save
  calls and the reward.
- `src/render3d.js`: cones, the red board and the instructor's ghost, drawn
  from the lesson's lists.

Not in this card: the helipad's board (the helicopter's session and screen
are Claude's; DRIVE-LESSONS-NEXT plans it).

Owns: `src/lessons/drive-lesson-ui.js`, `drive-lesson-ui.css`,
`tools/test-drive-lesson-run.mjs`, a browser scenario under
`tools/scenarios/`, `docs/changes/DRIVE-LESSON-HOOKS.md`.
Hooks: the files above, `src/screen-menu.js` (one button),
`src/screen-router.js` (one import for `drive-lesson-ui.css`), `src/lessons/lesson-board.js`
(the Driving group rows).
Locks: `busy-game-files`.

Acceptance: packet section 10's D1 acceptance; a lesson run without drawing
on Panorama Ridge from the menu verb through the reward; race replays,
world signatures and combat balance unchanged; the browser scenario
(private port, memory-only storage) shows the board, cones, panel and
result card; lane tier, build, one review.
Removed: nothing.


## Independent presentation source while native checks wait

Kyle directly instructed that every possible parallel part should proceed.
Start this existing card's owned drive-lesson-ui.js, drive-lesson-ui.css,
existing test-drive-lesson-run.mjs and own note as a pure presentation slice.
Use actual settled lesson/car/course/result data; no fake instructor or
pretend passing state. Reuse the shared lesson board. Complete useful board,
HUD/rule/streak and result markup/styles plus callbacks for later host wiring.
No App/game/renderer/save/feature-flag/screen hook edit now, no busy-game-files
lease held. DRIVE-LESSON-1/SAVE/LINES remain final wiring/acceptance/merge
dependencies. Later actual host wiring takes the core lock once and proves
native reward isolation. Presentation source can build while instructor and
Tyre native validation wait; it grants no native/UI/live acceptance.


## Parallel presentation source frozen

Owned lane drive-lesson-hooks/codex/drive-lesson-hooks clean
8d25cadca64fedccb3853696eb212e26e016c7fe contains exactly the four
named UI/CSS/test/note files. Shared lesson board, actual caller catalogs
and ownership, stage/rule/streak panel, finished and unfinished results,
and fresh-props callbacks are implemented. Missing-module RED then12 pure
checks PASS419.7908ms; one independent code review CLEAR. No native import,
App/race/save mutation, host edit, gate/build or browser check.
Final dependencies and host/native/accessibility acceptance remain pending;
this is useful source, not a playable or merged feature. Core lease free.


## Host source proceeds in parallel

Kyle authorized every possible parallel part. The isolated hook lane now
contains a conflict-free merge of instructor6389136d and its exact Tyre
dependency; no integration merge or native pass is implied. Take the free
busy-game-files lease for the already named game/App/renderer/menu/router
and feature-flag hooks. Build real reset, attempt, presentation and reward
isolation against those source contracts now. Final Tyre/lesson/native/gate
acceptance still blocks merge and enablement, not source construction.
Only new own test assertions; request written review before any additional
existing inventory hook assertion change. No heavy execution while cap full.


## Claude scope question: exact dev inventory

Host source adds the card's already required driving-lessons DEV switch.
Please name existing tools/test-feature-flags.mjs and tools/test-wasteland-beta.mjs
for precise catalog/dev count additions (course-kit copies the first). Same
pattern as approved Tyre and GP; no existing simulation/hash/assertion value
is relaxed. No edit to those unowned existing tests before written review.
Source implementation continues in its already owned hooks meanwhile.


## Real host source completed in parallel

Frozen clean99a3ef10a7f52831b74363e93d3a173047c87e66 in owned hooklane.
Hostb14c1e79 wires actual menu/board/instructor/rolling attempts, existing
native driving+collision steps, stage/reset/results/leave, real cone/board
and recordedghost presentation, radio and approved once-only reward API.
No ordinary race progression/pay/record/ghost saving/medal/damagecost path.
Required independent review found three real faults; cc26e21c fixes stale
preparation after owner/setup changes, nullable ghost ground becomingzero,
and hidden failed-save/session-only rewards. New failure/retry/reload cases
in changedUI suite18/18PASS479.3486ms; required confirmation CLEAR.
New owned actual memory-only browser recipe1e92bdc1 independentlyCLEAR,
syntaxonly/UNRUN: real menu/purchases/nativeinstructor/KeyW attempt/result/
next/leave, no synthetic pass or fullchallenge claim.
Final99 union conflict-free adds reviewed instructor888/diagnostic0296;
no check repeated or implied. Actual instructor still rejects requiredcone
trace, so playable/nativehost/reward-isolation/browser/migration-budget/
lane/build/merge remain unfinished. Release corelease now. Exact existing
inventory hook question above still waits written Claude scope review.

## Claude answers - switch inventory rows, 16 October 10:00

Approved: add the `driving-lessons` dev row to the precise switch inventories
in `tools/test-feature-flags.mjs`, `tools/test-wasteland-beta.mjs` and
course-kit's copy. Claude's review: these lists must name every switch; adding
the new one loosens nothing.


## Further parallel host source,16October

Frozen `e8b5855dc8c5043a2ff1fceecd385879c79134a7` adds two reviewed deltas.
Actual mounted course-change events cancel only the previous corner's pending
instructor token; same/invalid choices preserve it, and stale completions
cannot cancel a newer request. New regression RED then1PASS103.3751ms;
required independent review CLEAR. The approved exact DEV inventory/count
rows now include driving-lessons:91catalog checks and8Wasteland tests PASS,
independent delta review CLEAR. Course-kit copies the corrected hooks.
No native, browser, lane/build or playable acceptance; instructor and Tyre
remain final dependencies. Core/save locks remain free.


The reviewed own-line lesson47ee11cc is now combined conflict-free into the
isolated hook lane, frozen2706279e382bc45273b248e4f8c2c27b3a44181c. No
passing check repeated or acceptance inferred. The caller sampling question
remains on DRIVE-LESSON-1; no integration merge or feature enablement.


## Parallel windowless dependency union

Kyle directly requested more instructor and windowless code work. Take the
brief core lease only to combine current green Tyre/Rescue/skins/Intel with
this existing isolated host source. Preserve every newer behavior and exact
DEV catalog rows; no native/browser/feature enablement implied. Required
independent code/save union review and meaningful changed-file checks apply.
Release the lease when this source is frozen. Instructor acceptance remains
a final dependency, while this source union proceeds in parallel.


## Dependency union frozen; core lease released

Owned hook lane is clean de621ebdb774d75177ff2cca5b8fad746f7a7cb7 after
combining exact integrationc6c2a608. One actual inventory conflict resolved:
exact base33 count retains every foreign row plus approved driving-lessonsDEV.
App retains Rescue admission and helicopter cue pitch; reviewed lesson
start/owner/reward/retry source unchanged. Independent code/save union review
CLEAR; foreign heli/save/Intel/reference source byte-identical to integration.
Changed pure catalog91checks and Wasteland8tests PASS43.9142ms; syntax/diffclean.
No unchanged18host cases repeated. No native/browser/lane/build, playable
feature, reward-isolation or integration merge acceptance. Actual instructor
and host acceptance remain final dependencies. Source frozen blocked/locks[];
brief busy-game-files lease released, preserve this unfinished owned lane.


## Windowless host code and compile proof

Current isolated source79c8c1fe20ac382afbcad16f45e549a3e685b978 includes
current integration, reviewed instructor e2, and one prepared actual native
App menu-to-reward case in the existing test file. The case uses existing
withReferenceApp/memory-only career, native inputs/steps/events and approved
reward API; it never injects a pose, plan, lesson outcome, progress or reward.
It checks reset, slow streak reset, actual3wins, durable once-only reward,
ordinary record/pay/ghost isolation, leave and other-player ownership.
Required independent code/save delta review CLEAR; syntax/diffclean only,
this new native case is UNRUN. Existing19pure cases were not repeated.

ONE production build on exactclean79c8c1fe PASS2260.6768ms, exit0, no window.
Own build-79c8c1fe receipt retained, wrapper32356/runner14720 drained. This
proves compilation only. Root's actual instructor gate failed its unchanged
2m/reversal checks, so do not duplicate that known failure through the new
host case. Host/native/browser/lane/merge acceptance remains unfinished;
keep source frozen and core/save locks free while instructor direction waits.
