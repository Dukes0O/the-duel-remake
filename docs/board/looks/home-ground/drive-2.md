# Home Ground step 2: Claude's drive by hand, 27 November 2026

Driven on integration `16e66ea66`, served from the integration folder on port 5191, a visible Chrome at full frame rate
with real keys, a temporary player with memory-only saves, switch `home-ground` on. The fence was closed by a page
script (76 panels and the gate), since step 1's drive had already built panels by hand.

**It works, all the way through.** With the fence closed, the board at the gate says Moss has left two hens in a crate.
At the crate Moss's three lines play, the crate opens and two brown hens step out onto the ground; he names them
(Pepper and Nutmeg) in a plain box. An old crate becomes a nest box with three seconds of holding B, and the hammer in
his first-person hands reads clearly. With the page's clock moved on one day and a new outing started, the board says
"You were away for 1 day. Your hens laid 13 eggs while you were gone.", the box offers "Press F to gather the 13 eggs
in this nest box.", and F moves all 13 into his store with a gold line across the screen. Every sentence is plain.

**What to fix in step 3 (on HOME-GROUND):**
1. The board's four lines stay on screen everywhere on his ground and from above. They cover the "You gathered 13
   eggs" line, hide the top of the ground in the overhead view, and still say "Your store has no eggs in it yet" after
   he has gathered. Show them only near the board, and rewrite them when the numbers change.
2. A nest box is placed at his feet, so it sits under the HUD's car and weapon panels and he cannot see what he is
   building or gathering from. Place it a step ahead of him, where he looks.
3. At the crate the prompt says "Press F to talk to him" while no Moss is drawn (already carried to step 3).
4. The hen's name box says "Press F at the board to change it later"; that sentence belongs to the ground's name. Say
   how a hen is renamed, or drop the sentence until there is a way.
5. The weapon panel still reads "LONGHORN RPG, AMMO 3" while the hammer is in his hands. Hide the panel, or show the
   hammer, while he builds.
6. On his first visit after the fence closes the board opens with "You were only away for a moment.", which reads oddly
   when he never left. Leave the away line out when the gap is under an hour.
7. Two hens a few centimetres high are hard to find on a 40 m ground; they read as brown dots from the gate.

**Not faults (the drive tool):** a key sent in the instant the tool resumes the game is lost, and turning him by
script moves the box out of the F prompt's reach until he faces it again; both work by hand.
