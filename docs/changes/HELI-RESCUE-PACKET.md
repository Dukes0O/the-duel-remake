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
  badge, 24 lines, 5 cues, save fields, files, locks, tests and two Codex
  art cards.
- Ten cards in `docs/board/cards/RESCUE-*.md` and their board entries. Each
  Claude build card waits for the H2 card that last edits its files;
  RESCUE-SITES, RESCUE-ART-PEOPLE and RESCUE-ART-KIT can start now.
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
