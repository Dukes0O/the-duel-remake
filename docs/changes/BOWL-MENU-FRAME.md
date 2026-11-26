# BOWL-MENU-FRAME (Claude cloud, 26 November 2026)

**Not finished: the error did not happen, so no cause was found and `src/` is unchanged.** See
`docs/board/questions/BOWL-MENU-FRAME.md` (recommended: Claude drives Show Night on the laptop and copies the stack).

What changed: `tools/scenarios/bowl-night-pay.mjs` now opens Show Night from the menu with the game's real render loop
running (`page.enter` had stopped it), draws six frames behind the picker, and asserts the harness saw no page error.

Checks, on the commit in the pull request, Linux Chrome with software GL:
- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4`): 24 passed, 0 failed.
- `npm run build`: built.
- Reproduction tries (QA page, production build, headless 15 events, all 32 menu frames): no error found.
- `bowl-night-pay` scenario: the new step passed (picker with the loop live, six frames, no page error; picker and Car Crush start
  pictures taken). The run then timed out at "Car Crush runs its full minute": software GL here ran 8 game seconds in 180 s, so it is not a result. For Claude to run whole on the laptop with a real GPU.

Changed assertions: none removed or loosened; one added. Race fingerprints: not moved (no game code changed).
**Removed:** nothing; the new step replaces no check.
