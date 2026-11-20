# BOWL-RIVALS: questions for Claude

Each one is built with my pick; the numbers are one table each in `src/bowl/bowl-rivals.js`.

## 1. Rivals hit softer on Easy in Last Truck Rolling

In the arena a ram costs both trucks the same armor (closing speed, `src/sim-contacts.js`). A driver who chases every
truck therefore takes three trucks' worth of knocks while each rival takes one. With full-strength rivals the
child-pace test driver won 0 in 10 on Easy at every show armor tried (40, 60, 100, 140 and the arena's own 194), and
the arena's own Last Car Rolling scoring (respawns, wrecks minus wrecked) gave 1 in 10.

- **A. Rivals' rams scaled by level (built):** `BOWL_RIVAL_HITS` Easy 0.2, Medium 0.6, Hard 1, through the arena's
  existing per-truck `ramDamageScale`. The player always hits at full strength; every other rule is the same for all.
  This is the one place a rival is not on the player's rules, so it needs your word.
- **B. The derby rule for every truck:** a truck hit in its side or back takes the knock, a truck hitting with its
  front takes a quarter. Fair to all and rewards knocking others out, but it changes the shared contact code.
- **C. The player gets three trucks** and the rivals one each.

## 2. No nose tipping in the air during Last Truck Rolling

Under the arena's armor rules a roof landing is a scenery knock (20 armor) and a dead stop, because the arena has
no rollover step. A young driver holds W over a jump, which tips the nose (BOWL-AIR), so they knocked themselves out.
The rivals' trucks never tip. **A (built):** `bowl-air.js` does nothing while `state.arena` is set, so the player
lands like the rivals; Freestyle, Car Crush and Side by Side keep their flips. B: make the arena roll the truck as
Freestyle does (physics). C: keep the knock.

## 3. When the clock runs out

The event lasts two minutes. **A (built):** of the trucks still rolling, the one that hit the others hardest wins, a
tie goes to the player, and a truck that hit nothing cannot win. B: the truck with the most armor left wins (a truck
that hides wins; the test's truck that never moves won this way). C: the arena's sudden death.

## 4. Most Easy wins come at the clock

On Easy the child-pace driver knocks out 0 to 2 trucks and usually wins at the two-minute mark. A show armor of 60
gives more knock-outs but the Easy win rate fell to 4 in 10. My pick is 80; BOWL-FINISH can tune it in play.

## 5. The rivals' bolt-ons are not drawn yet

`trucks.glb` (BOWL-ART-TRUCKS) is not wired to the computer trucks; their meshes are made in `src/render3d.js`. The
rivals drive the show truck's look. My pick: a small follow-up card that hangs each rival's bolt-ons on their truck,
with a look check. Dragon Wagon's fire on the ramps belongs with it.
