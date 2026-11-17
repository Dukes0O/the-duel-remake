# DIG-YARD-TOY

From the audit of 9 November 2026 (`docs/board/audit-2026-11-09.md`, item W3). Kyle said yes
to this card on 9 November.

The Dig (an excavator, a truck and a trencher to operate beside the Scrapdome) is built and
is the one new Wasteland piece that has been played in a browser. Players cannot reach it,
because its yard button shows only with the whole town (`wasteland-town`, off). Gratian loves
the Wasteland; this gives him something new there this week.

## Settled design (Claude)

- **Its own switch:** `the-dig` in `src/feature-flags.js`. In `src/screen-yard-home.js` the
  THE DIG button shows on `the-dig` alone; THE TOWN stays behind `wasteland-town`.
- **A toy, not a job:** no pay, no goal, nothing saved. If the Dig writes anything to a
  player's save today, stop and name it in the change note before switching on (a save review
  then applies).
- **One line in the yard's "Things to try"** (`src/yard-things-to-try.js`) that says the
  machines are there and which keys start them.
- **Before it is switched on:** the machine models no longer show the atlas's empty white
  cells in the game; every machine sound cue plays (`src/sound-bank.js`); Escape returns to
  the yard; the opening view shows the controls.
- While in `src/feature-flags.js`: `wasteland-town` and `nissan-skyline` are each listed
  twice. Keep the value the game uses now (the later one) and remove the other line.
- **Sound:** no new game event; the cues already exist.

## Who does what

Codex builds and runs the checks. Claude then plays the Dig from the yard and back in a
visible browser with sound, and decides the release (rule 18).

## Checks

- `node tools/test-the-dig.mjs`.
- New test: with `the-dig` on and `wasteland-town` off, the yard shows THE DIG and not THE
  TOWN; with both off, neither.
- Laptop only: `tools/scenarios/the-dig.mjs` with memory-only storage; Claude's play pass;
  one frame check on Performance in the Dig yard (rule 8), since a player can now reach it.

## Removed

The duplicate switch lines. Nothing else: the town keeps its own button and switch.

## Slice 1 merged, and Claude's play (16 November 2026, evening)

Slice 1 is merged with the switch off: `the-dig` is `dev`, the yard shows THE DIG on that switch alone, nothing is saved, the
machine sounds play under the new switch, and Escape returns to the yard with no key left held. Built and reviewed twice by
Codex; the Dig's browser check and the four machine checks pass on the merged code, with the saved profile unchanged.

Claude then played it in a visible window with real keys: the yard, the excavator (dig, a miss, a load), the truck (drive,
tip), the trencher (a ditch), each other machine chosen in turn, and Escape. **It works, and it is not yet worth Kyle's
try.** Nobody has heard it: the play window is muted. What a player meets:

1. **The panel on the right teaches the wrong keys.** With the dump truck or the trencher chosen it still lists the
   excavator's four levers and "A and D swing". The line on the left is right; the two disagree.
2. **The road roller and the paver are plain boxes**, a yellow one and a green one with a grey disc. They are MACHINE-ROADS
   art that Claude has not drawn yet. A toy cannot show them.
3. **The trencher's second view sits inside its engine cover**: the screen fills with a green slab.
4. **Two moments say nothing.** After the truck tips, the line still reads "Press Tab, then hold Space to tip the load."
   With the boom swung toward the truck and the bucket down, the line reads "The bucket is on the ground. Hold Space to
   dig." and holding Space digs nothing, with no reason given.
5. **The opening view hides the work.** The camera stands straight behind the excavator, so the boom and bucket are hidden
   by the cab while the first bucket is dug.
6. **The Dig is the last of five rows in "Things to try"**, below three rows a new player cannot open yet, in a box that
   shows two rows at a time.
7. **Dug ground reads as paper**: pale patches with hard straight edges, and the heap is a sharp pyramid with one
   mirror-bright face. (Claude's, a drawing job; not in slice 2.)

### Slice 2, the cures (settled, Codex builds)

- **The right panel names the chosen machine and its own keys**, for every machine, in the same words as the left line.
  One home for each machine's key words, read by both. The excavator's panel is headed EXCAVATOR CONTROLS.
- **With `the-dig` on and `wasteland-town` off, the road roller and the paver are not offered**: Q passes over them, they
  are not drawn in the yard, and the "Things to try" line does not name them. With `wasteland-town` on they are there as
  today (the town is where they are built and checked). The dozer stays. This ends when MACHINE-ROADS has their models;
  that card removes the rule.
- **Each machine's second view (C) looks over the machine, not through it**: the eye is above and ahead of every part of
  the machine's own body. A rule check: from each machine's cab eye, a ray straight ahead meets none of that machine's
  own parts within 3 m.
- **The line says what happened.** After a tip: "The load is tipped. Fill the truck again." When Space is held and
  nothing can be dug, find the cause first by stepping the rules, then say it in a whole sentence that tells the player
  what to do (for hard ground: "This ground is too hard to dig. Swing back to the dirt.").
- **The excavator's first view stands behind and 35 degrees to one side**, so that the boom, the bucket and the ground
  under it are in the picture when the bucket is lowered ahead. The other machines keep their first view.
- **"Things to try" lists open rows first**, and THE DIG first among them.
- No new game event, so no new sound cue. Nothing saved.

Checks: `node tools/test-the-dig.mjs` and `tools/test-dig-yard-switches.mjs` extended for each cure; the Dig scenario
takes one picture of each offered machine in its second view (for Claude to run). No scripted drive.

### Before the switch goes on

Slice 2 merged; Claude draws the dug ground (finding 7) and plays the Dig again; one frame check on Performance in the Dig
yard with the laptop alone; Kyle's own try on the private address. Then Claude decides (rule 18).
