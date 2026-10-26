# HELI-CARRY-CLEAR

Status: built and reviewed; committed on the lane only, no merge or push. Flag: helicopter (on).

Claude's design is implemented: a complete terrain-following 10 m target and
centre dot; crate distance and height below the goal; green paint and the H
prompt only while the hooked crate rests inside the circle; specific retry
reasons and the lowering hint. Release-time position and grounded state are
captured so a crate touching down after H cannot pass. Cable physics, radius,
other flight rules, sound cues, saves and payment are unchanged.

## Checks and review
- `node tools/test-heli-lessons.mjs`: 79 checks passed; scripted pilot passed
  on its first release, within the two-try limit.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4 --json`: 49 suites
  passed; review-evidence was blocked by sandbox `spawnSync ffmpeg EPERM`,
  leaving four unrun. Completion with the same lane command and filters for
  only that suite, the four unrun suites and two added by the status snapshot:
  7/7 passed with the needed process permission. Combined: 56/56 selected
  suites green, none outstanding; no passing suite repeated for completion.
  Original replay, world and course-site pins passed unchanged.
- `test-heli-view` in the lane: 231 checks passed.
- `npm run build`: passed; existing chunk-size and static/dynamic-import warnings.
- `node tools/browser-harness.mjs scenario heli-first-flight`: passed on private
  port 51550, including the optional destination flights; no errors or warnings.
  Final target-only sampling and behind-view picture checked with the same
  scenario and `HELI_FROM_ABOVE=0`, private port 28418, no errors or warnings.
  Both used the QA page's isolated memory storage and a throwaway profile.
- Session-end Cockpit sync: ran, no status changes; HELI-CARRY-CLEAR has no
  Cockpit task mapping yet (Director follow-up).
- Picture: `.evidence/2026-10-25/HELI-CARRY-CLEAR/final/heli-carry-green.png`.
  Green terrain-following circle and the ready prompt are visible. The normal
  instrument panel covers part of the lower circle in the behind view.
- Independent review: clear after correcting terrain-offset direction and
  capturing grounded state at release; final sampling move reviewed clear.

Early browser setup attempts failed before carry practice (missing fixture
progress); fixed by saving only the QA memory fixture before opening the pad.
An encoding error was corrected to UTF-8. An obsolete lane was stopped for
review fixes. The next lane caught a course-site JSON fingerprint change from
putting drawing samples on courseSite; sampling now lives only on the active
lesson target. Its remaining work was stopped after that failure. No pin changed.

## Changed assertions
No existing assertion or tolerance is weakened. Added checks cover all three
retry messages, rendered guidance and lowering hint, inclusive 10 m readiness,
airborne/outside/unhooked states, release before touchdown, full-circle geometry,
terrain height in world coordinates, and yellow/green transitions. The scripted
carry test now retains the flight's events and adds a maximum-one-retry check;
its original pass and saved-completion assertions remain. Replay and world
signature pins are unchanged.

## Removed
Replaced the flat target ring and the generic carry retry notice. No unused
runtime assets or alternate implementations were added. Retained one requested
picture; disposable builds and surplus captures are recycled at session end.

## Claude review (26 October 2026)

Approved. The picture shows a complete circle that turns green on the mark, with plain words for when to lower and when to let go. Only checks were added; nothing was loosened.
