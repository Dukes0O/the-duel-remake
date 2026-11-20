# BOWL-SHOW-2

The short board entry controls current state, ownership, dependencies and locks.

Show Night, round 2, from Kyle's try on 20 November 2026. Kyle: Show Night is the closest of all the story lines to
finished, "about 50% of the way there", and it goes first so that Gratian can play it. Claude designs this round in
writing (below, "Design"), then cuts it into slices for building. Every item here is Kyle's own finding.

## What Kyle found

- **The first event of every night (the car crush) is over in about three seconds**, with nothing to play. It must
  become a real event or be replaced.
- **Tricks.** Backflips and front flips exist but nothing tells the player. Kyle wants the monster-truck freestyle set:
  wheelies and stoppies (driving along on the rear or front wheels), donuts, 360s, side flips and barrel rolls. A double
  flip scores far more than a single one. The trick list must be taught in the game.
- **Jumping out of the arena into the stands and beyond is the best moment of the night. Keep it** (with
  `memory/keep-fun-bugs`) and make it a feature: the truck may land in the crowd, which scatters. Outside the arena there
  must be a way back in: an opening in the outer wall, reachable from behind the stands.
- **Sound:** more sounds of cars being crushed.
- **The camera** changes angle in jerks during events.
- **The rival** in the side-by-side race does almost nothing and crawls; rivals in general are weak.
- **Damage cannot be read** until the truck smokes. Show it plainly.
- **Low-speed hits on walls** should be bounces, not damage.
- **Last Truck Standing has no weapons.** Kyle suggests robot-wars weapons: a saw, a hammer, a launcher. Kyle heard what
  sounded like the arrow launcher but could not tell.
- **The Scrapasaurus:** a good idea, but Kyle could not tell how to beat it. The truck drives through it; "land on its
  back" and "smash its three battery boxes" could not be done or understood.
- **The nights repeat each other.** Kyle wants more variety: new challenges, new moves, more nights, using the larger
  Titan arena that already exists.

## Design

Written by Claude on 20 November 2026, after playing Night 1, a Side by Side, a Last Truck Rolling and the Scrapasaurus
by hand on Easy in a visible window (a test copy on a private port, memory-only saves). The slices are listed at the end.
The round closes with Claude's drive by hand of every night and then Kyle's (`memory/play-by-hand-before-showing`).

### What the hand drive measured

Each number is the one a slice has to beat.

- **Car Crush:** 4.4 seconds from the lights to the result card, with the throttle held and nothing else. One lane of five
  pieces was crushed and ten were never touched. Big Mo's line naming the event came up after the event had ended.
- **Walls:** every touch of a wall is ruled a crash. A touch at 12 mph added a third to a damage zone, the truck stopped at
  0 to 3 mph and stayed pressed on the wall nose first, and the steering did not turn it at that speed. A driver who holds
  the throttle and does not steer ends each drive against an end wall.
- **Camera:** it stands behind the truck along the line of the lap, not along the way the truck is going. When the truck
  crosses the end of the Spine or turns round, its place on the lap jumps and the camera jumps with it. A truck near a
  wall or outside the arena leaves the picture or sits behind the lap map.
- **Flips:** holding S in the air took the truck from 50 mph to 2 mph in mid flight, because the brake still works in the
  air, so a backflip spoils its own jump. Each roof landing added 0.35 to 0.55 to a damage zone, in an event where nothing
  shows damage.
- **Over the wall:** off the Big Jump with nitro, aimed at the stands, the truck rose 15.6 m, flew 59 m, scored 206 and came
  down among the crowd. Nobody moved. The stands have no height for a truck, so it drove through them at floor level, out
  through the back and across open desert, with no way back and no word from Big Mo.
- **Rivals:** their top pace is 13 to 15 mph on Easy, 24 to 26 on Medium and 28 to 32 on Hard. The driver's truck holds
  about 50. Old Bess needs about 49 seconds for a lap that takes the driver about 17. In Last Truck Rolling the rivals
  also back up and stand still.
- **Damage:** two measures run side by side. Damage zones (front, back, left, right) rise from walls and roof landings and
  show only as smoke. Armor (60 points) is what knocks a truck out; it is printed over each rival as "60/60" and nowhere
  for the driver. In one drive the front zone reached 0.98 while the armor had lost 4 of 60.
- **The Scrapasaurus:** when it rested it was at the left edge of the picture behind the lap map, crouched, and looked
  like a heap of orange scrap. Nothing on the floor showed where to drive. Placed by hand exactly on its rails, 22 m short
  of the junk car, and driven flat out, the truck was thrown 7 m up, passed through the body, and a box was counted as
  smashed. So the fight can be won only by a driver who already knows the line, and what the truck does is not what the
  words say ("land on its back").
- **The screen:** the event panel covers the top middle and the mirror; the lap map covers the left third, where the truck
  often is; "1 / 99" laps, the gear and the mirror mean nothing in the Bowl.

### Five rules for the round

1. **Always something to do.** No event is shorter than 45 seconds of play, and no event makes the driver wait more than
   8 seconds for the thing the event is about.
2. **The truck never sticks and never wears out outside a fight.** Damage exists only in Last Truck Rolling and against the
   Scrapasaurus, where it is the point of the event.
3. **Every move has a name, a picture of its keys and a pop-up when it is done.** A try that fails says why in one sentence.
4. **One new thing each night**, named on the night's row in the picker, so a child sees what tonight adds.
5. **One keyboard, players in turn.** Driving keys are unchanged. **Space is the show key:** with another key it turns
   driving into a trick. Every new event must also work as one go in a Turn Show.

### 1. Car Crush becomes a 60 second event on the whole floor

The first three seconds stay exactly as Kyle saw them, because the first crunch is good. The event then goes on.

- **The clock:** 60 seconds (75 on Easy). The event no longer ends when the truck stops or leaves the line.
- **What stands on the floor** in this event only (31 pieces; the other events keep today's line and nothing else):
  the line as today (15 pieces: three rows of cars, the buses and RV, the burning stacks); **the Row**, five junk cars
  side by side on the Jump Straight's stand side, which one pass across the floor takes all at once; three **pancake
  cars**, one where a full speed truck comes down off each kicker and one off the Table; **the Bus Pile** in the open
  middle of End 2, two buses with a third across their roofs, which gives way only to a truck at 30 mph or more or one
  coming down on it; and five single cars scattered in the open middle of End 1.
- **The goal is a count:** "CRUSHED 7 OF 10". Easy needs 10 of the 31, Medium 18, Hard 26. Crushing all 31 is a **Full
  House**: Big Mo calls it and every second left on the clock pays 20 points.
- **Chain:** each piece crushed within 3 seconds of the last raises the chain by one, and each link adds a quarter to the
  points, up to two and a half times. The chain shows as "CHAIN x3" and falls back to nothing after 3 seconds.
- **Pancake:** a piece crushed by a truck coming down out of the air pays three times and gets its own name on screen.
- **Points:** a car 35 (as today), a bus or the RV 60, a burning stack 80, the Bus Pile 200 for the three.
- When the clock ends the truck rolls to a stop, the camera swings a quarter of the way round it and only then does the
  result card come up (two seconds), so the last crunch is seen. Every event ends this way.

### 2. The trick set

Tricks are rules over the truck's ordinary driving, on the Bowl only. A trick sets the pose the truck is drawn in
(nose up, on its side, turning) and nothing else about the race changes outside the Bowl.

| Trick | How it is done | It counts when | Points: one, two, three |
| --- | --- | --- | --- |
| **Wheelie** | Nearly stopped (under 10 mph), hold W and Space together | the front wheels have been up for 1 second; it ends at 30 mph, when a key is let go or on a hard turn | 8 a second; a wheelie of 3 seconds or more adds 25 |
| **Stoppie** | Above 25 mph, hold S and Space together | the back wheels have been up for 1 second; it ends under 8 mph or when a key is let go | 10 a second |
| **Donut** | Under 15 mph, hold W and Space and Left or Right | each full turn on the spot | 15, then 5 more for each turn in a row, up to 40; three in a row is a **Cyclone**, 30 more, once |
| **Spin (a 360)** | In the air, hold Left or Right | each full turn flat, landed on the wheels | 30, 120, 270 |
| **Front flip** | In the air, hold W | each full turn nose first, landed on the wheels | 50, 200, 450 |
| **Backflip** | In the air, hold S | each full turn tail first, landed on the wheels | 50, 200, 450 |
| **Barrel roll** | In the air, hold Space and Left or Right while the truck flies nose first | each full roll, landed on the wheels | 60, 240, 540 |
| **Side flip** | In the air, turn the truck sideways first (a quarter spin), then hold Space and Left or Right | each full roll made while the nose points more than 45 degrees away from the line of flight | 80, 320, 720 |

- **A double pays four times a single and a triple nine times**, for every trick in the air. That is Kyle's "far more".
- **Combos:** two kinds of trick in one jump pay one and a half times their sum, three kinds twice, four kinds two and a
  half times. A backflip with a spin is (50 + 30) x 1.5 = 120.
- **Turning speed:** the first turn of a flip takes 1.0 second and each turn after it 0.8, so a double takes 1.8 seconds
  and a triple 2.6. The kickers give 1.2 seconds in the air (one flip), the Table 1.9 and the Big Jump 2.2 (a double),
  the Big Jump with nitro 2.4, and the leap off the back of the stands (section 3) more than that: a triple needs the
  biggest air in the building. A spin turns once in 0.9 seconds and a roll once in 1.0.
- **In the air the keys only turn the truck.** W and S no longer change its speed in flight. A key held from before
  take-off still tips nothing until it is let go and pressed again (BOWL-EXPAND's rule, kept).
- **Landing:** on the wheels within 45 degrees of level, the tricks of that jump pay. Pointing more than 45 degrees away
  from the line of flight, the truck slides, its speed halves over a second and the tricks pay half. On the roof or a
  side it is a **Slam**: the tricks of that jump pay nothing, the crowd meter loses a third, the truck rolls back onto its
  wheels in 1.5 seconds and drives on, and nothing is damaged. On Easy a truck within 30 degrees of level when the keys
  are let go eases itself level.
- **The crowd is the multiplier**, as today (points times one to two), now written on the meter: "CROWD x1.4". The first
  time each kind of trick is done in an event it pays one and a half times and the pop-up says NEW. The same kind done
  again and again pays four fifths of the last time, down to two fifths; another kind in between sets it back. A child
  who has found the backflip is pushed, gently, to find the next thing.
- **Freestyle's target becomes a rival's score.** Each night one rival has "already been round" and that rival's score is
  on the board: "BEAT OLD BESS: 300". The three levels' scores are set by measurement with
  `tools/bowl-freestyle-balance.mjs` and three scripted drivers: Easy is won 9 times in 10 by a child-pace driver who uses
  the kickers, wheelies and donuts and no flips; Medium needs single flips and one big jump; Hard needs doubles or combos.
  Starting numbers before measurement: 300, 800 and 1,500.

**How the game teaches it.**

- **Trick School** opens from the Show Night picker and is offered once before a driver's first night ("First time here?
  Come to Trick School first", with "Not now"). It has no clock and no target. Big Mo asks for one trick at a time, in the
  order of the table. Each lesson shows a small picture of the truck doing the trick with the keys drawn as key caps, one
  sentence that says what the word means ("A wheelie is driving along on the back wheels with the front wheels in the
  air"), and waits. When the trick is done the lesson is ticked and the next one opens. After the last lesson the floor
  stays open for free practice until the driver leaves. Lessons done are kept with the driver's Bowl records.
- **A failed try says why**, once, in one sentence, from what the truck did: "You were going too fast for a wheelie, so
  slow right down first." "You let go before the truck was all the way round, so hold S a little longer." "That jump is
  too small for a double, so take the Big Jump."
- **The trick card:** H opens the list, paused, in any Bowl event: each trick's picture, keys and points, with a tick on
  those the driver has landed.
- **The pop-up:** each trick's name and points come up over the truck for a second and a half as it lands: "DOUBLE
  BACKFLIP 200 x1.4 = 280".
- **Tonight's trick:** each night names one or two tricks (section 11). Its picture and keys are on the card before the
  event, and it pays double that night.

### 3. Over the wall, into the crowd, and back in

The jump out stays as the physics makes it today and joins "Keep these" in `docs/board/decisions.md`.

- **The stands become ground.** Behind the wall and its fence the terraces rise from 3.2 m to 24 m over 36 m (the stadium's
  own sizes), about 30 degrees, which a Titan climbs. A truck lands on them, drives along them and up them.
- **The crowd scatters.** People within 6 m of the truck get out of its way and come back when it has gone: a cleared
  ring that moves with the truck, with the people at its edge running. Nobody is hit (the game's tone: gritty, no blood).
  The crowd screams and then cheers.
- **Off the back.** The top row is 24 m up and the outer wall drops straight to the ground outside. A truck that drives
  off the top makes the biggest jump in the game, scored as any jump is, by its height, length and tricks.
- **Outside** is the car park: flat ground all round the stadium, lit by the floodlight towers, with about twenty parked
  cars to crush. A dirt bank 80 m out from the outer wall turns a truck back; nothing is beyond it.
- **The way back in:** two gates, each an opening 8 m wide in the outer wall with a tunnel under the stands to the floor.
  **The Car Park Gate** is on the Jump Straight's stand side, where the Scrapasaurus already leaves by; **the Pit Gate**
  is its mirror on the Crush Straight. From outside, a marker with an arrow and a distance points to the nearer gate, lamps
  flash over it, and Big Mo says where to go. A truck on the floor may also drive out through a gate.
- **Points:** over the wall 150 (in full once an event, half after that); in the stands 4 a second for up to 15 seconds an
  event ("crowd surfing"); the leap off the back as a jump; back in through a gate 40.
- **In each event:** the clock keeps running, which is the price of the trip. In Last Truck Rolling a truck over the wall
  is out of the Bowl (section 9), and the driver's own truck has 15 seconds, counted on screen, to come back through a gate.

### 4. Crush sounds

A crush today is one sound. It becomes a short set, so that fifteen cars do not sound like one car fifteen times:
the first bite of metal (four different takes, never the same one twice running, deeper for a bus and deepest for the
burning stack); glass going; a groan of metal for as long as the wheels are on the wreck; a clank as the truck comes
off; a duller flat crunch for a wreck run over again; a heavier hit with a low thump for a pancake; and the crowd's
"ooh" for a bus or the pile. Card BOWL-SOUND-CRUSH names the cues.

### 5. A steady camera, and a screen with room on it

- **The show camera** stands behind the truck along the way the truck is travelling, not along the lap and not along the
  nose (a spinning truck must not spin the camera). It turns at no more than 120 degrees a second, ignores changes
  smaller than 8 degrees, and holds its angle while the truck is under 5 mph, so donuts turn in front of a still camera.
  In the air it draws back and up with the truck's height (from 8.7 m behind to 14 m at 10 m up) and never tips with a
  flip. It never cuts: every change is eased over at least 0.4 seconds. When a wall, the fence or the stands come between
  camera and truck it rises over them. It follows the truck into the stands and outside.
- **The screen in the Bowl:** the lap map, the lap count, the gear and the mirror go. The event panel becomes one slim
  strip along the top: the event's name, the goal in eight words or fewer, the score, the clock and the crowd meter.
  Big Mo's caption moves to the bottom middle. A small plan of the arena (trucks, gates, the Scrapasaurus) sits bottom
  left in the fights and whenever the truck is outside.
- **Big Mo keeps up.** His opening lines for a night are on the card before the countdown, not spoken over the first
  event. At most one line starts an event, and a line that has waited 6 seconds unsaid is dropped.

### 6. Rivals that compete

- **Pace is set against the driver's own lap,** not as a top speed. A clean lap of a lane is measured for the show truck
  (about 17 seconds). On Easy a rival takes 1.35 times that (Old Bess 1.45), so a child who meets a wall once still
  wins; on Medium 1.12 times; on Hard the same as a clean lap, and Dragon Wagon a little under.
- **Close at the line:** on Easy and Medium a rival more than 25 m ahead eases off by up to 15 percent and one more than
  25 m behind pushes by up to 8 percent. Never on Hard.
- **Side by Side is twice round**, about 35 to 40 seconds. The rivals take their jumps, brake for the turn, and each makes
  a mistake of its own that a child can watch for: Old Bess runs wide in the turn, Rust Rhino brakes late and brushes the
  wall, Tin Lizard is quick in the turn and slow on the straight, Big Kettle takes 1.6 seconds to get going and is then
  the fastest in a straight line, Dragon Wagon flips over the last kicker for the crowd and loses half a second doing it.
  The finish gate's lamps show who won before the card comes up.
- **In Last Truck Rolling** the rivals keep moving at 30 to 40 mph, charge, and use a weapon each with a tell (section 9).
  They also go for each other.

### 7. Damage the driver can read

- **Outside a fight there is no damage on the Bowl at all:** no zones, no smoke, nothing to read. Car Crush, Freestyle,
  Side by Side, Trick School and the jump events cannot be lost by wear.
- **In a fight there is one measure, health,** drawn bottom left as the truck seen from above in four parts (front, back,
  left, right) over a bar of five large segments. Each part goes from green through yellow and orange to red as it is
  hit, the part that was hit flashes, the number lost floats up from it, and the last segment pulses with the word DANGER
  and a warning sound. The driver's bar and the rivals' bars (over each truck, the same five segments in place of
  "60/60") show the same thing that knocks a truck out.
- **The trucks show it too:** at three fifths a panel hangs loose, at one fifth the truck smokes, at nothing it burns and
  stops.
- Against the Scrapasaurus the same bar counts scorches (five on Easy).

### 8. Walls that bounce

Speeds are the truck's speed straight into the wall, not along it.

- **Under 25 mph: a bounce.** No damage in any event. The truck is pushed back out at two fifths of the speed it came in
  with (never less than 2 m a second), keeps most of its speed along the wall, and its nose is turned to run along the
  wall within 0.4 seconds.
- **25 to 45 mph: a hard bounce,** the same with a shake of the camera; in a fight it costs a twelfth of full health.
- **Over 45 mph: a big hit,** which spins the truck; in a fight it costs a sixth. The truck is never stopped dead and
  never held.
- **A touch at less than 30 degrees to the wall is a scrape** at any speed: sparks, no damage, a twentieth of the speed.
- The same rules hold for the Spine, the containers, the rivals and the legs of the Scrapasaurus.
- **The ends:** a truck held on W with no steering is turned along the end wall by the bounce and carried round, slower
  than a driven line. That settles the question BOWL-FINISH left open.
- A row of big tyres along the foot of the walls is drawn so that the bounce looks like what it is (BOWL-OUT-LOOK).

### 9. Weapons for Last Truck Rolling (Kyle's "Last Truck Standing")

Three bolt-on show weapons in the manner of robot fights: close range, one key (F), each with a tell before it lands and
a rest after it, so that a child can see a hit coming and get out of its way.

| Weapon | What it does | Tell and rest | Good for |
| --- | --- | --- | --- |
| **The Hammer** | An arm swings over the cab and comes down on whatever is within 4 m of the nose: three tenths of full health, and the truck it hits cannot steer for a second. A miss hits the dirt and holds the swinger still for half a second | The arm rises for 0.4 seconds; 2.5 seconds before the next swing | one heavy blow |
| **The Saw** | Hold F to spin a disc on the nose. While it touches a truck it takes an eighth of full health a second, throws sparks and slows both trucks | It screams as it spins up; after 4 seconds of cutting it glows and must cool for 3 | pinning a truck on a wall |
| **The Launcher** | A plate under the nose, driven by air, throws a truck within 2.5 m up 6 m and 12 m away. It lands on its side, loses a sixth of full health and takes 2.5 seconds to right itself. **A truck thrown over the wall is out of the Bowl at once.** Fired with nothing in front, it hops the driver's own truck 1.5 m | A hiss and a gauge; 4 seconds to fill again | knock-outs beside the wall |

- **Choosing:** a card before the event shows the weapons open that night with a picture and one line each. Night 3 has
  the hammer only, so that it is learned alone; night 4 offers the hammer or the saw; night 5 all three.
- **The rivals' weapons** are fixed, so each is known by what it carries: Rust Rhino its horn (a charge that hits harder
  the faster it is going), Big Kettle a hammer, Tin Lizard a saw, Old Bess a launcher, Dragon Wagon a short breath of
  fire. Their tells last 0.8 seconds on Easy, 0.6 on Medium and 0.4 on Hard.
- **What Kyle heard:** weapons are switched off in today's event, so the sound was not a weapon. The cue for a knock-out
  (`arena.wreck-credit`) is the likely one; BOWL-WEAPONS finds it and gives the Bowl its own.

### 10. The Scrapasaurus: how it is beaten, and how the driver learns it

The idea stays: keep out of its fire, smash three battery boxes, and it falls. What changes is that the driver can see
what to do and can do it with the driving already learned.

- **It is solid.** Legs, body and tail bounce a truck off by the wall rules. Its back is ground a truck can stand on.
- **It comes to the driver.** It walks its rails by the shorter way round towards the truck, bursts out of the Car Park
  Gate beside the truck to begin, and breathes its first fire within 8 seconds. No more waiting for it to come round.
- **The loop, in three beats a child can say back:** it rears and its chest glows, so get out of the orange on the floor;
  it breathes fire into exactly that orange; then it is **tired**: it sags with its head on the floor and steam coming
  off it, **its tail lies flat on the floor as a ramp** with lit arrows running up it, one battery box opens and a beam of
  light stands up from that box, tall enough to see from anywhere on the floor. Drive up the tail and over the box.
- **Where it tires:** wherever it is on a straight, after each breath of fire on Easy and after every second one on
  Medium and Hard. On an end it walks on to the straight first, because the tail needs flat floor.
- **Three boxes in a row up its back:** the first at the root of the tail (any speed gets there), the second in the
  middle of the back (a run at the tail at 25 mph or more), the third on the shoulders (40 mph or more). Wheels on the
  open box smash it. One box each time it tires. After each box it is angrier: its fire sweeps from side to side, then
  it throws cars as well (a ring on the floor first, as today).
- **The show-off way stays:** a truck that comes down on the open box out of the air, from a jump or a launch off a car,
  smashes it too and earns "From the sky", 300 points. It is never needed.
- **How the driver learns it.** A card before the fight has three pictures and three short sentences, the three beats
  above. During the fight the goal line is never longer than five words and changes with the beast: "GET OUT OF THE
  ORANGE", "DRIVE UP ITS TAIL", "SMASH THE GLOWING BOX", "TWO BOXES LEFT". While it is tired a marker with an arrow and a
  distance points at the foot of the tail, and then at the box. Its three boxes are three battery pictures at the top of
  the screen; the driver's scorches are the health bar. On Easy it stays tired the first time for up to 45 seconds or
  until the first box is smashed, so the first lesson cannot be missed. A try that fails says why: "It got up before you
  reached the box, so go the moment it sags."
- **Losing:** too many scorches (five on Easy, four on Medium, three on Hard), or it has tired six times (five on Medium
  and Hard) without losing its three boxes and walks out through the Car Park Gate.
- **The ending:** it falls, the flame jets go off together, and the result card waits until the truck is standing on it
  or 12 seconds have passed.

### 11. What makes each night different

Every night has a name, one new thing, a headline event that the other nights do not have, a rival and a look of its own
(the colour of the flame jets and the banners, and what stands on the floor). A night lasts five to seven minutes.

| Night | New tonight | Events |
| --- | --- | --- |
| **1. Rookie Night** | wheelie, donut, backflip | Car Crush (60 seconds) · Freestyle against Old Bess's score · Side by Side with Old Bess |
| **2. Flip Night** | front flip, stoppie | **Long Jump** · Freestyle against Rust Rhino's score · Side by Side with Rust Rhino |
| **3. Hammer Night** | the spin; the hammer | Car Crush with the Bus Pile doubled · Freestyle against Tin Lizard's score · Last Truck Rolling with hammers |
| **4. Over the Wall Night** | barrel roll; the saw | **High Jump** · **Home Run** · Last Truck Rolling with a hammer or a saw |
| **5. Scrapasaurus Night** | side flip, doubles; the launcher | Freestyle against Dragon Wagon's score · Last Truck Rolling with any weapon · the Scrapasaurus |

Three new events, each three goes with the truck put back on its run-up after each:

- **Long Jump:** a row of buses stands broadside beyond the Big Jump, the first 20 m past its crest and one every 3 m. How
  many does the truck clear? Easy needs 4, Medium 7, Hard 9. Landing on a bus crushes it and does not count it.
- **High Jump:** a bar of flame between two posts over the Big Jump, at 6 m on Easy, 9 m on Medium and 12 m on Hard (the
  truck reaches 10 m at full speed and 15 m with nitro). Pass over it. The bar goes up a metre after each clear go for
  extra points.
- **Home Run:** jump out of the arena and land on a target painted on an empty section of the stands, then come back in
  through a gate inside 30 seconds for the next go. Easy needs one go over the wall, Medium one landing on the target,
  Hard one in its middle ring.

**More nights, at Titan Stadium.** Nights 6 to 8 are a tour, after the first release:

- **Night 6, Race Night** and **night 7, Stunt Night** are held at Titan Stadium, the Titan Monster Arena course that is
  already in the game: a lap of 1,120 m, about four times the Bowl's. Its events are the ones a long lap suits: a
  **Stadium Race** of two laps against three named rivals at once, a **Stunt Trial** of its jumps and crushes against the
  clock (the existing Titan Stunt Trial's rules, scored with the trick set), and a Long Jump at its largest ramp.
- **Night 8, Champions' Night,** is back at the Bowl: Freestyle with the fallen Scrapasaurus lying on the floor as a
  ramp, Last Truck Rolling with five trucks, and a Side by Side final with Dragon Wagon, best of three.

**For Kyle's word:** "the larger Titan arena that already exists" is read here as the Titan Monster Arena course. If Kyle
meant the Bowl as enlarged on 19 November, nights 6 and 7 move to the Bowl with other floor layouts. Card BOWL-TOUR waits
for the answer; nothing else does.

### Slices

Each is a card on the board with its files, locks, checks and sound cues. Nights 1 to 5 are the first release; BOWL-TOUR
follows it.

| Card | Owner | What it builds | Section |
| --- | --- | --- | --- |
| BOWL-WALLS | Codex | walls that bounce; no wear outside a fight | 7, 8 |
| BOWL-TRICKS | Codex | the trick rules, scores, landings and the balance tool | 2 |
| BOWL-HUD | Codex | the slim strip, pop-ups, the trick card, the health picture, the arena plan, Big Mo's timing | 2, 5, 7 |
| BOWL-CAMERA | Claude | the show camera and the end of each event | 5 |
| BOWL-TRICK-SCHOOL | Codex | Trick School, tonight's trick, why a try failed | 2 |
| BOWL-CRUSH | Codex | Car Crush as a 60 second count | 1 |
| BOWL-SOUND-CRUSH | Claude | the crush sounds | 4 |
| BOWL-OUT-SIM | Codex | stands as ground, the car park, the two gates, the way back | 3 |
| BOWL-OUT-LOOK | Claude | the crowd scattering, tunnels, car park and tyre walls drawn | 3, 8 |
| BOWL-RIVALS-2 | Codex | rival pace, Side by Side twice round, rivals' scores | 2, 6 |
| BOWL-WEAPONS | Codex | hammer, saw and launcher as rules; health as the one measure | 7, 9 |
| BOWL-WEAPONS-LOOK | Claude | the weapons, rivals' bolt-ons and damage drawn | 7, 9 |
| BOWL-REX-2 | Codex | the Scrapasaurus fight remade | 10 |
| BOWL-REX-LOOK | Claude | the tired pose, the tail ramp, the beams and the fire drawn | 10 |
| BOWL-JUMP-EVENTS | Codex | Long Jump, High Jump, Home Run | 11 |
| BOWL-NIGHTS | Codex | the season of five nights as data, the picker, saved records | 11 |
| BOWL-SOUND | Claude | every other new cue chosen and listened to | all |
| BOWL-TOUR | Codex, after Kyle's word | nights 6 to 8 | 11 |

Words on screen and Big Mo's lines: the builder writes each new line as one full plain sentence
(`memory/dialogue-plain-prose`), and Claude reads every line during the closing drive.
