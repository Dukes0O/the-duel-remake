# LESSON-INSTRUCTOR-ANY-CAR

## Decision before code

Keep the current plan-based cone placement: its brake point is the speed plan's
brakeS, its apex is the inside waypoint and its exit is the outside waypoint.
Do not move cones to fit a simulated trace. Keep student distances unchanged.
Retry a failed native run at two percentage points less pace, at most four
retries, with floors of 84% Casual and 89% Pro. Preserve today's starting pace
(92% Casual; 95% Pro corner, 97% other Pro lessons); stop at the floor rather
than repeat it. Each retry creates a fresh seeded race and recomputes its plan.
Only native-run failures retry; invalid options and plan errors still fail directly.

## Checks

- Every car, both difficulties, every row of corner, line, gears and snow:
  clean finish, no tipped cone, identical result from two builds. Gears use
  engine-curve. Snow includes summer and winter runs.
- Existing lesson suites, lane tier with jobs 4, production build.
- No frame check or browser check is required by this card.

## Changed assertions

For Claude's written review before integration:

- `tools/test-drive-lessons.mjs`, native instructor case: replace
  `distance >= TIP_DISTANCE_M + LESSON_LINE.minClearM && distance <= 2.5`
  with `distance > TIP_DISTANCE_M`.
- `tools/test-drive-lesson-2.mjs`, native line instructor case: same replacement.
- `tools/test-drive-lesson-3.mjs`, native gears instructor case: same replacement.
- `tools/test-drive-lesson-4.mjs`, summer and winter instructor case: same
  replacement (one assertion exercised for both tyres).

These remove the instructor-only proximity and extra-clearance requirements
explicitly replaced by this card. The no-tip threshold remains strict at 0.8 m;
student counting stays at 2.5 m and tipping stays at 0.8 m. No replay pins,
student assertions, tolerances or physics are changed.

The instructor's own gearbox-rule guard now applies only to multi-speed cars.
McMurtry has one gear, so it starts in that gear and cannot demonstrate an
upshift. Its instructor still must pass the full native clean-run and no-tip
checks. Student gearbox rules are unchanged.

Independent code review: clear after fixing this single-speed setup. The first
matrix attempt was stopped because it used the superseded setup; no pass
claimed for that attempt. Final results follow below.

## Removed

Removed the instructor's must-count-every-cone guard, the extra 0.5 m
clearance guard and its unused `minClearM` setting. Raw error details are
removed from the player message and sent to `console.warn`. No assets,
student rules, saves or rewards were replaced.


## Results

- Lane: `node tools/run-tests.mjs --tier lane --changed --jobs 4`:
  34 suites passed, 0 failed, 0 not run, 220.54 s.
- Every-car suite: 196 tests passed (14 cars, seven rows, two difficulties),
  130.41 s. Two builds match exactly for each case; snow also checks winter.
  Every run finished cleanly and stayed clear of the 0.8 m tipping threshold.
  No car or row needed a slower retry. Paces: Casual 92%; Pro corner 95%;
  Pro line, gears and snow 97%. Jesko/Panorama lesson 1 passes both settings.
- Existing instructor, native student and App lesson suites passed. Replay
  fingerprints unchanged: 225 checks across 25 cases, 23 events, nine categories,
  three frame rates and three runs; combat replays 12 checks also passed.
  World composition and repository placement passed.
- `npm run build`: passed, 1.02 s. First attempt hit sandbox EPERM in the
  integration-linked node_modules Vite temp folder; same command passed with
  elevated filesystem access. Existing chunk-size/dynamic-import warnings only.
- Heavy counts: zero before corrected lane, one at the one-minute recheck,
  zero before each build attempt. No browser, frame timing or live-game access.
  All native test state is in memory. Independent code review: clear.
- Session status regenerated. Added Cockpit task T-065 with this card in its
  notes, then ran board sync and refreshed the local view. No merge or push.
