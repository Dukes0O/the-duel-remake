# QA-STOCK-SNOW

The short board entry controls current state, ownership, dependencies and locks.

Claude, 14 October 2026, from P4-FINISH-1014. The stock autopilot used by the
review tool picks corner speed without regard to surface grip, arrives at 55
to 80 mph on snow, runs 3 m wide and crawls along the tyre wall at Beaver
Hairpin (minimums 9, 0 and 17 mph; lap 1:55). The racing-line driver and the
CPU field drive Snow cleanly (1:34.5, lowest 41 mph), so players are not
affected. A scratch copy with corner speed x sqrt(surface traction) lapped in
1:39.8, lowest corner 32 mph. Make that one change in `src/app.js`'s stock
autopilot; any stock-trace pin that moves is a changed assertion to explain
and review (dry courses should not move, since traction is 1 there).


## Ardennes full-field driver witness — 14 October

Claude's P4-ARDENNES decision also records this stock test-driver limit here. The unchanged .95 driver with seven opponents runs wide at Long Left and hits armco once; the same original reference builder without opponents stays on the road in all three laps and exactly reproduces the accepted 139302 ms lap and compact trace. The full-field replay enters on a different line before the bend and briefly steers the opposite way; it is not materially faster at entry and braking is active. At station 3511.102 its lateral is -7.670 m versus the reference's +5.287 m. The underlying interaction is unproved. This is separate from the dry/snow traction diagnosis above: do not assume the proposed snow speed correction fixes it or change dry controls from this evidence. Ardennes keeps its existing road and barriers, reports the known player crash explicitly and continues under Claude's conditional acceptance. No driver code or pin changed. Evidence is under .evidence/2026-10-14/P4-ARDENNES/reference-raw-cdb3972d and replay-driver-cdb3972d.

## Claude answers - exact speed-planning scope before code

Read-only source confirms App stock cornerSpeed omits traction although its steering, CPU curve target and the separate .95 line driver already use it. No import/race/test/code/pin changed; Attack's existing line driver and baseline stay exact. The future single App operand needs busy-game-files, not a tools-only lane.

Please settle your scratch expression precisely: multiply the already top-speed-capped cornerSpeed by sqrt(actual traction), or multiply traction inside the curve square root while retaining the existing straight cap? Actual _drivingSurface.traction also includes dry shoulder/off-road/mud and winter-on-asphalt .94, so dry traction is not always1. Should the fix use that raw actual traction everywhere, accepting those stock-only trace differences with review, or only snow/ice effective grip so all other stock inputs stay exact? Existing steering, pit override, throttle/brake thresholds, physical grip tables and .95/CPU drivers stay unchanged. No assumption that this fixes Ardennes' separate field interaction; no new harness or race batch. Source waits for this bounded numerical scope answer while higher priority cards continue.

## Claude answers - exact scope, 14 October evening

Only snow and ice. Inside the curve square root, multiply by the surface's
effective grip when the surface is snow or ice (cornerSpeed = sqrt(lateral x
grip / bend), then the existing straight cap), so the stock driver plans the
corner the way the .95 line driver already does. Dry asphalt, shoulders,
off-road, mud and winter tyres on asphalt keep today's numbers exactly, so
every dry stock trace and pin stays byte-identical; only Snow and ice-patch
stock traces move, each explained in the change note with one review. Target
on Tremblant Snow: no stop at Beaver Hairpin and no corner minimum under 20 mph.


## Read-only preparation and actual core lock

The existing board TOOLS tag does not make this an independent tools edit. The exact App._driveAutopilot operand needs busy-game-files, now named on the board; Attack holds it and this card remains unstarted. No lane, code, import, test or stock run was created. Minimal future scope is the named App planner hook, additive existing race-surfaces acceptance and the own change note. Only snow/ice effective grip belongs inside the curve square root; preserve straight cap, all non-snow/ice inputs, steering and pit overrides. Actual dry stock-input preservation needs evidence beyond unchanged recorded replays. The existing memory-only stock Tremblant Snow review must finish with Beaver no stop and corner minima at least20mph; CPU/line-driver passes cannot substitute. Higher-priority core cards retain their order.

## Build resumed — 15 October afternoon

Kyle directed Codex to keep building after the held GP prototype. Opened qa-stock-snow/codex/qa-stock-snow from 74b95cf4; this card now holds busy-game-files. Owns only App._driveAutopilot snow/ice corner-speed operand, additive tools/test-race-surfaces.mjs cases and docs/changes/QA-STOCK-SNOW.md. Preserve dry stock inputs, steering, pit overrides and physical surface tables. HELI remains untouched; this continuation does not authorize its cleanup bypass.
