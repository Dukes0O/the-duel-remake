# BOWL-TRICKS-ALL

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Astra** (physics and graphics: how a vehicle turns in the air and lands, and every vehicle drawn doing it). Kyle, 20 November 2026: graphics and physics go to Astra, the rest to Sol.

The trick card Astra holds, in three parts, built in this order: **1.** flips that finish themselves, so that a child
lands them; **2.** seven secret tricks; **3.** the trick set for every vehicle, and on the Titan Monster Arena. Kyle, 20
November 2026, on the first two: they "must go to the bowl-tricks card", the one Astra is working on, and not to cards
of their own. Design: [BOWL-SHOW-2](BOWL-SHOW-2.md), section 2 ("Flips that finish themselves", "Secret tricks", "Every
vehicle"). Parts 1 and 2 are behind `titan-bowl`; part 3 is behind `arena-tricks`. One hand-over, with all three parts.

## Part 1: flips that finish themselves

Kyle wants a child to land flips and feel great about it, with doubles worth far more.

**Measured on the built rules (hand drives, Night 1 Freestyle on Easy):** a clean single front flip took five tries. W
had to be held for about 1.18 seconds, give or take 0.15; holds of 0.85, 1.0, 1.4 and 1.5 seconds slammed. A driver who
let go of W over the lip and pressed it again tipped the nose down and slammed, on 2 of 4 jumps over the wall, for 150
points in place of about 415 and a 1.5 second stop. The cause: `air()` in `src/bowl/bowl-tricks.js` turns the truck only
while the key is down, counts a turn only when it is complete, and `landBowlTricks` wants the landing within 45 degrees.

The air rules in `src/bowl/bowl-tricks.js`, from seed and inputs alone. The ground tricks, the points, the combos, the
variety rule and the crowd are unchanged.

1. **A tap is a whole turn.** A fresh press in the air of W, S, Left or Right (or Space with Left or Right for a roll)
   starts one whole turn of that kind. The truck finishes it at a steady rate and stops level, whether the key is held
   or not. A key still down at the step a turn ends starts the next turn of that kind. A fresh press made during a turn
   of the same axis is remembered (the latest one only) and starts when that turn ends, ahead of a held key; so a tap of
   W and then a tap of S is a front flip followed by a backflip in one jump, paid as two kinds. Kyle, 20 November 2026,
   on that pair: "totally impossible physics but amazing." It is on the Keep list in `docs/board/decisions.md`; do not
   remove it. A flip and a spin, or a flip and a roll, may run together as now.
   Whether a roll is a barrel roll or a side flip is fixed when the roll starts, by the nose's angle from the line of
   flight at that step (more than 45 degrees: a side flip).
2. **Kept:** a key held from before take-off does nothing until it is let go and pressed again, and a steering key held
   from the lip keeps steering (`carriedSteer`).
3. **Turn times:** a flip 0.8 seconds, every turn (the first is 1.0 today); a spin 0.9; a roll 1.0.
4. **Air left,** each step: `t = (v + sqrt(v * v + 36 * h)) / 18`, where `h` is the truck's height above the ground
   under it (`airHeight`) and `v` its upward speed (`_verticalSpeed`), with the flight's gravity of 18. Read these; do
   not change the flight. It is an estimate where the ground ahead is not level, and rule 6 covers the difference.
5. **Level by level** (the night's level, `bowlNight.cpuDifficulty`, or the driver's own outside a night):
   - **Easy and Medium:** a turn starts only when the air left is at least three quarters of its plain time (0.6 seconds
     for a flip, 0.68 for a spin, 0.75 for a roll). When the air left is under its plain time the turn is made in the
     air left; otherwise in its plain time. A press that is refused turns nothing and emits `bowlTrickLate` once a jump,
     with the kind asked for. The next turn of a held key is decided by the same rule when the turn before it ends.
   - **Hard:** every turn asked for starts, at its plain time.
6. **Landing:** a turn within 60 degrees of complete at touchdown counts as complete on Easy and Medium, 45 degrees on
   Hard, and the pose eases level over 0.2 seconds. A spin short of that is a slide, as now (speed halves over a second,
   half pay). A flip or roll short of that is a Slam.
   - **Medium and Hard:** as now (the jump pays nothing, the crowd loses a third, 1.5 seconds).
   - **Easy:** the turns already finished in that jump pay in full, the crowd meter is not cut, and the truck is on its
     wheels in 1 second. The cue is still `bowl.trick.slam`.
7. **Easy's old levelling** (a truck within 30 degrees eases level when the keys are let go) goes: rule 1 replaces it.
8. **The screen:** the pop-up "NOT ENOUGH AIR" over the truck on `bowlTrickLate` (BOWL-HUD's pop-up), and the key lines
   of the five air tricks on the trick card as section 2's table now has them ("tap W; keep it held for another turn").
9. **Run `tools/bowl-freestyle-balance.mjs`** with the new rules and put its three numbers in the change note. Change no
   target here: the rivals' scores are BOWL-RIVALS-2's.

## Part 2: secret tricks

Seven secret tricks that a driver uncovers. Design: [BOWL-SHOW-2](BOWL-SHOW-2.md), section 2, "Secret tricks". Kyle, 20
November 2026: "one of the funny bugs in the jumps was that you could do a forward flip then backwards flip in the air.
totally impossible physics but amazing. We could honestly build in some super crazy spin flips with key combos... just
a bunch of mystery combos to uncover."

On top of part 1's air rules (a tap is a whole turn), from seed and inputs alone.

1. **The codes** as data in `src/bowl/bowl-secrets.js`: id, name, the keys in order, the points, the plain time, and the
   pose as a function of the share of the trick done (0 to 1) that ends level. The seven tricks, their codes and their
   points are the table in the design. Up, Down, Left and Right are the game's own throttle, brake and steering inputs,
   so W, S, A, D and the arrow keys both work.
2. **Reading a code in the air:** keep the fresh presses of this flight in order, with the time of each. A press more
   than 0.4 seconds after the one before starts the list again. When the end of the list matches a code, the secret
   trick starts at that step: the turn under way is dropped unpaid, the turns already finished stay banked, and no other
   turn starts until the secret trick is done. The longest matching code wins. Until a code matches, every tap does what
   part 1 says it does.
3. **Its time:** 1.0 second, or as little as 0.75 when the air left is short, by part 1's rule and formula. On
   Easy and Medium a code with less than 0.75 seconds of air left does nothing and emits `bowlTrickLate`. On Hard it
   starts regardless. The landing rules are part 1's, with the trick counted when it is within the window of done.
4. **The Yo-Yo** has no code: a front flip and a backflip both finished in one jump, in either order, add the Yo-Yo
   (100 points) to that landing's tricks. Kyle's bug, kept.
5. **The Full Works** is entered on the ground: under 5 mph, the eight presses each within 0.6 seconds of the one
   before. The truck is then armed for this event (`bowlSecretArmed`), once an event, and its next flight with at least
   0.9 seconds of air left at the first step in the air is the Full Works (1.2 seconds, or as little as 0.9).
6. **Poses and points only.** Nothing here changes the truck's flight, speed or place. A secret trick emits `bowlTrick`
   with its own kind, so the pop-up, the crowd, the first-time bonus and the variety rule treat it as any other trick.
7. **Found tricks are kept** with the driver's Bowl records: a new optional list in `src/bowl/bowl-save.js`; a save
   without it reads as none found, and nothing else in the save changes. The first landing ever of each emits
   `bowlSecretFound`, fills the crowd meter, and shows "SECRET TRICK FOUND" with the trick's name.
8. **The trick card** (H) ends with seven rows: question marks for a trick not found; name, picture and code for one
   found; and the count "SECRET TRICKS: 2 of 7".
9. **One hint a night:** the night's result card shows one code the driver has not found with one key hidden ("Up Up ?
   Down"), chosen from the night's seed. With all seven found it says so.
10. **Big Mo:** one full plain sentence for a truck that has been armed, one for each first find, and one for all seven
    (`memory/dialogue-plain-prose`).

Not here: the banner in the crowd that carries the hint (BOWL-OUT-LOOK reads the same hint from state), and the Monster
Arena (part 3 carries whatever rules the Bowl has).

## Part 3: every vehicle, and the Titan Monster Arena

The trick set for every vehicle, and on the Titan Monster Arena. Design: [BOWL-SHOW-2](BOWL-SHOW-2.md), section 2, "Every
vehicle". Kyle, 20 November 2026: "the freestyle mechanics should be enabled for all vehicles that can play in the
Monster Arena."

**What is true today:** any unlocked car can enter the Monster Arena (`src/screen-menu.js`: "Any unlocked car can enter";
the Titan is recommended because lighter cars cannot crush wrecks). The Bowl's air control answers only to the show's
truck on the Bowl.

1. **Every vehicle.** The trick rules of BOWL-TRICKS, as parts 1 and 2 leave them (a tap is a whole turn; the secret tricks), work for whichever vehicle is driving. The keys, the turning speeds,
   the landings and the points are the same for all. A vehicle's own weight and power decide its air, and a car too
   light to crush still cannot crush (that rule is unchanged). Which vehicles: every one the menu lets a driver start the
   Monster Arena in, by that rule and not by a list, so that a new vehicle has the tricks on the day it is added.
2. **On the Titan Monster Arena** (`titan-arena`), whenever it is played: the course's own data says tricks are on
   (`tricks: true`), as the Bowl's does. In a race there the tricks are a show beside the race: they are named, scored and
   cheered, and they do not change who wins. The trick score is shown at the finish beside the result.
3. **The driver sees it:** BOWL-HUD's pop-ups and its trick card (H, paused) work there, with the crowd meter. The race's
   own screen is otherwise unchanged.
4. **Each vehicle drawn doing it:** the view tips, rolls and turns whichever vehicle is driving from the same pose the
   rules keep. Say in the change note which vehicles were looked at, and list any whose model draws wrongly on its back
   wheels or upside down, for Claude.
5. **Behind a switch of its own,** `arena-tricks` (dev) in `src/feature-flags.js`, because the Monster Arena is a released
   course and the Bowl is not. With the switch off, a race at the Monster Arena is exactly as it is today.
6. **The roof:** on a course where a roof landing wrecks a car today, a Slam with tricks on rights the vehicle in 1.5
   seconds as on the Bowl. Say in the change note what a roof landing did at the Monster Arena before.

Not in this card: the Titan Stunt Trial and the Freestyle Playground. Kyle named the Monster Arena; either can take the
same line of course data later.

## Files and locks

`src/bowl/bowl-tricks.js`, `src/bowl/bowl-secrets.js` (new), `src/bowl/bowl-lines.js` (cue names and Big Mo's lines),
`src/bowl/bowl-hud.js` (the pop-ups, the five key lines, the seven secret rows, the hint), `src/bowl/bowl-save.js` (the
found tricks), the Monster Arena's course data in `src/config.js` (one field), `src/feature-flags.js` (one line), the
trick call in `src/sim-driving.js`, the vehicle's pose where a car is drawn (`src/bowl/bowl-view.js` hands it over to
the game's own car view; one hook), `tools/test-bowl-tricks.mjs`, `tools/test-bowl-secrets.mjs` (new),
`tools/test-bowl-save.mjs`, `tools/test-feature-flags.mjs`, `tools/bowl-freestyle-balance.mjs` only if it scripts held
keys. `src/bowl/bowl-show.js` is not changed. Locks: `bowl-night`, `replay-fixtures`, `save-shape`. If the hook for
the pose must be in `src/render3d.js`, take `busy-game-files` too and say so. BOWL-TRICK-SCHOOL waits for this card.

## Checks

### Part 1

1. **A child lands it** (`tools/test-bowl-tricks.mjs`, on the real floor, on Easy, ten seeded tries each off the Table
   and off the Big Jump). The scripted child-pace driver holds W along the run-up, lets go of W between 0 and 0.3 seconds
   after the lip, taps S between 0.2 and 0.7 seconds after the lip and keeps S down for between 0.05 and 1.5 seconds.
   At least 8 tries in 10 on each jump land a clean backflip (a single or more), and none is a Slam. Report the same
   count off a kicker at full speed in the change note; it is not a pass mark.
2. **A child's habit** (same suite, Easy and Medium, ten seeded tries off the Big Jump and ten over the wall): the driver
   lets go of W at the lip, presses it again between 0.1 and 0.8 seconds later and holds it to the ground. No try is a
   Slam; each is a clean front flip or a plain jump. A driver who holds W from the run-up to the landing gets a plain
   jump with its own points.
3. **The rest of the rules:** a tap of one step gives a whole turn; a tap of W and then a tap of S off the Big Jump
   gives a front flip and then a backflip, both paid; a key held on gives a double off the Big Jump and no
   double off a kicker; a refused press emits `bowlTrickLate` once; on Hard a key held to the ground off a kicker is a
   Slam; a landing 55 degrees short counts on Easy and slams on Hard; an Easy Slam pays the finished turns. Every
   assertion of the suite that changes (the held-key turns, "a completed flip survives a reversal", the Big Jump's
   pinned points) is listed in the change note for Claude's review (rule 18).

Laptop only, Claude runs: Night 1 Freestyle by hand on Easy, ten flips, and the over-the-wall jump four times.

### Part 2

1. `tools/test-bowl-secrets.mjs`, on the real floor: each of the six codes, tapped at four presses a second off the Big
   Jump on Easy, gives its trick, its points and a level landing; the same taps off a kicker give no secret trick and no
   Slam; a tap of W and then S off the Big Jump gives a front flip, a backflip and the Yo-Yo; the Full Works arms once
   an event and plays on the next big jump; a secret trick leaves the flight's length, height and landing place exactly
   as they are without it.
2. `tools/test-bowl-save.mjs` with the new list, reviewed by the save checker (rule 6): an old save loads with none
   found and is otherwise unchanged; a found trick survives a save and a load.
3. A scripted child-pace driver who taps Up Up Down Down with seeded gaps between 0.15 and 0.35 seconds, starting
   between 0.1 and 0.4 seconds after the Big Jump's lip, lands the Corkscrew at least 8 times in 10 on Easy.

Laptop only, Claude runs: each secret trick by hand on Night 1's Freestyle, with a picture of each for the trick card.

### Part 3

1. `tools/test-bowl-tricks.mjs`: on the Monster Arena with the switch on, a light road car, the rally car and the Titan
   each land a wheelie, a donut, a spin and a backflip by scripted keys, named with the table's points; a race's winner
   and times are the same with and without tricks done by a driver who loses no speed to them.
2. With the switch off, the replay fingerprints of `titan-arena` are unchanged. With it on, any pinned replay that moves
   is re-recorded with a one-line reason each in the change note (W and S in the air now tip the vehicle and do not
   change its speed).
3. Laptop only, Claude runs: a race at the Monster Arena by hand in three vehicles, with a look at each one's wheelie and
   flip.

## Sound cues

**Part 1:** `bowl.trick.go` (a turn starts: a short rush of air, so that a tap is heard to have counted; stand-in: name only) and `bowl.trick.late` (a press with too little air left; stand-in `interface.radar`). Kept: `bowl.trick.land`, `bowl.trick.new`, `bowl.trick.slam`.

**Part 2:** `bowl.secret.start` (the secret trick begins: a rising whirr; stand-in `weapon.tesla.pulse`), `bowl.secret.found` (the first find ever; stand-in `interface.win` with `crowd.cheer`), `bowl.secret.armed` (the Full Works is entered: the truck's horn and a crackle; stand-in `world.furnace.horn`), `bowl.secret.hint` (the hint on the result card; stand-in `interface.radar`). A landed secret trick plays `bowl.trick.land` as any trick does.

**Part 3:** None new: the events are BOWL-TRICKS's (`bowl.trick.land`, `bowl.trick.new`, `bowl.trick.slam`, `bowl.trick.wheelie`, `bowl.trick.cyclone`), played at the Monster Arena as on the Bowl, with `bowl.crowd.rise` for its crowd.

Builder's checks, then the lane tier and `npm run build`, recorded in `docs/changes/BOWL-TRICKS-ALL.md` with a Removed
line (the held-key turning and Easy's old levelling). Before CARD DONE, search `tools/` for `bowlTrick`, `frontFlip`,
`backflip`, `bowlPose`, `bowl-save`, `titan-arena` and `SHOW_TRUCK` and bring each older suite and scenario that names
them up to date. No Chrome under `codex exec`: any browser scenario is "Claude runs". Memory-only saves. No new
dependency, network request or key. Clean up nothing outside this lane.

## Result screen hook for Claude

The Monster Arena race uses the ordinary result card in `src/screen-results.js`. Its result metrics are assembled there. Please grant a read-only hook in `createResultsScreen` to show the trick score alongside the time and finishing position when arena tricks are active. The ordinary race result still decides the winner and the payout. This card is queued behind BOWL-HUD.

## Claude answers, the result screen hook (20 November 2026)

**Granted:** a read-only hook in `createResultsScreen` (`src/screen-results.js`) that shows the trick score beside the time
and the finishing place when arena tricks are on. The ordinary race result still decides the winner and the pay; with the
switch off the card is exactly as before. Build it after BOWL-HUD merges, as queued.

## Reusing the HUD trick card

The HUD build at `37b242354` puts the H key listener, the trick card's completed moves and the per-frame HUD call in `src/bowl/bowl-screens.js`. Each currently reads Show Night. Please grant read-only hooks in those three places so a Monster Arena race can call the same trick card and pop-ups using its own trick state. The normal race HUD and result stay in place. The main rendering work stays in the owned `src/bowl/bowl-hud.js`.

## Claude answers, the trick card hooks (20 November 2026)

**Granted:** read-only hooks at the H key listener, the trick card's completed moves and the per-frame HUD call in
`src/bowl/bowl-screens.js`, so a Monster Arena race can show the same card and pop-ups from its own trick state. Show
Night keeps its own state; with `arena-tricks` off, the Monster Arena's screen is exactly as before.

## Saving a first find during play

Please grant two narrow hooks for the new secret tricks. In the Bowl and Monster Arena start paths and event listener in `src/app.js`, pass the active driver's known trick IDs into the race and use the existing guarded profile-save path on a genuine first landing. This keeps a find if the driver quits before the result and keeps Turn Show drivers' finds separate. The simulation receives a copy and never touches storage. For Show Night, permit `startBowlNight` and `observeBowlNight` in `src/bowl/bowl-night.js` to carry that list, award the full crowd on a first find, keep the crowd on an Easy Slam and pass late/armed/found events to the existing display and announcer. The purse and the scoring module stay as they are. The Arena reads its own race state. We will test with memory-only profiles, including an older save and two drivers.

The design table lists five airborne codes, the ground-entered Full Works and the uncoded Yo-Yo. The Part 2 check says six codes off the jump. We will prove all seven by their specified inputs, including the ground code before takeoff; please confirm.

## Build decision

Build the three parts in order. A fresh press commits one complete turn using the measured flight time. Keep the seven discoveries per driver, and use the same simulation for every vehicle the Monster Arena admits.

## Claude answers, saving a first find (20 November 2026)

- **Granted:** in `src/app.js`, the Bowl and Monster Arena start paths and event listener pass the active driver's known trick
  ids into the race (a copy; the simulation never touches storage) and save a genuine first landing at once through the
  existing guarded profile save, so a find survives quitting and each Turn Show driver's finds stay apart. In
  `src/bowl/bowl-night.js`, `startBowlNight` and `observeBowlNight` may carry that list, give the full crowd on a first find,
  keep the crowd on an Easy Slam, and pass the late, armed and found events to the existing display and announcer. Purse and
  scores as the design says.
- **Saves:** the known trick ids are a new, optional, per-driver record: it only adds, an old save reads as none found, and a
  newer game's record is left untouched. It gets the save checker's review (rule 17) and a round trip in the save suite.
  `app.js` is shared, so the night after the merge is a full one.
- **Confirmed: seven secrets,** five codes in the air, Full Works entered on the ground before takeoff, and the uncoded
  Yo-Yo; prove each by its own inputs. The design's "six codes off the jump" counts Full Works with the airborne five; seven
  is right.

## Part 1 laptop drive and rule 18 review

The tap controls are playable on `codex/bowl-tricks-all` at `55d557129`. Please try ten Easy flips on Night 1 Freestyle and four jumps over the wall. The builder is checking the two real jumps and the seeded child inputs while work on secret tricks continues.

Please review four replacements in the old trick suite. A fresh tap must finish the full turn after release, replacing a check of how many degrees a held key had rotated by release. A side flip begun during a spin finishes both turns and earns the clean combo. A late Hard press gives a genuine incomplete rotation and Slam. Successive opposite taps must finish and pay both turns; the old reversal check kept only an earlier completed flip. The run still checks exact turn counts, direction, points, real landings and damage, and adds the 55-degree Easy/Hard boundary. The builder will post the measured score on the Big Jump before any replay value is changed. The existing assertions await this written review.

## Matching the Full Works takeoff

Please review the trajectory control in the new seven-secret suite. The original comparison gave ground inputs to the armed driver alone. That driver was already 0.013 m sideways before takeoff. Both drivers will now get the same eight ground presses twice at under 5 mph, each separated by a neutral step, the same seed and run-up, and neutral controls in flight. Only recognition of the ground code is disabled in the control while entering it. Both have normal trick controls before the run-up. Require identical takeoff conditions, identical position along and across the course, height and speed at every airborne step, and the same landing place. Keep the independent proof that the code arms only once.

For the seven first finds, Big Mo says “You found the Yo-Yo!”, “You found the Corkscrew!”, “You found the Tornado!”, “You found the Rocking Horse!”, “You found the Gyro!”, “You found the Tumble Dryer!” and “You found the Full Works!” The armed line is “Something has got into that engine!” The seventh find adds “You have found every secret trick in the show!” The result reads “You found all seven secret tricks.” Please confirm the lines along with the control.

The seven tricks are playable on `codex/bowl-tricks-all` at `492201763`. Please drive Night 1 Freestyle in the memory-only laptop game and capture the seven pictures for the trick card. The five airborne key codes, ground-armed Full Works and uncoded Yo-Yo all land in the builder's real-floor checks. The matched trajectory control and the final discovery wording above are still under review.

Please include the exact feature-switch inventory in the rule 18 review. Its list gains the card's `arena-tricks: dev` entry. Keep the existing release and QA switch checks, and explicitly check that this switch is off in release and on in QA.

The Monster Arena is ready for Claude's three-car drive at `762a7292d` on `codex/bowl-tricks-all`. Please enter through the ordinary race picker, look at the wheelie and flip of the Falcone road car, Dusthawk rally car and Titan, and check that H pauses/resumes the race and the finish shows the trick score beside the result. The focused floor checks landed a backflip, a 360 spin, a wheelie and a donut on each vehicle, and checked the switch off. The Falcone landed the backflip at 95 and 110 mph on the course ramp.

## Claude answers, the control, the lines and the switch (20 November 2026)

- **Rule 18, the Full Works trajectory control: approved.** Both drivers now get the same eight ground presses, the same
  seed and run-up and neutral controls in flight, with only the code's recognition switched off in the control; identical
  takeoff, place, height and speed at every airborne step and the same landing are required, and the separate proof that the
  code arms once stays. That is a fairer and stricter comparison than before.
- **The lines are confirmed** as written: the seven "You found the ...!" lines, "Something has got into that engine!", "You
  have found every secret trick in the show!" and "You found all seven secret tricks."
- **The switch inventory:** adding `arena-tricks: dev` is approved, with the checks that it is off in release and on in QA.
- **The laptop pictures** of the seven secrets and the three-car Monster Arena drive are Claude's, now running; the verdict
  follows here.
