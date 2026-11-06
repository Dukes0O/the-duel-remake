# RAIL-STEPS

## Changed

- Sand drag now resets the attempt without permanently blocking completion.
- Stop marks record signed distance when the stopped train is within 40 m before the mark or beyond it. A stop 60 m past the path end is clamped to a stop. Ride-along trains preserve the player's signed stop distance, including overruns.
- Token swaps now use held interact at rest. Throttle stops at the loop until the swap; the warning plays once, and the step cannot finish before the swap.
- Dig progress comes only from delivered `haulTonnes`. Dig cues fire at their configured fractions, the engine reveal fires at two-thirds, and the pile view receives `{type:'pile', id, fraction}` each tick. Bo learns at half; the player completes all six 20 tonne loads, and the handover fires with completion.
- Easy braking, over-speed and continuous-brake cues, `brakeBoardMetres`, runaway proximity and progress cues, and `arrivesWith: 'player'` now affect the simulation. The other train is capped at twice its listed speed.
- Drivetrain logic has named helpers for brake force and stop targeting, and its multi-action statements were split for review. A regression check confirms a job with no rail fields keeps its prior state and throttle result.
- `waitsForWork` belongs to RAIL-JOBS-2. `requiresExit` is handled by the existing on-foot step. Neither field needed a change in this card.
- No save format or released-course replay code changed. Race fingerprints are unchanged.

## Checks

- `node tools/test-rail-steps.mjs` — passed. Bank stops remain 191.5 m at 9 m/s; 15 m/s reaches the 500.3 m sand drag. Regression checks cover all listed rail-step faults and legacy drivetrain behavior.
- `node tools/test-iron-line.mjs` — passed.
- `node tools/test-world-job-mode.mjs` — passed.
- `node tools/test-world-jobs.mjs` — passed.
- `node tools/test-heli-jobs.mjs` — passed, 5,802 checks.
- `node tools/test-repo-hygiene.mjs` — passed.
- `npm run build` — passed. Vite reported the existing dynamic-import and large-chunk warnings.
- Browser checks were not run in this lane. Claude should review stop marks, token interaction, the dig pile/reveal/handover, runaway cues, and the passing train in the browser.

## Changed assertions

- Replaced the old token `hasToken` assertion with no-token throttle blocking, one-time warning, held-interact swap, and completion-after-swap checks. The story says each driver carries a token; the swap is an exchange.
- Replaced interact-based digging and automatic apprentice completion checks with six delivered-load checks, fraction cue checks, and a handover-at-completion check. This follows the machine-game flow and the story's six loads.
- Added short-stop, distant-short-stop and 60 m overrun assertions. The mark scores signed distance and never fails a valid stop.
- Added copied-stop overrun and short-stop assertions, plus Easy brake, brake cue, brake-board, runaway cue and `arrivesWith` checks.
- The unchanged legacy drivetrain assertion still passes; no tolerance or replay assertion was loosened.

## Removed

- Removed button-driven digging behavior and the assumption that a player token flag gates movement. Nothing else was removed.
