# QA-RESCUE-FINISH-FLAKY

Kind: browser scenario repair. No game feature or switch changes.

## Design before code

Keep the flight controls, route, fuel targets and every existing check. Give
this scenario one simulation clock: its existing fixed-step fast-forward.
Normal browser frames must still draw and update the UI, but must not advance
the flight between scripted steps or during screenshots. Keep the change local
to rescue-finish so other picture recipes keep their current behavior.

Checks: run the complete rescue-finish scenario three times in a row with
jobs 1, then the changed lane tier with jobs 2 and the production build.
No frame measurement is needed.

## Cause and result

Cause: two simulation clocks raced. rescue-view's `__go` advances the session
at 1/120 second per step. App also calls that same wrapped session from normal
browser frames, without an explicit step duration. Those extra calls keep the
last pilot target active between commands, burn fuel and can advance beyond
the touchdown at which the scripted landing stopped. Render and screenshot
timing therefore changed the next command's starting state.

Both unchanged runs passed, so the two reported failure messages did not recur
in this lane. A read-only observation of the second run did confirm the extra
clock: during a one-second browser timer, fuel fell from 104.58509631330618 to
103.90391339756185 kg while hovering at Summit. This is a scenario scheduling
fault; there is no evidence here of a game fault requiring a separate card.

The local menu wrapper now forwards only calls with an explicit duration.
The existing `__go` supplies that duration; App's frame loop does not. Drawing,
UI updates, real player controls and the underlying simulation stay intact.
No shared helper or game file changed.

Independent code review: no findings. The reviewer checked both call paths and
confirmed every original assertion and tolerance is unchanged.

## Checks

All browser runs used the requested command:
`node tools/run-browser-scenarios.mjs --scenarios rescue-finish --jobs 1 --output-dir <run directory>`.
Directories were below `.evidence/2026-10-28/QA-RESCUE-FINISH-FLAKY/`.

| Run | Result | Screenshots | Warnings | Errors |
| --- | --- | ---: | ---: | ---: |
| Requested `run`, unchanged | Pass | 8 | 0 | 0 |
| `baseline-2`, unchanged | Pass | 8 | 0 | 0 |
| `pass-1`, repaired | Pass | 8 | 0 | 0 |
| `pass-2`, repaired | Pass | 8 | 0 | 0 |
| `pass-3`, repaired | Pass | 8 | 0 | 0 |

The three repaired runs passed consecutively on identical scenario code.
Every report confirmed memory-only saves. No frame measurement ran.
The first sandboxed invocation stopped before the scenario because Vite could
not write its temporary config through linked node_modules. The authorized
escalated invocation of the same command built and passed.

- `node tools/run-tests.mjs --tier lane --changed --jobs 2`: 20 passed,
  0 failed, 0 not run, 496.90 seconds. Replay and world guards passed unchanged.
- `npm run build`: passed. Vite reported dynamic-import and chunk-size warnings.
- Independent code review: passed, no findings.
- `git diff --check`: passed.
- `node tools/build-status.mjs`: refreshed this lane's status snapshot.

No merge, push or release was attempted. Cockpit sync belongs to the Director
handoff because this job permits writes only in this lane.

## Changed assertions

None. Existing checks and tolerances stay in place. Race fingerprints were not
re-recorded; no game code changed.

## Removed

Removed the extra browser-frame flight stepping from this scenario only.
Recycled this task's raw browser evidence, scratch QA directory and production
build output after recording the results. No replacement game path, asset,
dependency or retained backup was added.
