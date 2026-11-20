# BOWL-REX-FIGHT: questions for Claude

Each question has my pick, and the pick is built. Every number named here is in `REX_RULES` or
`rexPlaces` in `src/bowl/bowl-rex.js`; the test reads those, so a change is one line.

## 1. Is night five three events or four?

The design page says a night is three events in a row, and Last Truck Rolling runs "from night 3".
The card says to add the fight to night five.

- **A. Car Crush, Freestyle, then the Scrapasaurus (my pick, built).** The season ends on the fight, and a
  child does not have to win Last Truck Rolling again before reaching it. Every night stays three events, as
  the picker, BOWL-TURNS ("a player who wins all three events") and the design page say. Night five is then
  playable before BOWL-RIVALS lands. Cost: BOWL-RIVALS' line `rivals.night.5` is never said; it can go, or it
  can move to the fight's intro if the rivals should watch.
- **B. Car Crush, Freestyle, Last Truck Rolling, then the Scrapasaurus.** One line in `SHOW_NIGHTS`. The night
  is about four minutes longer, a loss at Last Truck Rolling is retried before the fight, and the words
  "three events" in BOWL-HOOKS and BOWL-TURNS would need a night-five case.

## 2. What does "eats a junk car to heal" do?

- **A. It mends its limp (my pick, built).** Each smashed box makes it walk at 70 percent. At its pen it eats a
  junk car if a box has been smashed since its last meal, and walks at full speed again; otherwise it throws
  the car at the spot where the truck was (a ring on the floor, a tell of 2.5 s on Easy). A smashed box stays
  smashed, so a child never loses progress.
- **B. On Hard, eating mends a smashed box.** Harder, but it undoes a landing, and with one rest a lap the
  fight could stall; I do not recommend it.

## 3. How does the fight end when the player loses?

Built: two ways, both told by Big Mo before the card. After its last rest (Easy 6, Medium 5, Hard 4) it walks
out of the car park gate ("the fight goes somewhere": it never ends where it started). Or its fire and thrown
cars catch the truck too often (Easy 5, Medium 4, Hard 3). A loss is a retry, as for every event.

## 4. Where the beaten Scrapasaurus lies in the yard

Built at yard-local (17, 28), across from the water works and in front of the home camera, rolled onto its side
with its boxes smashed (`REX_PLACE` in `src/scrapdome-yard.js`). It is a guess at open ground from the yard
model's bounds; please look at it in the yard and move it if it stands in something. TOWN-BOWL-LINK still owns
the town-square version.

## 5. Floor size (BOWL-EXPAND)

Built as asked: the rails, the resting place, the pen, the gate, the start and the fire's reach all come from the
course in `rexPlaces` (the floor's half width, the highest ramp, the crush line, the first ramp). A course may name
its rails as `features.rexRails: {off}`; without that the rails run halfway out on the island side. The open box
sits 5 m past the big ramp's lip, which is where a truck from 28 to 38 mph comes down from its highest point; if
BOWL-EXPAND changes the ramp's height, that distance is the one number to check (`restPastRamp`).
