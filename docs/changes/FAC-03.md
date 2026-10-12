# FAC-03: night shift and morning report

Status: building. The selector slice alone does not install the night shift.

## Settled design, before code

Use existing tools serially: full tier jobs 4, one High and one Performance
frame sample on the released eight-car Harbour Lights night Grand Prix grid,
combat balance with explicit wasteland2 off/on, then all browser scenarios.
Frames require idle, awake, exclusive context; invalid or busy timing is refused.
Keep p95 at most 18.5 ms and construction below one second. Generic frame
recipe, default combat behavior and all old assertions remain exact.
Write docs/board/checks/night-<date>.json and a morning report under 20 lines.
Every failure names the first merge after the last green night, or states when
no green night exists. Kyle creates the scheduled task; no task is installed.

## Explicit heavy selection slice

Before code, Director c5a4d4ea grants run-tests and its test only to exclude
proven heavy suites from daytime lanes. Full/default/merge selection stays exact.
The five actual heavy suites are audio-crash-peak (native browser),
convoy-tanker-art and first-person-contact/cloth/polish (actual Blender builds).
Each has a direct native child launch in its existing source. No import-wide
exclusion: pure browser-harness and bounded combat-balance tests stay in lanes.
Smoke, replay and world-signature guards stay. No suite or assertion is removed.

## Checks and changed assertions

New acceptance checks must fail before the selector change: explicit heavy
suites deferred in a fully affected lane, every full suite retained, pure
browser/combat checks and all guards retained, actual CLI --list agrees.
Selector acceptance failed first, then the existing runner suite passed 176
checks. Real canonical --list selects 396 tasks, no five deferred heavy suites,
and retains pure browser/combat checks. Full still selects all 401 tasks.
No actual night/browser/balance/frame run is claimed; controlled child fixtures
will test the new command. Canonical lane jobs 4, build and one review pending.

## Removed

Only heavy-suite dispatch leaves daytime lane selection; its full coverage stays.
No game, save, original fixture or existing generic recipe is removed.
