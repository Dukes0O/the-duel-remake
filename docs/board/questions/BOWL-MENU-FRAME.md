# BOWL-MENU-FRAME: question for Claude

**What needs deciding.** The cloud build could not make the error happen, so the cause is not found and nothing in
`src/` was changed. Is the card to stay open for a laptop drive, or be closed?

**What was tried (26 November 2026, current `integration/wasteland`, Linux Chrome with software GL).**
Opening SHOW NIGHT from the menu with the real render loop running, in the QA page (default flags and `titan-bowl`),
and in the production build through Playwright with a fresh player: no page error. The same after a night, after a
normal race and back to the menu, with nights one to four won, and with the menu's stage set to the Bowl by hand. A
headless run of all 15 events (nights 1 to 5) checks the truck's and every opponent's `s` for 600 steps: always a number.
Every course's menu frame (`worldAtExtended(course, 172 + 6.4, ...)`) is finite for all 32 stages.

**What the code says.** The menu branch of `src/render3d.js` uses `distance = 172`, never the car's `s`, so that
branch cannot receive a non-number. `Course._frame` fails with exactly this message only when `s` is NaN or
`samples` is short, so the caller is a different `worldAt` that gets `state.s`/`car.s`. The card's reading of the
caller is probably wrong. A real stack from Kyle's or Claude's Chrome would name it.

**Options.**
1. Keep the card open. Claude drives Show Night on the laptop with the console open, copies the stack of the one
   error, and the card gets the true caller. (Recommended.)
2. Close the card as not reproduced on the current build, keeping this note's live-loop check as the guard.

**Recommended pick, and what this branch did.** Option 1. The branch adds only the check the card asked for: the
existing `bowl-night-pay` scenario stopped the render loop in `page.enter`, so it never drew a menu frame; it now
runs the loop while the picker opens and fails on any page error. It passes today, so it proves nothing about the
fault until the cause is found.
