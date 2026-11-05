# LAB-CLASSROOM-GRIP

Status: Implementation complete; lane handoff is blocked by local check tools.

## Design

Rewrote the lesson for a young player and parent. It begins with rubber pressing on the road, explains why a tyre needs a small slide angle to turn, then teaches the best angle and what the driver feels past it. The lesson uses about 4.3 degrees and simple rounded percent examples. The first prediction asks about the size of the 4.5 degree loss; the graph, reading and worked result stay hidden until the player answers and runs the tyre. A second prediction compares 9 degrees with the recorded 4.5 degree result. Three check questions each have one correct card.

The graph uses unrounded casual tyre results and the board shows a top-down tyre, travel and pointing arrows, the angle between them, and longer rubber marks past the best angle. The graph label now fits within its panel. The challenge rule, reward, save shape and notebook ids remain unchanged. The notebook's Slip entry defines the word in one plain sentence.

## Verification

- `node --test tools/test-lab-classroom.mjs tools/test-lab-classroom-page.mjs`: 42 passed, 0 failed.
- `npm.cmd run build`: passed, exit 0. Vite reported the existing dynamic-import and large-chunk warnings.
- Lane tier: started with `node tools/run-tests.mjs --tier lane --changed --jobs 4`. The changed Grip suite and numerous adjacent suites passed. It stopped at `tools/test-review-evidence.mjs`, where its audio-analysis check could not launch `ffmpeg` (`spawnSync ffmpeg EPERM`). One standalone rerun failed the same way. The lane process then stayed silent after the failure and was stopped; the tier did not finish.
- Browser scenario: three attempts (`--headed` twice and once in default mode) ended with `Chrome DevTools connection closed`; none produced screenshots or a completed scenario report.
- Race fingerprints: not applicable; race simulation and challenge code were not changed.

## Changed assertions

Replaced assertions tied to hidden slip values, six-decimal arithmetic, the old single-question flow, and whole-percent display with checks for the rounded percent sum, no answer leaks during predictions, both prediction explanations, three check cards with one correct answer each, and graph-panel extents. Added Grip to the page-language checks. Existing challenge completion, two-run target, three distinct free settings, notebook ids and lesson registration assertions remain active; no behavior checks were weakened.

## Removed

Removed the player-facing internal slip equation and its precise hidden values, the one-question quiz, and the old 4.5 degree result incorrectly displayed as 100%. The card's prior script was replaced by the revised script. No files were deleted.
