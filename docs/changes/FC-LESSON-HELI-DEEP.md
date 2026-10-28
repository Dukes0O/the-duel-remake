# FC-LESSON-HELI-DEEP: three browser scenarios out of date

Card: fix the three browser scenarios the nightly full check failed on commit
22e9a9f8 (and again on the rerun). The last green full check was 1d5ad589
(24 October). No game code changed; all three scenarios were stale against
designs Kyle's team had already shipped.

## What changed

Only three scenario files under `tools/scenarios/`:

- `drive-lesson-run.mjs`
- `heli-first-flight.mjs`
- `deep-achievements.mjs`

## Cause of each failure

1. drive-lesson-run: stale scenario. LESSONS-MORE-ROADS (c280b579) added an
   Ardennes Forest braking row to lesson 1 (`DRIVE_LESSON_CORNERS` in
   `src/lessons/drive-lessons.js`, docs/DRIVING_LESSONS.md 14.13), and f96b19f3
   lets lessons run on courses the player does not own. The new-player board
   therefore enables three rows (panorama-ridge, tremblant-woods,
   ardennes-forest). The scenario still expected two.
2. heli-first-flight: stale scenario selector, the board itself is fine.
   HELI-LANDED (8b8f0103) added a "LANDED AT ..." panel that also carries the
   class `heli-lessons` and sits above the instructor board in the page. The
   scenario's `document.querySelector('.heli-lessons')` now found the landed
   panel, which has no "INSTRUCTOR" text. A debug run confirmed the real
   Instructor panel is on the pad with the skip button and the Lift-off start
   button. The pilot's map switch (94abd4cc) is not involved.
3. deep-achievements: stale scenario. The Lab went live on 25 October
   (10ce4d17, LAB-LIVE), so on the game's own switches the garage shelf shows
   all six achievements. The scenario's last step expected only "Raised from
   the Deep" (Lab off). The shelf code is unchanged and correct.

## Changed assertions

| Scenario | Old check | New check | Why not weaker |
| --- | --- | --- | --- |
| drive-lesson-run | enabled lesson-1 courses equal `panorama-ridge,tremblant-woods` | equal `panorama-ridge,tremblant-woods,ardennes-forest` (exact list, same order as the lesson table) | Still an exact list; every other part of the same check (3 locked rows, "Opens later", no pointer cursor, no "not owned" or "buy") is untouched. |
| drive-lesson-run | click each of tremblant-woods, panorama-ridge and see it selected | the same, with ardennes-forest added first | One more course is clicked and verified. |
| heli-first-flight | first `.heli-lessons` has "INSTRUCTOR" and a skip button exists | `.heli-lessons[aria-label="Instructor"]` has "INSTRUCTOR" and a skip button exists | Same text and skip button required, but now tied to the instructor panel itself so the landed panel can not satisfy or hide it. |
| deep-achievements | live shelf (no flags) has exactly 1 tile | live shelf has exactly 6 tiles, and their ids in order are raised-from-the-deep, she-runs-again, wreck-racer, coast-cup-as-found, restored, coast-cup-restored | An exact ordered id list, stricter than a count. The shelf with the Lab off (Raised alone) is still checked in `tools/test-deep-achievements.mjs` (`achievementShelf(p, {enabled: true}).length === 1`), because the live game can no longer show it. |

## Tests run

- `node tools/run-browser-scenarios.mjs --scenarios drive-lesson-run,heli-first-flight,deep-achievements --jobs 2`: 3 of 3 pass, 0 warnings, 0 errors.
- Each scenario failed before the change with the reported message (reproduced here).
- `node tools/run-tests.mjs --tier lane --changed --jobs 4`: all pass (Tests: 20 passed, 0 failed; 632 passed, 0 failed in the inner suites).
- `npm run build`: built.
- No `src/` file changed, so the Deep and helicopter suites were not rerun.
- No frame timing.

## Removed

Nothing. The scratch debug scenario and the `.evidence/` output were deleted.
