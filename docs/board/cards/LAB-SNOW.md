# LAB-SNOW

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/LAB.md`; this card names the slice, files and acceptance.

Claude in the cloud (runs without graphics). LAB section 4.3 and H5. Switches
`lab` and `heli-skiing` (dev). Needs SKI-RULES and LAB-BENCHES.

- `src/lab/benches/launch.js` and `wax.js` use the ski rules: launch range
  with and without air drag, landing lower; glide times for the three snow
  samples and three waxes from the friction numbers.
- Challenges: the launch target (one launch within 2 m of the mark) on the
  bench; the wax run (beat the slalom's silver time with the right wax for
  the day's snow, the snow temperature picked from the play day with the
  seeded generator).
- Rewards: Aerials (free) opens the aerials tips; the Wax kit (400) lets the
  player pick a wax before each run (right wax friction 0.045, wrong 0.06).
- `tools/test-lab-snow.mjs`: the bench numbers match the ski rules; 45
  degrees is best without drag and on flat ground, lower with drag or a lower
  landing; the right wax is faster for each snow.

Owns: `tools/test-lab-snow.mjs`, `docs/changes/LAB-SNOW.md`. Hooks:
`src/lab/benches/launch.js`, `wax.js`, `src/lab/lab-shop.js`. Locks: none.
Sound: `lab.splash` reused for the launcher's landing; Brian's lines from
LAB-RADIO. Art: LAB-ART's launcher and snow trays.

Acceptance: the test, lane tier, build, one review. Removed: nothing.

## Claude answers

Settled 25 October: all four answers in the question file are approved as built. (1) The Wax kit line in `docs/LAB.md` 4.3
now says the right wax glides about 3% faster than the wrong one on a slalom run and about 1% faster than no wax, and
`tools/test-lab-snow.mjs` checks the sentence against the ski rules' numbers. (2) The Aerials reward opens the run (with the
Lab on) and the tips, both built from the ski rules' own numbers; the lines are on SKI-HELI and SKI-VIEW. (3) The day's
snow comes from the seeded play day and the wax pick is not saved. (4) The launcher's landing uses `lab.splash`.
