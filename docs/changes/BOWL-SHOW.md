# BOWL-SHOW

Status: complete in the lane; browser review remains with Claude.

## Design

Added a headless Bowl show rules module. It scores completed jump, car-launch,
crush, donut and landed-flip events; car launches score more than equal ramp
jumps. The crowd rises after stunts and decays during quiet time. Five nights
each contain three ordered events; Last Truck Rolling replaces Side by Side
starting on night three. Losing keeps the player on the current event for a
retry. Scoring only reads event data and does not change physics or saves.

## Checks

- `node tools/test-bowl-show.mjs` — passed, 15 behavior checks.
- Same scripted events scored 214 at 30, 60 and 144 frames; final crowd meter
  was 0.8625041211891997.
- `npm.cmd run build` — passed. Vite reported the existing dynamic import and
  large chunk warnings. `npm run build` could not start because PowerShell
  blocked `npm.ps1` under its execution policy; the equivalent `npm.cmd` build
  completed successfully.
- Browser and look checks — Claude runs; please inspect that event scoring,
  crowd rise/decay, five-night order, and retry behavior fit the show in play.
- Changed assertions: none. Race fingerprints: not applicable; this card adds
  an unhooked pure rules module and does not alter race behavior.

## Removed

Nothing replaced or removed.
