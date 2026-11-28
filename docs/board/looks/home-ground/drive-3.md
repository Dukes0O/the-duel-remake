# Home Ground step 2 with its fixes: Claude's drive by hand, 27 November 2026

Driven on integration `e0bf63cd9` (the new hen body of HOME-HEN-BODY and the seven fixes of HOME-GROUND-2-DRIVE),
served from the integration folder on port 5191, a visible Chrome at full frame rate with real keys, a temporary player
with memory-only saves, switch `home-ground` on. The ground and its closed fence were given by a page script.

**Fixed, as seen in play:**
1. Moss stands at the crate in his overalls while the hens wait, and his four lines play as before.
2. The hen's name box says only "Type a name and press Enter."
3. The hens read as hens from the gate, about 8 m off: low, round and red-brown, no longer dots.
4. The weapon panel is gone while the hammer is in his hands.
5. The board shows its lines only near it: hidden at 9 m, shown at 3.5 m. After he gathered 13 eggs, reading it again
   said "The nest boxes are empty. You have 13 eggs in your store."
6. On the big map, "No way is known." sits on one line (351 by 31 px), which closes MAP-NO-WAY-WRAP.

**Still to fix (carried to HOME-GROUND-3B):**
1. **The nest box still cannot be seen while it is built or gathered.** Its cell centre is now about 1 m ahead, which is
   below the bottom of the view at standing eye height; from 3.8 m it shows, but behind the prompt line. Measured in
   the pictures, not guessed: the box's top is 0.34 m, the eye about 1.6 m.
2. **The ground's HUD draws over the big map**: the board's four lines, the "Press F" prompt and the weapon panel sit
   on top of the open map.
3. **Moss does not turn to him while he talks**: he faces the gate, and the speech bubble points at the gate.
4. **The board shows itself from 6 m but answers F only within about 2 m**, and between the two nothing says that F
   will read it.

Pictures were sent to Kyle; the evidence folder is deleted.
