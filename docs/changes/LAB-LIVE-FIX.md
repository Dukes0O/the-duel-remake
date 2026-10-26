# LAB-LIVE-FIX

## Design and scope

Kyle supplied Claude's four decisions for this repair. Give the Speirling a
stable, higher engine pitch with fan intake and no exhaust or shift accents,
using the existing car voice recipe. Limit the Jesko's brake superiority to
petrol cars. Add only the Speirling's non-Titan replay pin. Explicitly disable
lab-tuning in the switch-off race test; keep its exact equality assertion.

The circuit test driver needs an optional featureFlags input so this test can
use the existing createFeatureFlags override API before the race starts.
Checks: the four named suites, lane tier with changed files and four jobs,
and the production build. No browser or frame check is needed for this repair.

## Changed assertions

These changes implement the Claude decisions supplied by Kyle for this task.
No tolerance or existing replay value is loosened.

| File | Old | New | Why |
| --- | --- | --- | --- |
| `tools/test-koenigsegg-driving.mjs` | `tuned.braking > max.braking` for every other car | The same strict comparison for every other car except `mcmurtry_speirling`; label says among petrol cars | LAB-FAN gives the electric fan car the best braking. All speed, acceleration, grip and nitro comparisons still include it. |
| `tools/test-koenigsegg-driving.mjs` | Jesko stopping distance from 100 mph is strictly shorter than every other car's | The same strict distance comparison except for `mcmurtry_speirling`; label says among petrol cars | The measured brake claim must match the same petrol-car scope. The fan car still runs the stopping test and all nitro comparisons. |
| `tools/replays/titan-handling.json` (used by `tools/test-titan-handling.mjs`) | Complete non-Titan roster has 12 pinned cars, without the Speirling | Adds only `mcmurtry_speirling: 3d9a745e0ad8774c664f37d6ccd3d8c60542c358a47ca547870884530851efbc` | The released roster now includes it. Same seed 1989, 120 Hz, 360 ticks, inputs and full-state hashing. All 12 earlier hashes remain unchanged; roster equality and replay assertions are unchanged. |
| `tools/test-lab-tune.mjs` | The switch-off tuned race inherits release defaults | Passes `createFeatureFlags` with `overrides: {'lab-tuning': false}` before starting that race | LAB-LIVE changed the default to on. The assertion still compares the same complete serialized result and last race state byte for byte. |

`tools/test-audio.mjs` is unchanged. `src/sound-bank.js` adds the Speirling's
fixed voice recipe: pitch 1.16, brightness 1.12, gain 0.94, accent 0, exhaust
0 and intake 0.24. It uses the existing recorded and fallback engine layers.

## Validation

- Audio: 547 checks passed; 934,073 finite automation commands. The initial
  sandboxed run could not load decoded recordings; rerunning with access to
  the installed FFmpeg decoder passed. No listening verdict is claimed.
- Jesko driving: 41,265 checks passed, including eight full races and exact
  30/144 FPS trajectory equality (Pacific: 78.85 s, 9,823 fixed steps).
- Titan handling: 50 checks, zero failures; all previous replay pins pass.
- Independent code review: clear; earlier pins and all other comparisons
  unchanged, tuning equality retained, no save or simulation changes.
- Lab tuning: 215 checks passed.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4`: failed after
  48.97 s; 11 suites passed, 1 failed, 76 not run (runner stops on failure).
  `tools/test-arsenal-wave1-audio.mjs` fails its old sound-bank export hash:
  expected `8bed9e05cbd48321670c377483bc87c841b01eac228a6237889b8ce5602a2b38`,
  actual `4f41cdd93762f37b875ab7d52675a32c67cfd2335775b697503a934f48010a6b`.
  It excludes the Enzo, F1, Bolide and Sirena voices added after that baseline,
  but includes the new Speirling voice. No old voice was changed. This extra
  assertion is outside the four supplied decisions and remains unchanged
  pending a scope decision. No unchanged rerun was made.
- `npm run build`: passed, 540 modules, 829 ms; existing chunk-size and mixed
  static/dynamic import warnings only.
- `git diff --check`: passed. Session status refreshed. Cockpit sync passed,
  zero task changes, using the protected runner with user credential access.

## Removed

Replaced the Speirling's fallback Falcone voice and the two all-car Jesko
braking claims. No old car replay values or audio assertions are removed.
Recycled the generated production build after recording its result. No scratch
files, captures or regenerated old fixtures remain.
