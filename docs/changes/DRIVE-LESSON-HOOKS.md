# DRIVE-LESSON-HOOKS

The independent presentation slice is implemented. It is not yet reachable in the game. Instructor/native driving validation, the host wiring, flags, radio, renderer, reward isolation, lane gate and build remain unfinished dependencies of this card.

## Source

`drive-lesson-ui.js` imports only the existing shared `lessonBoardMarkup`. The host supplies actual corner/course/car catalogs and current ownership, chosen car and setting, player ID, and optional version-1 lesson progress. The Driving board keeps the supplied corner order, offers only owned courses for selection, and requires an unlocked car, current player, compatible progress and Casual/Pro before its Start/Retake callback can fire. Saved completion and best margin remain visible when the current selection cannot start. No instructor run, course row or passing observation is invented here.

The lesson panel reads the current lesson's three stages, four scored rules and streak. The result shows actual elapsed/instructor/lost-or-faster/screech times to hundredths, or distance reached and the observed wall/off-road/stop reason if the attempt did not finish. An unfinished attempt never gets a fabricated finish time or loss. Three completed, passing challenge attempts are required for the final passed title. The UI makes no promise that a reward has landed.

The delegated bindings read fresh props at each event. Start and course selection re-check ownership, next/Enter require the lesson's actual current run owner and a ready/result phase, and Enter does not swallow text/control input or repeated keys. Callbacks request start/selection/next/leave only. The returned cleanup removes all three handlers. Neither markup nor bindings change the supplied data, lesson, simulation, profile, upgrades or credits. Course/car labels and attributes are escaped. Radio controls have labels, results announce politely, rule status uses text, and visible keyboard focus remains. CSS selectors stay within this component; existing lesson-board styles continue to supply its list.

## Host API for the later wiring slice

- `driveLessonBoardModel(props)` produces the rows, available course choices and validated start request.
- `driveLessonBoardMarkup(props)`, `driveLessonPanelMarkup(props)` and `driveLessonResultMarkup(props)` return markup only.
- `bindDriveLessonUi(root, readProps, callbacks)` returns cleanup. `onStart` receives `{lessonId, courseId, carId, difficulty}`; `onSelectCourse` receives `{courseId}`; `onNext` and `onLeave` request their named actions.
- Board props: `corners` from the real lesson table; `courses` and `cars` arrays of `{id,name}`; `ownedCourseIds`, `ownedCarIds`, `playerId`, `courseId`, `carId`, `difficulty`, optional saved `progress`.
- Run props: current `playerId`, actual `runPlayerId`, and the real scoring module's `lesson` observation. No dependency on the unmerged lesson module or its simulation is imported.

## Verification

The assigned new pure test file first failed at the absent UI module. After implementation all 12 tests pass in 419.7908 ms: actual supplied access/order/selection, unsupported save version and missing ownership, completed retake/best display, hostile-label escaping, rule/streak observation, finished and unfinished timing, real three-win completion, non-finite observations, stale-owner/current-prop actions, Enter and handler cleanup, and local CSS/focus. The first post-implementation run also exposed a stylesheet comment being interpreted as a selector by the scope check; moving that unnecessary comment out left the scope check unchanged. No old assertion was changed. No simulator import, browser, native drive, QA bundle, heavy test, lane gate or build was launched for this source slice. Required independent code review remains pending with Root.

## Removed

Nothing replaces a live path yet. The module and styles remain off until the later owned host wiring imports them; no App/game/renderer/screen/flag/save/audio/foreign file was edited and no busy-game-files lease was held. No scratch output was created.


## Native host source increment (parallel work, not acceptance)

Kyle authorized all possible parallel building. The card's named game/App
hooks now implement a real lesson-only Time Trial start and rolling-gate
reset. App computes the actual same-car/upgrades/driver instructor once,
checks player/course/car/switch ownership before and after the await, and
surfaces a clean-run failure instead of making a substitute plan. The new
`driving-lessons` catalog row is DEV and requires `tyre-slip`; neither is
enabled or merged by this source increment. Precise inventory test changes
need their named-hook review and remain outside this edit.

Duel's lesson branch calls existing native `_drive`, `_jump` and swept
`_collisions`; it adds no alternate physics. The ordinary race/lap finish,
traffic, police, combat, bonuses and record paths are excluded. Ordinary
App settlement, active-race markers, ghosts, telemetry and Intel observers
reject lesson races, including direct callers. Each new attempt uses the
actual instructor rolling pose and resets transient damage; no repair pay
or ordinary race reward is settled. No inactive race-state field is added.

The App board/start/next/Enter/leave verbs mount the existing pure panel and
results as their own DOM surface. The one menu button appears only with
both dev flags, and the router gains only the owned stylesheet import.
Cones and fixed red board are read-only Three objects at actual rendered
ground height; cone tips read scorer events. Challenge playback reuses the
existing vehicle ghost drawing with interpolation of actual instructor
poses. Native physics never observes these objects.

Radio cues use the existing banked recordings through the shared radio
filter, in order, with current-run cancellation; subtitles show their exact
line text. The approved `finishDriveLesson` API is called only for the actual
current player/state/car/driver/settings and a completed three-win challenge.
It retains exactly-once reward ownership; the existing App save API retains
its normal session-only behavior if persistence is unavailable. No actual
player save, localStorage profile, live app, browser, native simulation,
heavy gate, build or release was accessed or executed during source work.

Pure presentation/ownership/source-isolation tests:14/14 PASS203.5589ms.
Syntax parsing and diff checking pass. A failed local Windows encoding write
briefly emptied the owned menu file; exact clean HEAD was restored under a
zero-byte precondition, then only its one button was reapplied. Existing
Windows-encoded UI text was normalized to UTF-8. No foreign edits were lost.

**Still unvalidated:** the instructor currently fails its real clean-run
check in the separate lesson lane. This host cannot yet demonstrate a
successful lesson. Full native menu-to-reward, repeatability, no-save-side-
effects, actual radio/ghost/cone presentation and browser acceptance remain
UNRUN, along with canonical lane/build and required independent save/code
review. No synthetic plan, hidden bypass or claim of playable completion.
The browser scenario and precise inventory hooks remain unfinished.

Removed: no current assets or released paths replaced; no scratch output
created. Preserve this unfinished owned lane and the other source lanes.


## Required review fixes

The independent code/save review found three real faults. First, a changed
player/setup/menu after the instructor await left its preparing token and
message alive. Rejection now clears only the still-current token, preserving
any newer request; duplicate preparation starts are refused. Second, nullable
native ghost terrain fields were coerced to zero. Ghost interpolation now
keeps missing/null witnesses absent so the ordinary terrain fallback applies.
Third, a failed profile save was ignored. The reward remains once-only in
memory, but the result explicitly says it is session-only and the last saved
career is unchanged. The durable pass radio is withheld. Retry save persists
the same already-rewarded profile without running the reward API again, with
current owner/state checks and a retry button only for that failed session.

Four new pure regressions exercise current-token isolation, null versus finite
zero terrain witnesses, the actual App event/retry methods with memory-only
failing storage then save/reload/retake, and current-owner retry UI. Actual
changed presentation/host suite18/18 PASS479.3486ms; no native simulator or
real storage is instantiated. Required reviewer confirmation is pending.
All native/browser/lane/build acceptance remains unrun. The new ordinary
browser recipe drive-lesson-run.mjs is source-prepared only: actual temporary
funded career and course purchase, current-player access, native instructor,
physical cones/panel, real KeyW attempt result, unchanged profile and next/leave.
It never injects a plan, result, car pose or passing state; no browser executed.


### Corner selection during instructor preparation

The actual mounted board previously kept an async instructor request alive
when another owned corner was selected. Cancel only that pending transient
request when the selected corner changes; the existing App token guard then
rejects its old continuation. Same/invalid choices preserve preparation,
and a stale completion cannot erase a newer request. No race/save/physics
change. New mounted change-event regression RED before the fix, then 1/1 PASS
103.3751ms; required independent lifecycle review CLEAR. Removed: the stale
preparation path. Native host acceptance is still unfinished.


### Approved switch inventory

Claude's written card answer16October10:00 approves the exact driving-lessons
DEV/catalog/count rows. The existing feature catalog now requires the new
DEV name and30 non-course switches; Wasteland requires the same exactrow.
Course-kit copies these two hooks, with no separate assertion relaxation.
Actual91catalog checks and8Wasteland tests PASS783.4413ms; required independent
delta review CLEAR. No native, lane or build pass. Removed: stale inventories.


## Current dependency union, 16 October 12:55 PT

Combined exact current integrationc6c2a608 into reviewed host2706279e in this
isolated lane. One actual conflict, tools/test-feature-flags.mjs: exact
non-course count33 is integration32 plus driving-lessons; rescue, wildlife,
heli-skins, tyre-slip and driving-lessons stay dev, with every released row
retained. Wasteland inventory and feature catalog merged automatically.
The actual App integration delta adds rescueEnabled and helicopter cue pitch;
reviewed lesson start/owner/reward/failure-retry code is unchanged. Foreign
heli, progression, leaderboard, Intel/dossiers, save fixtures, lesson-save and
reference builder remain byte-identical to integration. No physics or save
format change was added by this union.

Required independent code/save union review CLEAR. Actual changed pure flag
checks91PASS and Wasteland8PASS43.9142ms; syntax and diff clean. No unchanged
18-case host suite repeated, no native drive/browser/lane/build executed.
This frozen source is not a playable, native, gate, build or integration-merge
acceptance. Instructor/cone placement and actual native host/reward isolation
remain unfinished. Release the brief core lease now; preserve this lane.
Removed: conflicting stale count/list, retaining all current exact rows.


## Reviewed instructor source combined

Combined exact review-CLEAR lesson e2f752bc into host de621ebd without conflict.
This imports the approved full exit-window observation and finish trim only;
its actual native canonical is owned by Root in the separate lesson lane.
No repeated lesson/native/host tests and no source edits to that running lane.
One independent production build on this final frozen host is next, after
fresh holds and all-ancestor admission; compile proof alone is not host/native
acceptance. Host gate, actual private browser and instructor receipt remain
pending. No new manual core edit or shared lease is needed for this clean union.
Removed: old instructor window/finish source replaced by the reviewed version.


## Real native host acceptance prepared, not executed

Added one actual App menu-to-reward acceptance to the existing owned host test.
It uses existing withReferenceApp memory-only storage, supported QA flags,
existing funded temporary career fixture, real course purchase/menu/startLesson,
actual instructor and native Duel input steps at120Hz. Real late/right/fast/
slow-reset/three-win stages must pass, without injecting poses, plan, result,
progress or reward. It checks current owner, isolation from ordinary race pay,
records/ghost storage, exact approved reward, actual persistence, no duplicate
reward on finished ticks, and other-player/leave isolation. The first native
test installs supported QA flags before dynamic game imports; globals restore.
Existing19 pure host cases remain unchanged. Syntax only; all new native host
acceptance is UNRUN until Root's instructor receipt and admission. No new
framework/helper file or production hook; required independent code/save delta review CLEAR.
The review confirms withReferenceApp does not install reference-completion
overrides, and controls use actual Duel steps/App events without injected
completion or reward. This is source review only, not a native pass.
