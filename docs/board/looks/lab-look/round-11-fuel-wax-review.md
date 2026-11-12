# The Lab's look: round 11, the wide board on Fuel and Ski wax, and Braking's labels (12 November 2026)

Sheet: `round-11-fuel-wax.jpg`, eight pictures from the game's browser harness (memory-only saves, a 1536 by 864 window), two to
a row, each captioned: 1 and 2, Fuel's "Force, mass and acceleration" step after and before; 3 and 4, Fuel's free test with the
physics panel closed and open; 5 and 6, Ski wax's "Three snows, three waxes" step after and before; 7, Ski wax's free test with the
panel closed; 8, Braking's close-up step with the larger labels. Built by a Sonnet helper; Claude judges.

What changed:

- **Fuel** (`fuel-board.js`) is a 1320 by 680 board. The road is nearly 1.5 times as long beside the tank (750 units against 510) and
  runs the whole width on its own (the wonder, the question's race and the speed graph's step). The cars are 1.2 to 2 times their old
  size. The tank, its scale and the can are 1.15 times larger beside the road; on the Fuel load step they stand alone in the middle at
  1.25 times, with the pump the hose comes from and two spare cans so that the floor is not bare. The jugs and the Tune page's card are 1.25 to 1.5
  times larger; the three recap cards are wider.
- The stopwatches and the speed beside each car moved to the strip as one reading for each car ("Full tank 3.27 s 100 km/h"); the free
  test's table of results is in the strip under the board (the last three tests), and Brian's job's sentence about the litres is a reading
  in the strip. The sums beside each car (force over mass) stay on the board with the force arrow, because they label it.
- **Ski wax** (`wax-board.js`) is a 1320 by 680 board. A strip on its own is 1.6 times its old scale and 1180 wide; three strips are 780
  wide with their labels larger; the free test's close-up sits under its strip at a wider size; the friction sum's slope and bars use the
  width; the tins are 1.25 times larger; the magnifier and the thermometer are larger and stand in the middle. The stopwatches are in the
  strip, one reading for each ski, and the free test's table is in the strip (the last three results, with its headings moved into
  each row).
- **Braking** (`braking-board.js`): every text under 15 board units is now 15 (distance marks, "brakes on", the dial and lever
  headings, the close-up's labels, the energy step's labels, the questions' small labels); the key caps are drawn at 15. Nothing else
  moved.
- No text on any of the three boards is smaller than 15 board units. One test for each lesson plays every step, draws it as it opens
  and while it plays, and fails if any text is smaller.
- No word changed. A scratch script played every step of each lesson at many settings and compared every word the old board and the
  new board with its strip draw. The only differences are the table's heading words (Car, Petrol, Total mass, Acceleration, Time; Snow,
  Wax, Friction, Time, Against no wax), which are now written in each row of the strip's table, and the three recap cards' lines
  breaking in different places because the cards are wider.

Builder's view of what is still weak:

- Fuel's free test has one car on a long road, with floor below it; it is better than the old board (the table's panel was
  mostly empty), but it is the sparsest of Fuel's pictures.
- Ski wax's three-strip step is crowded: a 10 degree slope drops 140 units over a strip, so three strips cannot be much longer than
  this and still fit the height, and a third of the width to the right stays bare.
- The strip's table shows the last three tests, not the last six or eleven the old boards drew; its rows are the longest in the
  Lab (up to about 100 characters).
- Ski wax's close-up is still a thin band of drawn points; it is larger but not richer.

Verdict (Claude): to be written.
