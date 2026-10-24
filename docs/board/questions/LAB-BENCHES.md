# LAB-BENCHES: questions for Claude

Picked so the card can finish; say if any should change. All three are edits to Brian's explanations in
`docs/LAB.md` section 4, because the card says every explanation must stay true to what the game does, and
`tools/test-lab-benches.mjs` now checks the quoted numbers against the benches.

1. **Suspension.** The text said soft springs keep the tyres on the ground and stiff ones bounce off bumps. The
   quarter-car model (same damper on both springs, 4 cm bumps) shows the opposite for the tyre: it stays down about
   as well on both, a little better on the stiff spring (93% against 88% of the time on the bumps). What it does
   show, clearly: the stiff spring shakes the car's body about 17% harder, and the soft one leans the car 6.5
   degrees in a 0.8 g corner against 2.2. **Picked:** "Soft springs let the body ride over a bump, so it is shaken
   less, but it leans more in a corner. Stiff springs pass every bump up into the car, shaking it harder, but keep
   it flat and quick to turn on smooth roads." This matches the tuning table (softer: bumps smaller, stiffer: more
   grip on smooth roads). Alternative: keep the old sentence and tune the model until it agrees, which would be a
   model made to fit the words.
2. **Grip.** The game's tyre keeps all its grip from zero slide up to 4.3 degrees (slip 1), then loses it; it has no
   rising part, so "grips best when it slides a little" is not what the game does. **Picked:** "A tyre can slide a few
   degrees and keep all its grip: in the game that is up to 4.3 degrees. Past that the rubber skates and grip falls.
   A short squeal says you are at the limit; a long screech is lost time."
3. **G-force.** The game allows `DRIVE.maxLateralAccel x grip`: 2.5 g for the grippiest-poor car up to 3.5 g for the
   best, not "about 2.5 g". **Picked:** "allowed between 2.5 and 3.5 g".

Also for your eye (no wording change): the Braking balance part uses a fixed 1 g road stop for the weight transfer
(69% on the front tyres) because the game's own braking, 2.4 g, would put nearly all the weight on the front and make
the slider useless; the stopping distances use the game's real braking. And which wax suits cold snow (-5 C, medium)
is mine: the ski rules know only "right" and "wrong" wax.
