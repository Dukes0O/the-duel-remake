UNFINISHED: first working slice only. Still to do: the "what happened last time" line (last race or result), a look review by Claude, Kyle's try-out, and turning the switch on.

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
- The three questions: Drive card (what can I do now), Next up (what to do next), the doors (what is out there). "What happened last time" is not yet shown (see Not done).

## Tests

- `tools/test-menu-front-door.mjs` (new, found by the runner automatically): switch off keeps today's markup; switch on renders the three parts, the moved controls and the eight doors with the right actions; a locked door has no action; the next-up chooser picks the first match for sample profiles; the drive line is plain words. 7 of 7 pass.
- Lane tier (`--tier lane --changed --jobs 2 --keep-going`, final run): 56 pass, 6 fail. `test-feature-flags`, `test-preview-launcher`, `test-deep-look` and `test-heli-mode` failed on earlier runs and were fixed here (switch count 42 to 43, Preview list, and the Deep and helicopter import guards kept intact by routing through `app.js`). The six that still fail (`test-board`, `test-course-kit`, `test-earned-cars-ui`, `test-medals`, `test-lab-lessons-flying`, `test-drive-through`) all stop on "DeleteDirectory ... not supported on this system", the sandbox this helper ran in cannot move a temporary folder to the Recycle Bin. They touch nothing this card changed. They need one rerun from a normal PowerShell before merge.
- `npm run build` passes.
- Looked at in the browser pane at 1280x720 with memory-only saves (`tools/menu-check.html?flags=menu-front-door`): no scrolling, drawer opens on the same screen.

## Not done

- Next up reads all six steps from the save: Lab lesson, affordable course, Wasteland hold at 75 or more and not claimed, today's helicopter recovery job, next driving lesson, next unlogged sea creature (only after a first one is logged, so the Deep stays hidden). Only the recovery job counts as a "waiting helicopter job" for now.
- "What happened last time" line (last race or last result).
- No visual review round; no frame check (rule 9: nothing a player can reach yet).

## Removed

Nothing removed. With the switch on, the small top-bar logo, the "CHOOSE YOUR WEAPON" heading, the footer controls strip and build stamp, and the old Wasteland, Helipad and Instructor buttons are not shown on the first screen; they are replaced by the doors. Delete the old versions when the switch turns fully on.
