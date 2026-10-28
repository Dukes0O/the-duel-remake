# QA-INSTRUCTOR-ANY-CAR-SLOW

`tools/test-lesson-instructor-any-car.mjs` builds the instructor for every car, lesson, course and difficulty and took over an hour on 28 October 2026, so a lane tier that touches lesson files cannot finish in time. Done when the suite runs in a few minutes in the lane tier (for example a fixed sample of cars per lesson there, the full set only in the full tier) with the same checks per case. No assertion loosened.

## Lane decision and checks

Use the runner's existing per-suite argument list to pass `--sample` for lane
and changed-only plans. Alternate the Falcone F42 and Jesko across the roads
of each lesson, keeping every road and both difficulties. Full, default and
direct runs keep every car. Keep every assertion per case unchanged. No browser, look or frame check is needed here.

Checks: the runner's plan tests, the sampled instructor suite through the lane
gate, and `npm run build`. The card's reported old duration is over one hour;
do not repeat that known slow run beyond the 30-minute job limit.
