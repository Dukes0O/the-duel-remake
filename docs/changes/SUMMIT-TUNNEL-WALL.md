# SUMMIT-TUNNEL-WALL

Design before code: Summit has one covered stretch, the Gallery at 10170–10800 m.
Its model colliders leave the valley side open between pillars. Close both
sides with continuous, short tunnel-wall boxes, following the road from portal
to portal. The inside face follows the declared 5 m gallery half-width,
using the existing tunnels' 0.9 m slab rule. Keep the roof, posts, open-road
bypass, scenery placement and hillside driving unchanged. Use the existing
wall contact and scrape sound paths; no new feature switch or sound is needed.

Checks: add a native static-contact regression that drives hard sideways at
both sides throughout every covered stretch, including portals and cell joins;
check the centre and open-road bypass remain clear. Run the lane tier and build.
No frame timing. Existing Summit pictures may document the unchanged model;
no art or world-signature re-recording is intended.

## Results

- Regression first failed at 10170 m on the open valley side, reproducing the
  escape. Final native regression passes 2,524 grounded/airborne contacts on
  both sides, every metre from entrance to exit, with centre and bypass clear.
- The first lane gate found an entrance conflict with the bypass edge lane.
  The lining now uses the declared 5 m gallery half-width, not pillar offsets.
  Existing shortcut assertions stay exact: 3,396,411 obstacle sweeps pass.
- Independent code review found the legacy 3.6 m airborne wall ceiling was
  overriding the authored gallery height. Preserve explicit vertical bounds;
  legacy tunnels retain their fallback. Reviewer confirmed the original Viper
  airborne escape now stops at -2.51 m and reported no remaining code faults.
- `node tools/browser-harness.mjs scenario summit-run` passed: 19 High and
  Performance views, memory-only saves on private port 12316, no errors or
  warnings. Reviewed the 377,468-byte picture sheet; Gallery and bypass remain
  visually unchanged. Local handoff picture:
  `.evidence/2026-10-26/summit-tunnel-wall/round-3.jpg`.
- Gates from PowerShell with `C:\Windows\System32` first on PATH:
  `node tools/run-tests.mjs --tier lane --changed --jobs 4`: 119 passed,
  audio suite blocked by sandbox `spawnSync ffmpeg EPERM`, 44 not run
  (474.61 s). Continued only that suite and the 44 unrun suites, plus two
  selected by the required STATUS update (`test-full-check`,
  `test-integrate-lane`): 47/47 passed, zero failures or not run (361.41 s),
  with normal process access. Combined lane coverage: 166 suites passed.
  Passing suites were not repeated. No actual full check or frame timing ran.
- Replay guard: all 225 checks across 25 recorded cases passed unchanged.
  World composition/signature guard: 47 checks passed unchanged.
- `npm run build` passed (1.05 s). Existing chunk-size and mixed static/dynamic
  import warnings only. Source based on integration `197d5142`.
- Cockpit sync ran; added missing SIM task T-055 with this board card in its
  notes, so future status comes from the board sync.
- QA uses no real saves; no frame timing, live edit, merge or push.

## Changed assertions

No existing assertions, tolerances, replay pins or world signatures changed.
New `tools/test-summit-tunnel-wall.mjs` assertions require an actual covered
stretch, containment after each sideways contact (grounded and 3.8 m airborne
Viper), and unobstructed forward travel on the centre and separate bypass.

## Removed

No replaced asset or code path. The open collision gaps are removed. Recycled
generated QA/production bundles and consumed browser JSON; kept the requested
picture sheet for handoff.

## Claude review (26 October 2026)

Approved and merged: only new checks; replays and world signatures unchanged; test-circuits passes on integration. Live with the next release.
