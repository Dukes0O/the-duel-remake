# LAB-CLASSROOM-LAST-TWO

Merged `integration/wasteland` and `codex/lab-suspension` into `codex/lab-grip`.
Kept the integration status page and combined both sides' classroom checks.
The classroom registry now includes both Grip and Suspension.

Removed the superseded `gforce-lesson.js`, `gforce-animation.js`,
`grip-lesson.js`, `grip-animation.js`, `suspension-lesson.js`, and
`suspension-animation.js` files. No source imports those old lesson modules.
`lesson-ui.js`'s old lesson path has no lesson definitions left; its broader
removal stays with LAB-CLASSROOM-LIVE.

## Removed

- `tools/test-lab-lessons-workshop.mjs`: it tested only the replaced G-force lesson.
- `tools/test-lab-lessons-tunnel.mjs`: it tested only the replaced Grip and Suspension lessons.
- `tools/scenarios/lab-lesson-frame.mjs`: it borrowed the replaced Grip lesson and its five-step `.lab-teaching` panel.
- `tools/scenarios/lab-lessons-tunnel.mjs`: it exercised only the replaced Grip and Suspension lesson panels. Their classroom scenarios remain in `lab-classroom-grip.mjs` and `lab-classroom-suspension.mjs`.

The remaining `.lab-teaching` checks in classroom scenarios assert that the old
panel does not open beside a classroom. They still test a live UI condition.
`run-browser-scenarios.mjs` had no old lesson selector or scenario entry to remove.

## Checks

`test-lab-classroom.mjs`, `test-lab-classroom-page.mjs`, and every remaining
`test-lab*.mjs` suite passed except `test-lab-radio.mjs`. That suite failed on
both runs because `tools/audio/measurements.mjs` reported an FFmpeg loudness
measurement failure. Repository hygiene and `npm run build` passed. Browser
scenarios and the lane tier were not run. The build reported its existing
large-chunk warning.

## Removed files

See the Removed section above.
