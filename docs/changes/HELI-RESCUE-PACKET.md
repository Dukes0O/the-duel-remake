# HELI-RESCUE-PACKET

Claude, 14 October 2026, at Kyle's request. The design packet for the
helicopter's rescue sprint, H4 Rescue (Cockpit T-037), and its board cards.
Design only: no game code.

## What changed

- New `docs/HELI_RESCUE.md`: four rescue kinds join H2's mission engine
  (lost hiker, avalanche beacon search, hoist rescue, supply run) with
  dispatch seasons weighting which kind comes (summer is wildfire season),
  calls that go to another crew when left too long, and a clock once
  answered. A rescue line reuses H1's 15 m cable with a rescuer on it (the
  winch stays for the medevac skin). Sites on H1's three destinations, the
  beacon's beeps, the hiker's flare, the hold beside a steep slope, crates
  for the lodge, a car recovery job after a hoist rescue, pay and the rescue
  badge, 24 lines, 5 cues, save fields, files, locks, tests and two art
  cards.
- At the main design session's request: the supply run goes up Summit Run
  (cut off by P4-AVALANCHE), which becomes a helicopter destination with
  its switch; a gear table names what H3's skins add (winch, stretcher,
  searchlight, heat camera); the people and props are Claude Blender
  cards; every build card needs FIRE-MISSIONS.
- Ten cards in `docs/board/cards/RESCUE-*.md` and their board entries. Each
  build card waits for FIRE-MISSIONS and the H2 card that last edits its
  files; RESCUE-PEOPLE and RESCUE-PROPS can start now.
- `docs/HELI_FIRE.md`: points at the rescue engine, and a leftover `smoke`
  kind removed from its save fields.
- `docs/HELICOPTER.md` section 12 and `docs/README.md`: one pointer each.
- Two questions for Kyle in the packet's section 15 (seasons; nobody gets
  hurt), each with a recommendation.

## Checks

- `node tools/run-tests.mjs --tier lane --changed --jobs 4` and
  `npm run build` in the lane before merging (results in the merge's
  run-log line).
- No test assertion changed. Race replays and world signatures untouched.

## Removed

Nothing: new design only.

## Kyle's answers, 15 October

- Seasons decide which emergency comes; no forest fire in winter. New card
  FIRE-SEASONS puts the season clock in the engine before H2 releases.
- People can get hurt and failure has a cost: a casualty's condition
  (unhurt, hurt, badly hurt) sets the pay; a failed rescue pays nothing,
  costs 400 credits and drops that skin's tally by one. New card
  RESCUE-HURT changes the merged rescue line and lines; RESCUE-ENGINE and
  RESCUE-SAVE carry the rest.
