# QA-INSTRUCTOR-ANY-CAR-SLOW

## Changed

The existing runner task argument list passes `--sample` to the any-car
instructor suite in lane and changed-only plans. The fixed sample uses the
Falcone F42 and Jesko on alternate roads within each lesson, keeping all 11
lesson-road combinations at Casual and Pro: 22 cases rather than 308. Full, merge, default and direct runs retain all cars.
No new test framework, dependency or game code was added.

## Checks and timing

Before: over one hour, as reported on the card for 28 October. That old full
matrix was not repeated because it exceeds the 30-minute limit. This is a
reported baseline, not a newly measured before run.

After: not measured. The sampled suite and whole lane duration remain unknown.
The lane gate and production build were not run. From about 13:44 to 14:14 PT,
shared heavy-job capacity stayed full: full runner PID 14260 and successive
browser or lane jobs, finally lane runner PID 19520. Stopped at the user's
30-minute tool-problem limit without starting another heavy job. The required
commands remain `node tools/run-tests.mjs --tier lane --changed --jobs 2` and
`npm run build`; the lane output will give both suite and overall duration.

Passed: `node tools/test-test-runner.mjs` (209 checks), syntax checks on all
changed scripts, and `git diff --check`. The runner-plan check passed before
the final reduction from 44 to 22 sampled cases; that reduction changes only
the suite's selected cars, not its runner task or arguments. Independent review
also checked the final 22-case selection. No native instructor run passed in
this session. Acceptance remains pending the measured run and build.
Independent code review: no findings; all original per-case assertions remain.
Browser, art and frame checks are not needed for instructor test selection.
Race simulation and replay expectations are unchanged.

## Changed assertions

None of the instructor assertions changed. Added six runner-plan checks prove
that only lane and changed-only plans pass the sample argument. Existing
runner checks stay intact. The sample narrows daytime case coverage; full runs
retain the complete matrix and the same checks for every case.

## Removed

Removed exhaustive car enumeration from daytime lane dispatch only. No source,
asset, full-tier case or per-case assertion was removed.

## Claude's review (28 October 2026, night)

Approved (independent code review, rule 18). Lane and --changed runs pass --sample to test-lesson-instructor-any-car: every lesson road and both difficulties still run, with the starter and the fastest road car alternating; full and direct runs keep all 308 cases. No check per case changed. The browser harness sets the disposable browser's download folder to the scenario's output folder, so test exports no longer land in Kyle's Downloads.
