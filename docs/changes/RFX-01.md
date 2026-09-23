# RFX-01: Split the game screens

Status: ready for integration review.

## What changed

- `src/main.js` is 52 lines. It backs up and opens the career, creates the App, then mounts the screen router.
- Menu, garage, armory, courses, players, leaderboard, results and HUD now have separate `screen-*.js` and `screen-*.css` files. Renderer readiness has its own UI module.
- The router keeps shared DOM events and screen transitions. Screen modules render markup or read App state. They do not change race simulation rules.
- Existing UI tests now call the menu, garage, course, results, HUD and readiness functions. The test runner follows the new `screen-menu.js` dependency.

## Verification

- Production build passed after the split.
- Final private High and Performance browser smoke passed after HUD markup extraction: menu ready, race active, four screenshots, zero warnings and zero errors. The browser used a random private port and memory-only saves.
- Focused tests passed: completion 162, busted/quit 280, course/practice UI 38, course eligibility 2066, driver UI 66, Jesko UI 41, renderer readiness 34, jump-height HUD 100, metric speed 62, reverse presentation 18, build updates 194, course access 161 and test runner 124 checks.
- Final broad lane gate passed all 172 test groups in 387.21 seconds, with zero failures and zero not run.
- Replay fingerprints passed unchanged: 162 checks across 18 cases and three frame rates. No world signatures were changed.

## Test changes

The old tests evaluated slices of `main.js` with `new Function`. They now import the real exported screen functions and keep the same behavior cases. CSS checks read the matching screen stylesheet. The test-runner assertion was updated from the former `main.js` dependency to `screen-menu.js`.

## Remaining source-slicing debt

`tools/test-vehicle-assets.mjs` still evaluates a slice of `tools/vehicle-art-check.js`. That tool is outside this UI task's owned files, so it stays unchanged for a separate tooling card. Other tests that inspect renderer or performance source are also outside the `main.js` screen split. The Wave 2 project-wide no-source-slicing target needs those tool-owned cases before it can be claimed complete.
