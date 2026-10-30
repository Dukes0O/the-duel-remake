Round 2 done (see below). Still to do: Kyle's try-out, then turning the switch on.

# MENU-FRONT-DOOR: the main menu as a front door

Switch: `menu-front-door`, state `dev` (off in the game). With it off the menu markup is exactly as before.

## What changed

- `src/menu-front-door.js` (new): the plain rules and markup. `frontDoorFacts` reads the save into a few facts, `chooseNextUp` picks the first match from the ordered list (open Lab lesson, affordable course, Wasteland hold, helicopter job, next driving lesson, next sea creature), `doorList` gives the eight doors with a badge (NEW, READY or LOCKED with a plain reason), `frontDoorMarkup` draws the three parts.
- `src/screen-menu.js`: `screenMarkup` takes an optional `frontDoor` argument. When set it drops the small top-bar logo, the "CHOOSE YOUR WEAPON" wording (now "YOUR CAR") and the build stamp, adds the front door, and wraps the existing race setup and car panel in a hidden drawer. `updateMenuCar` calls an optional `onFrontDoor` hook at its end.
- `src/screen-router.js`: with the switch on, moves START ENGINE into the Drive card, opens and closes the "Race options" drawer, and refreshes the course name, the "your car · mode · level" line, the Next up sentence and the door badges whenever the menu refreshes. No control was copied: the old selects and buttons are moved, so their handlers and ids are unchanged.
- `src/screen-front-door.css` (new): the first screen at 1280x720 with no scrolling, the left third faded dark, tiles styled like the Scrapdome yard panel.
- `src/app.js`: one small read-only method, `menuNextUpExtras`, gives the menu today's helicopter recovery job and the next unlogged sea creature. It lives in the app because only the app may import the Deep and helicopter files (the Deep look guard).
- `src/feature-flags.js`: the new switch. `start-preview.bat`: Preview asks for it. `tools/test-feature-flags.mjs`: the switch count goes from 42 to 43 (the new switch itself; no assertion loosened).
- Doors use the existing actions: garage, courses, armory, wasteland-visit, heli-visit, lab-open, leaderboard, and `data-drive-open` for Lessons. A locked door is disabled and says why.
- The three questions: Drive card (what can I do now), Next up (what to do next), the doors (what is out there). "What happened last time" is added in round 2.

## Tests

- `tools/test-menu-front-door.mjs` (new, found by the runner automatically): switch off keeps today's markup; switch on renders the three parts, the moved controls and the eight doors with the right actions; a locked door has no action; the next-up chooser picks the first match for sample profiles; the drive line is plain words. 7 of 7 pass.
- Lane tier (`--tier lane --changed --jobs 2 --keep-going`, final run): 56 pass, 6 fail. `test-feature-flags`, `test-preview-launcher`, `test-deep-look` and `test-heli-mode` failed on earlier runs and were fixed here (switch count 42 to 43, Preview list, and the Deep and helicopter import guards kept intact by routing through `app.js`). The six that still fail (`test-board`, `test-course-kit`, `test-earned-cars-ui`, `test-medals`, `test-lab-lessons-flying`, `test-drive-through`) all stop on "DeleteDirectory ... not supported on this system", the sandbox this helper ran in cannot move a temporary folder to the Recycle Bin. They touch nothing this card changed. They need one rerun from a normal PowerShell before merge.
- `npm run build` passes.
- Looked at in the browser pane at 1280x720 with memory-only saves (`tools/menu-check.html?flags=menu-front-door`): no scrolling, drawer opens on the same screen.

## Not done

- Next up reads all six steps from the save: Lab lesson, affordable course, Wasteland hold at 75 or more and not claimed, today's helicopter recovery job, next driving lesson, next unlogged sea creature (only after a first one is logged, so the Deep stays hidden). Only the recovery job counts as a "waiting helicopter job" for now.
- No frame check (rule 9: nothing a player can reach yet).

## Removed

Nothing removed. With the switch on, the small top-bar logo, the "CHOOSE YOUR WEAPON" heading, the footer controls strip and build stamp, and the old Wasteland, Helipad and Instructor buttons are not shown on the first screen; they are replaced by the doors. Delete the old versions when the switch turns fully on.

## Claude's review (28 October 2026, night)

Claude reviewed: switch off leaves today's menu; shared-file changes read only and guarded by the switch; rule 18: switch count 42 to 43 follows the new switch, nothing loosened. First slice, UNFINISHED (last-race line, drawer covers doors, Wasteland badge, look review). Six suites blocked only by Recycle Bin cleanup in the lane folder were rerun in integration after merge.

## Round 2 (29 October 2026)

- **What happened last time.** `lastTimeLine(profile, stageIndex)` in `src/menu-front-door.js` reads the save's race history and personal bests for the chosen course and fills a new line (`#fd-last`) in the Drive card, between the summary and START ENGINE. Examples: "Last time: won in 03:07.40 · Best 03:05.10", "Last time: lost, you finished in 03:11.25", "Last time: you left the race early", "Your best here: 03:05.10" (a best but no race kept), "You have not raced here yet." (raced elsewhere), nothing for a new player. The save keeps only won or lost and the finishing time, not the place, so the line says "won" or "lost" and not "2nd". No new save fields. The router refreshes it whenever the menu refreshes (course changes included).
- **The drawer no longer covers the doors.** `.front-door-options` now fills the grid area to the right of the Drive card and above the doors row (`grid-area:1/2/5/3`), so the doors are always uncovered and reachable. The drawer's own contents scroll inside it (no page scroll). The two real causes found while looking: the credits footer was still a grid item (its absolute position lost on specificity), which made two extra grid rows and columns and squeezed the title row to 20 px so "THE DUEL" overlapped the Drive card; the rows are now `max-content` and the footer is lifted out of the grid. Doors now span the full width.
- **Wasteland badge.** A boss hold of 75 or more that is not yet claimed (a full hold of 100 not yet claimed counts too; it used to be dropped from Next up) shows the badge "NEARLY WON" in the yellow style with the note "Finish Sawtooth Sal's hold". Door labels now leave room for the badge and notes run the full tile width; two long notes were shortened ("A new course is in reach", "Weapons and armor").
- **Look check** (`tools/scenarios/menu-front-door.mjs`, memory-only saves, private port, 1280x720, no frame timing): a new player, a mid-career player (six cars, Lab and helicopter open, Sawtooth Sal's hold at 75, one race on Pacific Canyon), the drawer open, and the drawer scrolled to its end. It fails if the page scrolls, if any open door, Next up, START ENGINE or Race options is outside the screen or covered, or if the drawer reaches the doors. One contact sheet was reviewed by Claude's helper. Found and fixed: title overlapping the Drive card, door label cut by the badge, drawer over the doors. The raw pictures were deleted.
- **Tests.** `tools/test-menu-front-door.mjs` grows from 7 to 14: last-time lines for every case, the badge for hold 75, 100, 50 and claimed, the badge class, the drawer's grid area and no fixed offset, the credits link out of the grid. No assertion changed or loosened.
- **Removed.** Nothing removed. The old fixed-offset drawer rule is replaced by the grid-area one.
- **Open.** With the switch on, the top bar still has its own ARMORY button next to the Armory door (the top bar is shared with the old menu). Kyle's try-out and the switch turning on remain.

## Claude's review (28 October 2026, night)

Claude reviewed code and the 2x2 look sheet: no overlap, doors full width, drawer right of the Drive card never over the doors, last-time line, NEARLY WON badge. No assertion changed. Switch stays dev until Kyle tries it.
