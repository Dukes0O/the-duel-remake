# SKI-RULES

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/HELI_SKIING.md`; this card names the slice, files and acceptance.

Claude in the cloud (runs without graphics). H5 section 4 and the scoring
of section 5. Switch `heli-skiing` (dev; add it to `src/feature-flags.js`
with the switch inventory tests gaining one row and Claude's written review
on this card). Can start now.

- `src/ski/ski-physics.js`: the skier at 120 Hz on a height function
  `ground(x, z)`: gravity along the slope, snow friction (0.05; 0.045 and
  0.06 for right and wrong wax), air drag with speed squared (0.6 m²
  standing, 0.25 m² tucked; air thinning with height as e^(-h / 8,500 m)),
  carving radius 17 m x cos(edge), edge up to 60 degrees, skid friction 0.4,
  skating below 15 km/h, leaving the ground when the ground falls away under
  the ballistic path, the pop, spins and flips in the air, the landing rule
  (slope within 20 degrees of the path, rotation finished within 30 degrees)
  and the tumble (3 s).
- `src/ski/ski-score.js`: timed runs with gates (a gate passed on its
  correct side; a miss adds 5 s); moguls (turns 60%, air 20%, speed 20%);
  aerials (air 20%, form 50%, landing 30%); medal times from the guide's run
  (gold at its time, silver +8%, bronze +18%) and fixed medal scores for
  judged runs (80, 65, 50).
- `src/ski/ski-guide.js`: the guide's run on a run's planned line at 92%
  of what the line allows, used for medal times and the ghost.
- `tools/test-ski-physics.mjs`: a straight fall-line run reaches the speed
  where drag balances gravity (within 2% of the formula); a tuck is faster;
  thinner air is faster; a carve at 60 degrees turns at 8.5 m; a skid slows;
  a jump off a lip follows the ballistic path; landings safe and tumbling as
  the rule says; the same inputs at 30, 60 and 144 FPS give the same run;
  scoring examples for each run kind.

Owns: `src/ski/ski-physics.js`, `ski-score.js`, `ski-guide.js`,
`tools/test-ski-physics.mjs`, `docs/changes/SKI-RULES.md`. Hooks:
`src/feature-flags.js`. Locks: none.
Sound: names the events the cues follow (`skiCarve`, `skiSkid`, `skiGate`,
`skiPop`, `skiLand`, `skiTumble`). Art: none.

Acceptance: the test, lane tier, build, one review. Removed: nothing.
