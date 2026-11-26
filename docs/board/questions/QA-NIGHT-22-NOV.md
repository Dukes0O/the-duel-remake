# Question on QA-NIGHT-22-NOV: Mabel's second view while she cuts

**What needs deciding.** Since 16 November the second view (C) of every machine is the cab view. For Mabel the cab view put the
camera above her model, inside the rock whenever she was cutting, so a player who pressed C saw a flat colour (found by the
18 November helper, QA-NIGHT-18-NOV). The old mouth view in `updateBorerCamera` could no longer be reached. The
`machine-borer` scenario still asks for the mouth view at 20 m and at 45 m.

**Options.**
1. The game: while Mabel has cut a tunnel (`started` and a first segment), the second view is the mouth view; before she cuts it
   stays the cab view. The scenario proves this as written.
2. Rule that the second view is always the cab view and rewrite the two mouth pictures. A player would still see rock.

**My pick: option 1** (one condition in `src/machines/dig-game.js`, one assertion in `tools/test-machine-borer.mjs`).
It restores what the docs say ("Press C to change between the following and mouth views") and leaves the cab view where it is
seen from the yard. Claude to confirm or reverse; the whole Dig is behind the `the-dig` switch.
