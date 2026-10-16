---
task: JANITOR-LOOKS
status: done
player_facing: no
---

# JANITOR-LOOKS: superseded look sheets of completed cards

Claude, 15 October 2026. Card `docs/board/cards/JANITOR-LOOKS.md`.

`docs/board/looks/` had reached its 20 MB size (19,998,763 bytes), so no card
could add a look sheet. Deleted the earlier-round sheets of completed cards;
each family keeps its final sheet and every review note, which records each
round's verdict (checked: every deleted sheet has its round's note).

## Removed (28 sheets, 5,054,758 bytes)

- `arena-pit`: round-1.jpg (308,498 bytes)
- `blackiron`: round-1.jpg (259,298 bytes)
- `convoy-tanker`: round-1.jpg, round-2.jpg (927,350 bytes)
- `crew-p2`: round-1.jpg, round-2.jpg, round-3.jpg, round-4.jpg, round-5.jpg, round-6.jpg, round-7.jpg, round-8.jpg, round-9.jpg (790,333 bytes)
- `crew`: round-4.jpg, round-5.jpg, round-7.jpg, round-8.jpg, round-9.jpg (324,959 bytes)
- `first-person-p1`: round-1.jpg, round-2.jpg (507,374 bytes)
- `first-person-p2`: round-1.jpg (256,032 bytes)
- `p4-harbour`: round-2.jpg (426,148 bytes)
- `p4-tremblant`: round-2.jpg (294,735 bytes)
- `rustwall`: round-7.jpg, round-8.jpg, round-9.jpg (622,186 bytes)
- `sal`: round-1.jpg, round-2.jpg (337,845 bytes)

Kept untouched: `ardennes`, `p4-summit` (work still open there), `kits`
(referenced by the backlog card GFX-03-P1), `gunn` (its review is still
pending), and every family with a single sheet. Tests that name a deleted
sheet only plan its path or check whether it exists
(`test-rook-p2-review`, `test-first-person-cloth`, `test-first-person-polish`);
two older change notes (`P4-HARBOUR-FINISH-2`, `P4-TREMBLANT-FINISH-2`) name
their round-2 sheets, which stay in Git history.

## Checks

Lane tier 16/16 and build on bae713c1; test-review-evidence, test-repo-hygiene,
test-rook-p2-review, test-first-person-cloth and test-first-person-polish pass.
