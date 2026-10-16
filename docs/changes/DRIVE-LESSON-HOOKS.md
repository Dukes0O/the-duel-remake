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
