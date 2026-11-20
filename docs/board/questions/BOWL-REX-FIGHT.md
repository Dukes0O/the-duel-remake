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

## 5. How the truck gets onto its back on the new Bowl (BOWL-EXPAND)

On the 160 m by 90 m Bowl the rails (`features.bowl.rails`, 16.5 m out) do not pass any jump: the Big Jump and the
Table are 13 m out on the Spine's side and the kickers are in the middle. So a jump cannot land on it.

- **A. It drops a junk car on its rails in front of itself when it rests (my pick, built).** The car stands at the
  show's first launch-car place along the lap (`features.bowl.launchCars[0]`, s 36) on the rails' line, and the open
  box is 13 m past it (`boxPastCar`). The truck drives up the car (FUN-TITAN-LAUNCH, untouched) and comes down on its
  back: from 30 to 45 mph it is 2.6 to 7.8 m up between 8 and 18 m past the car, which is the catch window. It fits
  the Rex's junk-car habit, and it can rest anywhere on its rails. The car is ordinary parked traffic. The runner
  keeps it on the lap the truck comes to next, and holds it where it was dropped.
- **B. Rails that pass the Big Jump's landing.** This would need the rails moved in BOWL-EXPAND's data.

Two findings for the Director:
- Parked traffic eases towards the road lane (3.4 m out on the Spine's side) at 0.7 m/s (`sim-rival.js` `_traffic`).
  So Freestyle's two launch cars at 14 m out drift away after the event starts. The fight holds its own car in place.
- The race counts the truck's distance on from lap to lap, so a parked car at s 36 is met only on the first lap.
  Freestyle's launch cars are therefore one-lap props. The fight's car moves to the next lap's place.

Pace is now the time to walk once round (Easy 42 s, Medium 34 s, Hard 28 s), so the rhythm keeps on any floor.
Rests are Easy 20 s, Medium 14 s and Hard 11 s, a lap of the new floor being about 17 s at a child's pace. Hard has
five rests.
