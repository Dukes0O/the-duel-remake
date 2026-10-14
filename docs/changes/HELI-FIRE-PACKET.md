# HELI-FIRE-PACKET

Claude, 14 October 2026. The design packet for the helicopter's second
sprint, H2 Fire, and its board cards. Design only: no game code.

## What changed

- New `docs/HELI_FIRE.md`: the mission engine (secret 3 to 6 refuels, the
  radio call mid-flight, kinds never repeating, answer now or later), the
  forest fire (20 m cells, spread faster uphill and downwind, wind per play
  day, out and lost, tuning targets), the 600 L bucket (fitting, scooping
  limits, weight, damage), drops (falling water parcels, the 12 m helping
  ring that the Lab later shrinks), rewards (1,500 credits and the
  firefighter badge; 400 for a smoke check), the burnt course (closed 10 play
  days, buyback 10,000 dropping 1,000 a play day, menu, races and career,
  regrowth stages, scars), voices (Sarah, Roger), sound cues, save fields,
  files, locks, hooks, tests and three Codex art cards.
- Twelve cards in `docs/board/cards/FIRE-*.md` and their board entries.
  Claude's build cards wait for HELI-FINISH; FIRE-ART-BUCKET, FIRE-ART-FX
  and FIRE-ART-BURNT can start now.
- `docs/HELICOPTER.md` section 12: one line pointing at the new packet.
- Two short questions for Kyle in the packet's section 17 (the smoke check,
  and Tremblant Woods as the only burnable course in H2), each with a
  recommendation.

## Checks

- `node tools/run-tests.mjs --tier lane --changed --jobs 4` and
  `npm run build` in the lane before merging (results in the merge's
  run-log line).
- No test assertion changed. Race replays and world signatures untouched.

## Removed

Nothing: new design only.
