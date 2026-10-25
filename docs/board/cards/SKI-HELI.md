# SKI-HELI

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/HELI_SKIING.md`; this card names the slice, files and acceptance.

Claude in the cloud (runs without graphics; the helicopter is Claude's
line). H5 sections 3 and 6. Switches `helicopter` and `heli-skiing`. Needs
SKI-RUNS and SKI-SAVE.

- **Pads:** the two drop pads and the pickup in the Summit Run world; the
  flying area grows to hold them and its ceiling rises above the summit
  while a ski drop or group job is in hand.
- **Drop and pickup:** landed on a drop pad, the session offers the runs
  from that pad; stepping out starts the ski zone and sends the helicopter
  on autopilot to the pickup (no fuel charged for that hop). Stopping in the
  pickup circle ends the run; climbing in returns to the Summit world, on the
  ground at the pickup. A restart from the drop is free.
- **The group job:** on some play days (the seeded generator, one day in
  three), the board offers "Heli-ski group at Summit Run": the guide and four
  guests (95 kg each) board at the home pad; pay 1,200, Real a quarter more,
  on returning them home; the group skis with you as figures.
- **Thin air:** the weights and the existing thrust rule do the rest; the
  instructor's thin-air line plays the first time the collective is at its
  top and the helicopter still sinks above 3,500 m.
- `tools/test-ski-heli.mjs`: with the group and a full tank Kestrel One
  cannot hover at the summit pad; with half a tank it can; with the Lab's
  altitude tune and a full tank it can; solo with a full tank it can; drop,
  run and pickup in order; the job pays once on return; switch off leaves
  every helicopter suite unchanged.

Owns: `src/ski/ski-session.js`, `tools/test-ski-heli.mjs`,
`docs/changes/SKI-HELI.md`. Hooks: `src/heli/heli-session.js`,
`src/heli/heli-jobs.js`, `src/heli/heli-board.js`. Locks: none (Claude's
helicopter files; check no other card holds them).
Sound: `ski.step-out`; Roger's and Brian's lines (SKI-AUDIO). Art: none.

Acceptance: the test, every existing helicopter suite unchanged, lane tier,
build, one review. Removed: nothing.

## Carried from LAB-SNOW (Claude, 25 October)

- Offer the Aerials run only when `aerialsOpen(profile, flags)` (`src/lab/lab-shop.js`) is true: with the Lab off it is always true.
- With the Wax kit, let the player pick hard, medium or soft before each run (not saved) and start the skier with `createSkier({wax: skiWaxFor(profile, flags, day, pick)})`, `day` being the play day; with no kit or no pick it is `null`, today's plain snow. The day's snow is `snowOfDay(day)` (`src/lab/benches/wax.js`).
- The wax run (`docs/LAB.md` 4.3): on a finished slalom run call `waxRunResult({day, pick, time})` (time with the missed-gate penalty); `pass` is true for the right wax and a time inside the silver time. Pass the Lab lesson with `passLesson(profile, 'wax', {flags})`. Launch angles is passed on the Lab bench.
