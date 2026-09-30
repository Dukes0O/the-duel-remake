---
task: ARENA-RAMP-SIDE
status: review
kind: physics
flag: scrapdome
player_facing: yes
---

# Scrapdome ramp sides no longer launch cars into the sky (30 September 2026)

Kyle: driving up the side of a Scrapdome jump sends the car 600 to 2,200 m
into the air.

## Cause

`course.groundAt` gives an arena ramp its full height out to 15 m either side
of the centre line, then drops straight to the floor (the drawn dirt walls sit
at the same 15 m). Crossing that edge at an angle raised the ground by up to
2.4 m in one 1/120 s step, which `_jump` read as a vertical ground speed of
about 290 m/s and launched the car with it. A review sweep of 384 angled
approaches (two cars, twelve headings, four side offsets, four points along
the ramp) launched 81 above 10 m, the worst to 1,152 m.

## Change

`src/sim-driving.js` `_jump`: in an arena the vertical speed taken from the
ground is limited to the car's actual travel speed times the steepest
authored ramp slope (pi times height over length, 0.22 for the Scrapdome, plus
10%). A straight run up a ramp never reaches that limit, so jumps are exactly
as before; mounting a side becomes a bump.

## Tests

- `tools/test-arena-ramp-side.mjs` (new, written first): the twelve worst
  approaches per car stay below 4 m of air (failed before at 235.7 m), and nine
  straight jumps (three cars, 45, 70 and 100 mph) keep their recorded height
  and length exactly. 42 checks.
- Review sweep after the change: 0 of 384 approaches above 10 m; highest 3.6 m
  (a normal jump is 2.1 to 3.2 m).
- Lane tier and build: see below.

## Changed assertions

None.

## Removed

Nothing.
