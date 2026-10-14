# HELI-SAVE

The heli save field, fuel purchase with credits, repairs that never take a save below zero.

Owner: Claude (SAVE). Design: `docs/HELICOPTER.md` (the packet, Kyle's storyboard
decisions of 14 October 2026). The board entry holds state, needs and locks.

Section 9 of the packet. Files: `src/heli/heli-save.js`, one line in
`src/progression.js` `normalizeProfile`, fixture
`tools/fixtures/saves/10-heli.json`, `tools/test-heli-save.mjs`. Holds
`save-shape`; the save checker runs (saves rule).

## Claude answers (design settled 14 October 2026)

- One new file, `src/heli/heli-save.js`. It only holds rules: nothing in it draws,
  reads the clock or rolls dice. Dates are passed in.
- `normalizeProfile` gets one line beside the Deep line. A save that has no
  `heli` field gets none: nothing is guessed. Saved helicopter data loads and
  stays whether the `helicopter` switch is on or off.
- Every helper takes a profile and returns a new one, and never changes the one
  it was given. Each also takes `{enabled}`. With the switch off it refuses with
  "The helicopter is not available yet." and hands the profile back unchanged.
- Fuel is counted in tenths of a kilogram. The tank holds 400 kg and a kilogram
  costs 1.5 credits, rounded up to a whole credit.
- The first tank is free (the refuel count is 0). After that the pump charges
  for what it pours. If the wallet is short, it pours only what the credits pay
  for. A full tank refuses with "The tank is full."
- Repairs take what the player has and forgive the rest, so credits never drop
  below zero. Prices: hard landing 150, crash 800, cargo light 150, heavy 400,
  wreck 900, and a car released above 1 m costs 100 per metre of drop.
- The fuel truck after an out-of-fuel landing fills the tank to 400 kg and
  charges 300 plus the fuel, by the same rule: it takes what the player has and
  forgives the rest, so nobody is stranded. It is not a pump purchase, so it
  does not add to the refuel count (missions use it later, in H2).
- Play days count once per date. Lessons, where each special car was set down,
  and flights are small records with the same safe handling.
- A new fixture, `10-heli.json`, joins the reviewed save-shape roster. The three
  suites that count the roster rise from nine to ten; no other assertion changes.
