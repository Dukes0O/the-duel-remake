# Everburn play, round 8: the notice board, job 5's start, and the mirror

Sheet: `round-8.jpg` (eight pictures, 1280 by 720 drawn small, from the real game in a browser on the QA page with memory-only saves, Medium).
Taken 13 November 2026 on the go-live branch by a Sonnet helper for Claude. The QA page's own test panels were hidden for the pictures; nothing else was changed.

## What the pictures show

1. **Lost Prospector, just after Take job.** The car stands on open ground by the Boneyard at (543, 192), facing the first prospector. The small map now draws the two prospectors and Tin Town (it said only "CURRENT POSITION", twice, over itself, before).
2. **Survey Flags, just after Take job.** Same start. The small map draws the five flags by name.
3. **Hot Soup, just after Take job.** The car stands on open ground 9 m east of Auntie's kitchen, at the town's edge, facing the first safe point to the south. The objective bar reads "Carry Auntie's hot soup from her kitchen to the diggers at the Everburn well." and the small map draws the road from AUNTIE KITCHEN to EVERBURN. Plank debris from the shack groups lies round the car.
4. **Hot Soup halfway**, on the safe road 19 s in. The road round the town's south side and then across the flats is 1,148 m.
5. **Job 5, new start.** The car stands on the road 124 m short of the Dead Mall (the tan block ahead), past the pair of junk cars that lie on the road. They are behind it now, not 9 m in front.
6. **Job 6, the first second.** The job's heading, then the wave and well bars under it on the left, the mirror clear, Cinder's caption under the mirror. The bars used to be drawn on the mirror.
7. **Job 2, the first second.** "HOLD F TO GET OUT" stands to the right of the mirror, level with its top. It used to straddle the mirror's top edge.
8. **Hot Soup arriving at the Everburn well**, 48 s in: the derrick and flame, a parked truck and the diggers' camp ahead, the small map's dot at the end of the road.

## Honest notes

- Hot Soup takes 49 s clean on Medium with the child-pace script (52 mph on the open flats, slower at each safe point), and pays the same 96 scrap as the others. It is now a real drive across the Scablands, and it is on the board for ever like the other two.
- The soup cannot be spilled by driving badly. The job's spill rule reads a crash size from the game (`state.lastCrashSize`), and nothing in the game ever sets it, so a hard crash into a shack group only stops the car. (Job 1's pot has the same rule and the same gap.) When the game was told of a large crash by hand, the rule worked as written: Auntie said "That was my good soup! Come back..." and the progress along the marked way was kept. The job did not fail. Connecting real crashes to the rule is a design and balance call for Job 1 as well, so it was left alone.
- The three notice-board jobs never get a tick: the board offers them again whenever the player is in the yard, and each pays the one world-job amount every time (96 scrap on Medium). The save has no field for them, and none was added. If the board should show them done, or pay once, that is a design call and a new save field.
- Hot Soup, Lost Prospector and Survey Flags have no opening lines (the definitions carry none), so their captions stay empty: the objective bar and the map carry them. No line was written. Leaving a job from the pause screen (BACK TO THE YARD) leaves the pause screen up with the job already ended; pressing BACK TO THE YARD again goes to the yard. That is true of every world job and was not changed.
- The job's own result line is the plain one ("Lost Prospector is done. You made it back to the yard.").
