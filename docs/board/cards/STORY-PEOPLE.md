# STORY-PEOPLE

Kyle, 18 November 2026: the people are "pretty awkward", and with talk bubbles over their heads the people themselves
are what a player looks at. "Codex can be tasked with refining the people and the mechanics of the people." Codex's
card. Claude judges the pictures, as art rounds are judged. It replaces STORY-FACES: with bubbles in the world, drawn
faces in a panel are not needed.

## What to build

**People who can be talked to,** for Night 2 first: Rell, Dace, Wim, eight more Walkers, Auntie Solder, Cinder and
Clinker.

1. **They stand like people.** Weight on the feet, arms that hang and move, a head that turns. No peg figures. Use and
   improve the rigged figure the game has (search `tools/` and `src/` for the rigged fighter and the on-foot figures)
   before making anything new.
2. **They attend.** A person being spoken to turns to face the player within a second and keeps facing as the player
   moves. The speaker moves a little while a line is up: a nod, a hand, a shift of weight. The others look at whoever
   is speaking.
3. **They can be told apart at twenty metres:** by height (Wim is a child of six, Dace a thin fourteen, Rell broad and
   upright), by outline (a coat, a headscarf, a pack) and by one colour each. Gritty, never toy-like.
4. **They do things:** stand in a group without standing in a row, sit by a fire, walk a path together at different
   paces, push a handcart, sleep against a fence, run (Dace). Each is one named action a job can ask for.
5. **They are solid** to a car and to a walker, and a car that reaches a person on foot stops short or is steered
   round: nobody is driven through (Kyle's finding 9), and nobody is run down.
6. **A place for the bubble:** each person gives the point over the head where a talk bubble is fixed.
7. Twelve people standing at the gate cost no more than 1 ms a frame on Performance.

## Checks

- A suite for the figures' rules: facing within a second; the named actions start and end; a car and a walker are
  stopped by a person; the bubble's point follows the head.
- Every older suite that names the on-foot figures or the rigged fighter.
- For Claude to run and judge: browser scenario `story-people`: the eleven Walkers at the gate at dusk from the
  player's eyes, Rell speaking, Dace running, Wim beside Auntie Solder, and one sheet comparing today's figures with
  the new ones. Rounds continue while each makes them better (AGENTS.md, the stop rule).
