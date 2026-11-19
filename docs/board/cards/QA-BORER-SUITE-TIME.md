# QA-BORER-SUITE-TIME

Found by Claude at the merge of MACHINE-BORER-APPRENTICE, 16 November 2026.

`tools/test-machine-borer.mjs` took 371 seconds and `tools/test-machine-borer-apprentice.mjs` 140 seconds, each alone on the
laptop. The first took 89 seconds before the spoil heap replaced the narrow bank: her scripted bores through the real mesa now
fill many more ground cells a step. Any lane that touches her files pays eight minutes for the two.

## What done looks like

- Each suite under 120 seconds alone, with every check kept: the same bores at a larger time step where the rules are exact
  from the step function, one shared bored mesa for the checks that only read the result, or a smaller hill for the checks
  that do not need 300 m.
- No assertion is loosened or removed. List what was changed and why each check still proves what it proved.

## Checks

Both suites, timed alone; `tools/test-machine-borer-freeze.mjs`; `tools/test-tunnels.mjs`.

## Where it stands (Claude, 19 November 2026)

A first pass is merged, tests only: `test-machine-borer` 409 s to 224 s and `test-machine-borer-apprentice` about 213 s
to 175 s on a shared laptop, with no assertion removed or loosened (land answers remembered by place, the trench bore
resumed from the climb run, the pace check in two calls, the four mesa bores first; the four bores end in identical
states before and after). The 120 s target is not met. The checks that need the real mesa cut about 1,030 m, and
cutting costs 0.15 to 0.22 s a metre: every 1/120 s step plans about 270 spoil cells and asks the land about each. What
is left is in the game's code, not the tests: make the step cheaper in `src/machines/borer.js` (spoil planning) and
`borerLandRefusal`, with the borer's fingerprints unchanged. That is this card now, and it is Claude's to slice.
