# LESSONS-V2-RULES

## Decisions before code

- Section 14 replaces the old scoring and stages. The four step ids are
  `watch`, `follow`, `your-turn`, `beat`. Each exposes its rule and guides.
  Watch and Follow never award a pass; retakes start at Your turn.
- Each corner owns its approach (after the previous corner), turn and exit.
  The first rising press of at least 50% brake in that approach is judged.
  Speed and screech are measured within the turn. A lift accepts no brake;
  a flat corner has no brake check. Wall hits and more than one continuous
  second off road fail the run. Total screech must be below 0.3 seconds.
- Use the instructor's planned path and speed, with native 120 Hz inputs
  recorded before each tick. The last pose is an interpolated finish marker;
  replay inputs retain whole ticks. Distance gaps interpolate his time at
  the same distance, and are positive when the student is behind.
- Begin with the section table exactly as written. Measure both named cars
  before deciding any whole-corner changes. Linked corners use a continuous
  path; no teleporting or invented pauses to reach the duration target.
- No save schema or reward change is needed: existing `best` stores the
  winning margin and existing `done` preserves old passes. Gold is derived
  from a margin of at least one second.
- Today's screen must accept the new step ids and completion shape. Any
  compatibility touch will only show rules/results and keep next/save working;
  VIEW owns the full briefing, road guides and Watch camera.

## Checks planned

1. Native section durations, teaching proofs and repeatable recorded inputs.
2. Pure scoring boundaries, steps, clean faster override and distance gap.
3. Existing every-car, both-settings instructor suite on all seven sections.

Then one independent code review, lane tier with four jobs, and build.
No frame timing or real storage.

## Removed

Removed the old single-corner rows and planners, try 1/try 2/winter stages,
three-win streak scoring, and tests of those replaced rules. Removed their
live marker-update path and old panel wording. The sound files stay for
LESSONS-V2-LINES to replace as its card directs.

## Section changes and reasons

- Panorama braking keeps all nine proposed corners. Its gate moves another
  350 m back on Mountain Straight to give six seconds before braking.
- Woods braking extends backwards by Pine Drop, Lakeside Plunge and the two
  Fir Esses. The proposed Ridge Run section took only 29.20 s in the Falcone
  and 22.97 s in the Jesko before the entry plan was settled.
- Woods racing line extends through Ridge Corner, Beaver Kink and Beaver
  Hairpin, finishing 150 m into Timber Straight. The proposed row took
  26.75/21.22 s. Both Woods rows begin at course distance 0 on Lodge Straight.
- Woods gearbox extends backwards by Ridge Corner and the two Fir Esses,
  beginning on Lakeshore at 30 mph in second. The proposed two-corner row
  took 22.90/19.15 s.
- Snow extends backwards by both Fir Esses, beginning on Lakeshore. The
  original Jesko row took 28.85 s. Its line keeps extra room on the outside
  of the hairpin so a driver using 100% of its speed can stay on the road.
- Harbour adds Lantern Kink before Casino and Precinct Bend after the
  Esses, ending at the end of Hairpin Approach. The first proposed section
  took 26.69/21.23 s with a continuous line. Adding Lantern Hairpin was
  rejected: it pushed the Falcone over 75 s and the Jesko hit its wall.
- Rolling entries hold the planned entry speed for six seconds, then use
  the car's acceleration. This is moving road at race speed, not a pause.
  Gearbox retains its specified 30 mph start. Linked corners have a short
  brake release before the next planned firm press, so every public brake
  zone teaches an input the instructor actually makes.

## VIEW contract

`buildInstructorRun` returns serializable data; no renderer or storage is
needed. Existing `corner.startS/finishS` are the section gates. The exported
row tables name the whole section and its course pieces.

- `instructor.corners[]`: `name`, `kind` (`brake`, `lift`, `flat`),
  `approachS`, `turnInS`, `turnOutS`, `exitS`, `brakeS` (null when absent),
  `brakeZone: {s0,s1}` or null, `targetMph`, `apexCone`, `exitCone`.
  Cones come from planned inside/outside extrema, never a driven trace.
- `instructor.plan[]`: metre samples with `s`, `lateral`, world `x/y/z`,
  `targetMph` and `action` (`accelerate`, `coast`, `brake`).
- `instructor.inputs[]`: native 120 Hz inputs applied before each tick,
  with time/distance, pedals, wheel and shift buttons. `poses[]` contains
  the ghost, with an interpolated final gate pose. Do not interpolate inputs.
- Braking lessons also supply `lateClip` with its own inputs, poses, time,
  screech duration and faults. The braking plan is delayed 25 m and the
  demonstration asks the tyres to turn without the instructor's grip cap;
  it ends after 0.5 s of real screech or at an off-road/contact event.
- Snow supplies `ice[]`, the asphalt plan's `redBoardS`, and `winter` time,
  poses and inputs. Winter is a comparison, not a fifth step.
- `DRIVE_LESSON_STEPS` and `driveLessonStep(lesson)` supply step ids,
  titles, pass-rule ids, exact "what counts" text and line/ghost guidance.
  Follow's ghost leads by one second. `retake: true` starts Your turn.
- During driving, `attempt.corners[].result` contains each light/check;
  `lastAttempt.corners[]` supplies brake distance, actual/target speed,
  tyres, checks and light. `lastAttempt.advice` names the worst corner.
- `driveLessonGap(instructor,s,elapsedSeconds)` compares time at equal
  distance: positive is behind. `driveLessonGold(bestMargin)` derives gold
  at 1.0 s. Both times use the same microsecond comparison, so a tie cannot
  earn a win from rounding.

Minimal compatibility edits: game replays Watch inputs and removes the old
winter-run transition; app skips Watch on Enter, starts retakes correctly
and chooses the appropriate ghost. The existing panel accepts the new
steps/results/completion. VIEW still owns its full briefing, road painting,
camera sequence (late clip then clean Watch), target box, gap and result table.

## Assertion changes for Claude's written review

- Replaced the single-corner durations, cone-count/order assumptions, forced
  bad tries, four old checklist rules, streak counts and automatic winter
  pass with section duration/guide, per-corner, four-step and clean-win tests.
- Preserved the entire every-car/both-settings repeatability suite unchanged.
- Restored the still-valid admission, owner isolation, ordinary settlement,
  failed-save/retry, preparation cancellation, nullable ghost, gearbox
  restoration, Pro limiter and shift-light protections. Only their old stage
  names and obsolete marker/cone-count expectations changed.
- Added direct instructor checks for every corner in the two named cars and
  both settings, exact-tie rejection, clean faster/missed-zone override,
  brake-window boundaries, per-corner speed/screech, gap and gold checks.
- No replay fingerprint, tolerance or acceptance threshold was loosened.
  The first lane attempt found two real Woods failures; the path changed,
  not the assertions. Claude's written assertion review remains for merge.

## Independent review

One read-only reviewer found and confirmed fixes for public brake points,
unreachable lift classification, rounding wins, misleading advice and removed
safety coverage. Final confirmation: no remaining code defect found. The
result snapshots also exclude prior snapshots, avoiding recursive growth.

## Final checks and measurements

The final game source passed 34 lane suites in 464.63 s, including the
unchanged every-car suite: **196/196**, clean and repeatable. The unrelated
Blackiron audio suite could not find FFmpeg (`spawnSync ffmpeg ENOENT`),
leaving Gunn art and world composition unrun. Those three suites then passed
in **40.00 s**, jobs 4, with the installed `imageio_ffmpeg` executable through
`FFMPEG_PATH`; no game or test change. Combined lane coverage: **37/37**,
zero failures or unrun suites. Passing suites were not repeated.

`npm run build`: **PASS**, Vite **775 ms**. Its first attempt was blocked
because the dependency junction puts Vite's temporary config outside the
lane sandbox; the same build passed with temporary-write access. All gate
and build commands used PowerShell with System32 first on PATH. Heavy-job
admission counts were zero; the one-minute gate count was one. No competing
job was stopped. The build and scratch evidence are recycled after recording
these verdicts. Session-end status is included in this commit.

No frame timing or browser checks were requested for this rules card; the
native App uses memory-only storage. Replay guard: **225 checks**, 25 cases,
23 events, nine categories, three frame rates and three runs; fingerprints
unchanged. Direct instructor checks and exact ties: 28/28; lesson teaching
proofs and full-speed driver: passed on both settings.

Times below are seconds, **Casual / Pro**. Each row stays inside 30–75 s.

| Section | Falcone | Jesko |
| --- | --- | --- |
| 1 Braking, Panorama | 44.023731 / 43.153658 | 35.897698 / 35.327284 |
| 1 Braking, Woods | 48.400391 / 47.587904 | 40.415860 / 40.114021 |
| 2 Racing line, Woods | 48.400391 / 47.095281 | 40.415860 / 40.114021 |
| 2 Racing line, Harbour | 45.296180 / 44.279169 | 37.864554 / 37.270964 |
| 3 Gearbox, Panorama | 38.039138 / 37.533418 | 30.792798 / 30.340257 |
| 3 Gearbox, Woods | 38.633999 / 37.685052 | 31.612778 / 31.145906 |
| 4 Snow, Woods | 47.606713 / 46.497865 | 38.744485 / 37.899202 |

Proof numbers:

- Late Watch clips: **0.500 s screech**, both sections, both cars, both settings.
- Middle-road driver at 100%: **0.458662–1.756092 s slower** at Woods,
  **0.323530–1.483351 s slower** at Harbour.
- Scripted 100% driver, Falcone, every section and both settings: clean and
  **0.275425–1.949590 s faster**.
- Dry-board snow driver leaves the road in all four car/setting cases.
  Winter times are **43.445513 / 42.471525** in the Falcone and
  **36.220177 / 35.363849** in the Jesko: **2.524308–4.161200 s faster**.

Native faster-run override proof, on the new Panorama section: instructor
44.023731 s, student 42.418872 s, clean, Your turn passed. The student missed
The Cutting's zone by braking 6.91 m late, Summit Park by 14.99 m late, and
had no qualifying first press for Esses 1. This proves the faster route to
passing uses actual section observations rather than invented outcomes.

Session-end Cockpit sync: completed, zero task changes. It reported the
unrelated card HELI-SUMMIT-LANDED without a mapped task; no hand edit made.
