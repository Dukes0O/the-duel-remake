# BOWL-NIGHT-4

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol** (one event's rules, lines and removals). Kyle, 20 November 2026: graphics and physics go to Astra,
the rest to Sol.

Night 4 without the leap: Barrel Roll Night, with Best Trick in place of Home Run, and no line anywhere that points the
driver over the wall. Design: [BOWL-SHOW-2](BOWL-SHOW-2.md), sections 3, 9 and 11.

## Kyle's word (20 November 2026)

On seeing Night 4 "Over the Wall Night" ("Jump the wall or fight with a saw") and the Home Run event: "being able to fly
into the stands was supposed to be something that was a funny glitch that the player would uncover, it's not supposed to
be the objective of a round! that makes it way less funny." The rule is in `docs/board/decisions.md` under that date:
nothing points the player at leaving the arena. The stands stay drivable and the gates stay. Once a player has got out
without being told, the game may react.

## What to build

1. **Night 4 in `src/bowl/bowl-show.js`:** the name is `'Barrel Roll Night'`, `newTonight` is `'Land a barrel roll and
   fight with a saw.'`, the events are High Jump, Best Trick and Last Truck Rolling, and the night's `dressing` keeps
   High Jump's only. `BOWL_EVENTS.HOME_RUN` goes and `BEST_TRICK: 'bestTrick'` takes its place.
2. **Best Trick,** in `src/bowl/bowl-jump-events.js`, on the go rules that Long Jump and High Jump use (the same run-up,
   three goes, the one second fade, twelve seconds a go). It needs nothing standing on the floor.
   - **A round is a go.** Before the go the board shows Big Kettle's trick for that round and its points. When the truck
     has landed, the go's result is the sum of the points that the go's `bowlTrick` facts scored (as `addFact` scores
     them, with the crowd, NEW, the repeat rule and tonight's doubled trick). The jump's own points and any other fact
     go on the event's score as they do today and are not part of the result.
   - **The driver takes the round** when the result is more than Big Kettle's points, or, when Big Kettle's points are
     0, when the driver landed at least one trick. Two rounds of the three win the event. The event ends after the third
     go, and not sooner, so that every go is played.
   - **Big Kettle's tricks** are data, by level and round, with the trick's name and the trick table's plain points:

     | | Round 1 | Round 2 | Round 3 |
     | --- | --- | --- | --- |
     | Easy | lands on its roof: 0 | backflip: 50 | barrel roll: 60 |
     | Medium | backflip: 50 | barrel roll: 60 | backflip with a spin: 120 |
     | Hard | backflip with a spin: 120 | double backflip: 200 | double barrel roll: 240 |

     These are starting numbers. The list of steps, from least to most, is on BOWL-SHOW-2 section 11. Raise all three of
     Easy's rounds one step while the scripted child-pace driver of check 1 wins all ten seeds, and lower them one step
     if that driver wins fewer than six. Report the ten results.
   - **The event's score** is the best go's whole score, as Long Jump's is. The record is kept under a new key,
     `best-trick`, added beside the others.
   - **In a Turn Show** the event is one go, the go's whole score goes on the board, and Big Kettle takes no part.
   - **A go that lands in the stands** is closed like any other and the truck is put back on its run-up.
3. **Words on screen,** each one full plain sentence (`memory/dialogue-plain-prose`), in `src/bowl/bowl-lines.js`:
   - the event's name: "Best Trick";
   - the goal line, eight words or fewer: "Beat Big Kettle's backflip." (the trick's name by round), and "Land any trick
     to win this round." when Big Kettle landed on its roof;
   - the strip during a go: the round, Big Kettle's trick and points, and the rounds won by each ("ROUND 2 OF 3", "BIG
     KETTLE: BARREL ROLL 60", "YOU 1, BIG KETTLE 0");
   - Big Mo's opening: "This is Best Trick. Big Kettle jumps first in every round, and you take the round by landing a
     bigger trick off the Big Jump.";
   - Big Mo, when Big Kettle lands on its roof: "Big Kettle landed on its roof, so any trick you land wins this round.";
   - won: "Our driver landed the bigger tricks, so Best Trick goes to our driver!";
   - lost: "Big Kettle landed the bigger tricks this time, so try a trick you have not done yet.";
   - the result card: "You won 2 of the 3 rounds against Big Kettle." (the count by what happened);
   - why a round was lost, once a go, from what the truck did: "The same trick again pays less, so try a different
     one." when the go's trick was the kind landed in the go before; "You landed no trick, so tap a key as soon as the
     truck leaves the ramp." when nothing was tried; the trick rules' own reasons otherwise.
4. **Lines that pointed over the wall, reworded:**
   - the launcher's line in `src/bowl/bowl-weapons.js`: "Throws a truck high into the air. An empty shot hops your own
     truck." The rule that a truck thrown over the wall is out stays;
   - Big Mo's `outside.gate`, said the first time the driver's truck goes over the wall: "How did that truck get up
     there? Follow the gate marker to get back in!";
   - `docs/WASTELAND_WORLD.md` section 7: the nights' table and the paragraph on the jump events, brought up to date.
5. **Events:** `bowlGo {event: 'bestTrick', go, result}` as the other jump events send it, and
   `bowlRound {round, rival: {trick, points}, points, won}` when a round is decided.

## Removed by this card

Name each of these on the change note's **Removed** line.

- **Home Run:** its branches in `src/bowl/bowl-jump-events.js` (`HOME_RUN`, `GATE_SECONDS`, `ringPoints`, the angled
  run-up in `approach`, the ring scoring in `flightLanded`, the gate return in `stepGo` and `observe`, the
  `scoresFact` option) and the `scoresFact` lookup in `addFact` in `src/bowl/bowl-night.js`, which no other event uses.
  Points for going over the wall are then paid in every event, as BOWL-OUT-SIM made them.
- **Its floor data and drawing:** `dressHomeRun` and its entry in `src/bowl/bowl-crush-field.js`; `homeRings` and its
  call in `src/bowl/bowl-view.js`; the seats left empty round the target in `src/bowl/bowl-stadium.js` (the `target`
  and `clearRadius` lines near line 186), so that the crowd fills that section again.
- **Its words:** `homeRun` in `BOWL_EVENT_NAMES` and `BOWL_GOALS`, `event.homeRun.intro`, `event.won.homeRun`,
  `event.lost.homeRun` and the ring sentences in `eventJump`, all in `src/bowl/bowl-lines.js`.
- **Its cues:** `bowl.home.ring` and `bowl.home.ring.high` in `BOWL_SOUND_CUES`.
- **Not removed: the saved Home Run record.** BOWL-NIGHTS keeps each driver's Home Run best under `home-run`. It stays
  in `BOWL_EVENTS` of `src/bowl/bowl-save.js`, so that a save holding it loads and saves with it unchanged: nothing is
  wiped, renamed or moved across. `best-trick` is added to that list beside it. Only `SAVE_EVENT_IDS` in
  `src/bowl/bowl-night.js` loses `homeRun`, since no event sends it now. A record that is no longer shown is harmless.
- **The name "Over the Wall Night"** and the line "Jump the wall or fight with a saw."

## Older suites that name what changes

Bring each up to date in this card. Search `tools/` for `homeRun`, `home-run`, `Home Run`, `HOME_RUN`, `bowl.home`,
`Over the Wall` and `Jump the wall` before CARD DONE; the list below is what a search found on 20 November.

- `tools/test-bowl-jump-events.mjs` (lines 10 to 18, 65, 149 to 195): the Home Run cases go with the event. Each thing
  they proved about goes (three goes are played, the reset and its fade, the cue names, a go that runs out of time)
  is proved for Best Trick in their place.
- `tools/test-bowl-show.mjs` (line 58): Night 4's name and line-up.
- `tools/test-bowl-turns.mjs` (lines 131, 330 and 338): Best Trick as one go in a Turn Show, with no gate to follow.
- `tools/test-bowl-save.mjs` (lines 116 to 127) and `tools/test-bowl-night.mjs` (line 86): the Home Run record cases
  stay and still pass (the key is kept); a `best-trick` case is added beside them.
- `tools/test-bowl-camera.mjs` ("over the wall and back") stays as it is. It proves that the camera follows a truck
  that leaves, which a truck still may.
- No file under `tools/scenarios/` names Home Run or Night 4's name.

## Files and locks

`src/bowl/bowl-show.js`, `src/bowl/bowl-jump-events.js`, `src/bowl/bowl-crush-field.js`, `src/bowl/bowl-view.js`,
`src/bowl/bowl-stadium.js`, `src/bowl/bowl-lines.js`, `src/bowl/bowl-night.js`, `src/bowl/bowl-save.js`,
`src/bowl/bowl-weapons.js`, `src/bowl/bowl-hud.js` (the strip's round line, if the strip needs it),
`docs/WASTELAND_WORLD.md`, and the five suites above. Locks: `bowl-night`, `save-shape`.

## Checks

1. `tools/test-bowl-jump-events.mjs`: a scripted child-pace driver who taps a different single trick on each go wins
   Best Trick on Easy at least 6 times in 10 and not on all ten; a driver who lands no trick wins no round on any
   level; a driver who lands the same single flip on all three goes loses Medium, and one who lands three different
   single tricks, the barrel roll among them, wins it; a driver who lands only single tricks loses Hard, and one who
   lands a barrel roll and a double wins it; all three goes are played even when the first two are won.
2. `tools/test-bowl-show.mjs`: Night 4's name and line-up, and no night name, `newTonight` line, event name, goal line
   or weapon line contains "wall" or "stands".
3. `tools/test-bowl-turns.mjs` (one go, a score, the turn phase), `tools/test-bowl-save.mjs` and
   `tools/test-bowl-night.mjs` (the `best-trick` record is kept when better and left alone when not; a save that
   holds a `home-run` score loads, saves and reloads with that score unchanged).
4. Laptop only, Claude runs: Best Trick by hand once on Easy and once on Medium; one trip over the wall in Freestyle to
   hear Big Mo's new line and follow the arrow home.

## Sound cues

`bowl.best.rival` (Big Kettle's trick goes up on the board: a steam whistle; stand-in `world.furnace.horn`),
`bowl.best.rival.slam` (Big Kettle lands on its roof: a crash and the crowd's groan; stand-in `vehicle.crash`),
`bowl.best.round.won` (the driver takes a round; stand-in `interface.bonus`), `bowl.best.round.lost` (Big Kettle takes
it; stand-in `interface.lose`). `bowl.go.ready` is kept for the truck going back on its run-up.

## Claude answers: the changed assertions (rule 18, 20 November 2026)

Approved before the build, on these terms. The Home Run assertions are removed because Kyle removed the event they
checked. Night 4's name and line-up, the Turn Show's third jump event and the record key each change to the new name
and check what they checked before. Nothing is loosened as long as every go rule that a Home Run case proved has a Best
Trick case (check 1 lists them), and the save suite still proves that a record is kept only when it is better and that
a Home Run record already saved survives. A change
beyond these comes back to Claude before the merge.

## How it merges

Behind `titan-bowl`, so rule 23's small set: this card's five suites, the core suite, the three guards and
`npm run build`, recorded in `docs/changes/BOWL-NIGHT-4.md` with the Removed line. Because a saved key is added,
`tools/test-bowl-save.mjs` runs before the merge and the save checker reviews the change to `BOWL_EVENTS` (rule 23's
exception for saves), as BOWL-SHOW-2 says for every slice that touches the save. No Chrome under `codex exec`: check 4 is "Claude runs". Memory-only saves. No
new dependency, network request or key. Clean up nothing outside this lane.

## Build decisions and narrow questions, 20 November

Best Trick will share the straight run-up, twelve-second go and one-second reset with the other jumps. The round reads the actual trick points reported by the existing scorer, including tonight's barrel-roll bonus. It compares those points with Big Kettle's table. Turn Show ranks the whole go score with no Big Kettle round. Start from the stated Easy numbers and tune with real taps.

May this card adjust one condition in `src/bowl/bowl-screens.js`? The generic jump label currently overwrites the strip's round line. The change would let Best Trick own that label while keeping the other go labels.

A memory-only `loadPlayers` write/read confirmed that the raw version-one profile currently retains `home-run`. The Bowl scorer drops unknown keys on a later write. May this card add a small load hook in `src/progression.js` to omit only the retired key from a supported Bowl record? It would preserve every other key, every other profile field and newer Bowl versions, with no write on load. The save checker would verify it. AGENTS rule 23 says saved changes keep the lane tier. I will use that gate for the updated key unless the rule changes.
