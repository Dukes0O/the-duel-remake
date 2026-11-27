# MAP-NO-WAY-WRAP

The short board entry controls current state, ownership, dependencies and locks.

**Found in Claude's drive of the merged batch, 27 November 2026** (`docs/board/looks/drive-2026-11-27.md`).

**What a player meets.** On the big map (M) in the open Scablands, the panel "Ways to the marked place" shows
"No way is known." as four lines of one word each, in a narrow strip at the left of a wide box.

**Measured.** The `li.world-hud-way` holding only that text is 351 px wide and 79 px high. Its rule in
`src/world/world-hud.css` line 51 is `display: grid; grid-template-columns: 24px minmax(0, 1fr)`, made for a row with
a numbered badge (`b`) in the first column. A row with bare text puts the text in the 24 px column.

**Likely fix.** Give the no-way row its own class (or a rule for a row without the badge) so its text spans both
columns. Check: a look at the map with no way known and with two ways known.

## Claude answers

27 November 2026: fixed in code (the empty row gets `world-hud-way-none`, which spans the box). The look it asks for is
owed on the next drive, with the map open and no way known; close the card then.
