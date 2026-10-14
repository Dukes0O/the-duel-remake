# HELI-WILDLIFE-PACKET

Claude, 14 October 2026, for the main design session. The design packet for
the helicopter's wildlife and skins sprint, H3 (Cockpit T-036), and its
board cards. Design only: no game code.

## What changed

- New `docs/HELI_WILDLIFE.md`: local animals beside every road (species per
  course, one sighting every 30 to 60 seconds at racing pace, the rare one
  about one race in five, off the racing line, drawing only, seeded apart
  from the race); the wildlife count on the dispatch board (an 800 m
  square, counting, scaring, coverage and the estimate, 200 to 600 credits);
  seven paints, each skin's gear and what it does (gathering the numbers H2
  and H4 left), earning at five missions or buying sooner, dirt of four
  kinds and the 100-credit wash; 9 lines, cues, save fields, two switches,
  locks, tests and art.
- Thirteen cards in `docs/board/cards/WILD-*.md` and `SKIN-*.md` with their
  board entries. WILD-PLACE, SKIN-ART-PAINT and SKIN-ART-GEAR can start now,
  beside Codex's WILD-ART-SRC; the rest follow the H4 card that last edits
  the same files. The animals in races can release on their own switch.
- `docs/board/cards/WILD-ART-SRC.md`, `docs/HELICOPTER.md` section 12 and
  `docs/README.md`: one pointer each.
- Two questions for Kyle in the packet's section 15 (gear only with its
  skin worn; the TV skin bought until camera flights exist), each with a
  recommendation.

## Checks

- `node tools/run-tests.mjs --tier lane --changed --jobs 4` and
  `npm run build` in the lane before merging (results in the merge's
  run-log line).
- No test assertion changed. Race replays and world signatures untouched.

## Removed

Nothing: new design only.
