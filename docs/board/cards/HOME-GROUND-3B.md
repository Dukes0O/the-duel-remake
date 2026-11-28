# HOME-GROUND-3B

The short board entry controls current state, ownership, dependencies and locks.

Codex's card (Sol: rules and words), Home Ground's step 3, second half: the builders. Needs HOME-GROUND-3 merged. Design:
`docs/HOME_GROUND.md` sections 4 (builders on the real clock) and 5 ("do it, teach it, hand it over"). Behind
`home-ground`; it changes the save, so it keeps the lane tier and one independent review of the save (rule 23, "Not
covered").

## Design, settled by Claude before code

**First, four fixes from Claude's drive of step 2** (`docs/board/looks/home-ground/drive-3.md`), in the same files:
1. A nest box (and any small piece's outline) is placed about 3 m ahead, and while the build outline is shown the
   first-person view tilts down about 15 degrees, so the piece sits in the middle of the view above the prompt line.
   The F reach for a box grows to match. Check by behaviour: the placed box is inside the camera's view, above the
   prompt.
2. The ground's HUD (the board's lines, the prompt, the burst bar and the weapon panel) is hidden while the big map
   is open.
3. Moss, and Rook and Wren when they talk, turn to face him for the talk and back afterwards.
4. Within the 6 m at which the board shows itself, the prompt says "Press F to read the board again." and F reads it.

**Who.** Two of Auntie Solder's Tin Town crew: Rook, a big quiet man who carries the sheets, and Wren, a girl of about
fifteen who does the hammering and all the talking. They are drawn with the open world's existing people figures.

**When.** Once he has raised a coop himself, the builders can raise the next coop; once he has raised a shed, the next
shed. Wren says so the first time he finishes one: "You've shown us how you like it done. Mark the next one, bring the
tin, and we'll put it up while you're away."

**How.** He marks the footprint and sets its load down beside it, as in HOME-GROUND-3. F at the board of news then
offers "Press F to hand the coop to the builders." Rook and Wren walk out from Tin Town and work at the site while he
is there; the building rises a stage at a time on the real clock and over the outing's own seconds: a coop in 30
minutes, a shed in 1 hour. Helping is faster: each stage he hammers himself is done at once. The board says what they
finished while he was away ("Rook and Wren finished your second coop."). Nothing is hurried with scrap.

**Limits.** One job at a time for the crew. A job they have begun waits, drawn at its stage, if he picks up nothing.
Nothing bad happens while the game is off.

**The save.** `world.open.home` version 4 adds `crew` (`{job, began, done}`); version 3 and older load unchanged.

**Sound cues** to name: `home.crew.arrive`, `home.crew.hammer`, `home.crew.done`.

## Checks

- `tools/test-home-ground.mjs` gains the crew's rules by behaviour: refused before he has raised one himself; a coop
  done in 30 minutes of real clock across a closed game; his own hammering finishes a stage at once; one job at a
  time; a version 3 save loads unchanged.
- The lane tier, the rule 23 guards and `npm run build`. One independent review of the save. Claude drives it by hand.

## Claude answers

## Assertions for Claude to review

Existing assertions now expect version 4, the nest box one cell farther ahead, and the newly added crew field.
The backward-clock assertion keeps the last counted moment so putting the clock right cannot count work twice.
First-tick timestamp assertions include the outing's current seconds so acquiring ground late cannot count earlier
play as builder time. No replay, world signature, count tolerance or player-progress assertion was loosened.

## Independent save review

A fresh Codex reviewer found three faults: the flatbed could reload stage-zero assigned tin, late acquisition used
the outing's start time, and offline coop completion missed eggs laid in the new nests. All three were fixed and
confirmed with memory-only reproductions. The reviewer found no remaining required save or clock issue.
