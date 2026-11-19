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
   mirror-bright face. Measured the same evening by rays sent straight down in the running Dig: the Dig draws three
   grounds in one place, and over half of the filled cells and three of eight cut cells the coarse near ground or the yard
   floor stood above the edited ground, which is the only one drawn as spoil and fresh cut. With the other two hidden the
   heap is a dark mound and the ditch is a ditch. So the cure is in code and is the seventh bullet of slice 2.

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
- **Over made ground only the edited ground is seen.** Inside the square of every edited chunk the yard floor and the
  near ground lie at least 0.3 m below the edited ground, along a heap's sides and a ditch's walls too. Check, without a
  browser: a ray straight down over every cell changed by more than 0.08 m meets the edited ground first. Claude's part,
  merged with this note: a heap's flank and a shallow ditch's wall are drawn as earth, not as a scarp's bare rock
  (`src/world/scablands-ground-look.js`), and a chunk's skirt is lit as ground (`src/world/ground-view.js`).
- No new game event, so no new sound cue. Nothing saved.

Checks: `node tools/test-the-dig.mjs` and `tools/test-dig-yard-switches.mjs` extended for each cure; the Dig scenario
takes one picture of each offered machine in its second view (for Claude to run). No scripted drive.

### Slice 2 merged (16 November 2026, night)

Built by Codex, reviewed and confirmed. All seven cures are in. Claude's pictures of the merged Dig: the opening view shows
the boom and the bucket; each machine's panel names it and its keys, and the left line no longer repeats them; the second
views look over the machines; the roller and the paver are not offered; the tip and the stalled dig each have their line;
spread earth on flat ground is drawn as earth. Still to do, Claude's:

- **A heap's foot and a ditch's ridges still have a pale ring.** Thirty minutes went on it without the cause. Ruled out by
  experiment in the running Dig: the other two ground layers (hidden, the ring stays), the made-ground branch of the
  land's drawing (the made value forced to zero, it stays), the rock-on-slope mix (switched off for made ground, it
  stays), and the sun (switched off, the ring stays bright while the heap's body goes dark, so the ring is colour and the
  body's paleness is light). It carries the plain's crack pattern. Next thing to try: draw the edited ground with a plain
  brown material and add the land's drawing back one part at a time.
- **The road roller and the paver have no models** (MACHINE-ROADS). When they have, that card removes the rule that hides them.

### The pale ring found and cured (19 November 2026, builder session)

The ring was the heap drawn as rock. `src/world/ground-view.js` read each corner's samples with x and z swapped, so a chunk's
spoil, darkening and soil lay at the heap's mirror across the chunk's diagonal, and the heap itself carried no made value. That
is why the earlier tests moved nothing: forcing `made` to zero or switching the rock off "for made ground" changed nothing on a
heap whose made value was already zero. Measured by rays and by painting the shader's terms on screen: the heap was the rock
share, the ring the rock's scree band, and the spoil a patch on flat ground beside it. `docs/changes/DIG-YARD-TOY.md` has the
numbers.

**Builder decided (Claude to review):** two smaller pale bands of the same kind are cured in the same change, because Kyle would
see both at once: the kerb round every dug square (edge normals leaned by the skirt) and the fleck at a ditch's end (cut and
ridge summed to nothing, now read from how much ground moved). Not touched, for a card of its own if Claude wants it: a dug
square is drawn in a warmer brown than the plain round it (the edited ground draws the dirt picture and the vertex colour; the
near ground draws the plain colour), so its straight edges still show.

### Before the switch goes on

The pale ring cured (19 November, Claude to look); one frame check on Performance in the Dig
yard with the laptop alone; Kyle's own try on the private address. Then Claude decides (rule 18).
