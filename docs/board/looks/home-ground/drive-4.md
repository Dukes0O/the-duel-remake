# Home Ground step 3 and the builders: Claude's drive by hand, 27 November 2026

Driven on integration `4ee6b2229` (HOME-GROUND-3 and HOME-GROUND-3B), served from the integration folder on port 5191,
a visible Chrome with real keys, a temporary player with memory-only saves, switch `home-ground` on. The step 2 ground
was given through the home rules; the truck was lined up on his lane by script after a first approach by hand caught
a gate post at 20 degrees (the 7.4 m opening is fine).

**Works:** the board's invitation to fetch tin; the yard's "Go out in Tin Town's flatbed"; the flatbed drawn as the
truck; one F press at the stack puts the coop's tin on the bed (320 kg on the truck) and one press beside the mark sets
it down; four held stages raise the coop, which adds its three nest boxes and offers F to gather; marking a second coop
restocks its tin at Tin Town's gate; with the tin set down, F at the board hands it to Rook and Wren and starts their
clock. The view tilts down while building, the weapon panel hides, and the build words are whole sentences.

**To fix (card HOME-GROUND-3-DRIVE):**
1. **Getting out of the truck puts the tin back on the bed.** Leaving is a held F, and its first instant counts as the
   one press that loads, so within 4 m of a set-down load he cannot get out without loading it again.
2. **Rook and Wren never reach the site.** After 30 seconds both stand still outside the fence at about (5930, 93),
   4 m to the side of the gate, walked 48 m, not working.
3. **Wren's teaching line did not play** when the first coop was finished; "We can talk when you come back." showed
   instead.
4. **A mark is offered only from the exact spot it was made.** Standing 0.2 m off, the prompt said "Something already
   stands there. Pick it up first." instead of offering to raise the floor.
5. **He hammers from inside the footprint**, so the frame and walls rise around his face. The footprint should start
   about 2 m in front of him.
6. **The build outline is a tall pale slab** (coop, shed and panel alike) that fills the middle of the view.
7. "You have 1 old crates left." should say "1 old crate".
8. The coop's tin is smooth and pale, and reads new; it wants the wear and bent sheets of the fence.
