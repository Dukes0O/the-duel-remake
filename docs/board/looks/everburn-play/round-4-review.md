# Everburn play-through, second play (rounds 4 and 5), after EVERBURN-PLAY-FIXES parts A and B

Sheets: `round-4.jpg` (jobs 1 to 6, three pictures each: the first second, a moment in the middle, the results screen, the same moments as round 1) and `round-5.jpg` (job 6's chase, the yard and wall after job 6, the long-road run, a Boneyard-road run and the battle, the same moments as round 2). Compare with `round-1.jpg` and `round-2.jpg`; the first play's findings are in `round-1-review.md`.
Taken 12 November 2026 on branch `c/game-audit-experience-2d694d` at 20a143ebb, by a helper. No file under `src/` or `public/` was changed.

## How it was taken

Exactly as the first play (see `round-1-review.md`): the real game in a browser (QA page, memory-only saves, `story-everburn` and `scablands-runs` on), 1536 by 864, High, the game's own cameras, Medium (`app.cpuDifficulty='medium'` before each start), the headless tests' drivers fed into the game's own Duel step, the child-pace driver for jobs 1 to 3 and 5, the "fights" driver for job 4, the runs and the battle, and the written Medium defender for job 6 (the tests have none). Jobs 1 to 6 were one chain: Story button, Story card, yard Next up for job 1, then each results screen's own next-job button. Chrome ran without a screen, so drawing is in software.

New this time:
- The child-pace driver, now with its changed job 6 defence (back off to 28 m and run at the raider again), played job 6 on Easy.
- The caption slot was read from the page after every draw (what the screen shows and the game-clock second it changed), and every line handed to the screen's queue was noted with its clock second, so the wait between "said" and "shown" is measured.
- The camera's place was logged twice a second, with its distance to the furnace and to Big Bess, and extra pictures were taken whenever it came within 3 m of Bess or 6 m of the furnace.
- The first picture's projection was computed: whether the derrick, Big Bess and the furnace fall on the screen.

## What was set by hand

- A memory-only player (`addPlayer`), the Rustwall gate marked discovered, and the difficulty (`medium`; `easy` for the one Easy play of job 6).
- For the runs: the save set to "read, all six jobs done", as before. The feud then moved only by the game: Raiding, the long road took it to Watching, three Boneyard runs took it to War party, and the fifth run was offered as the battle. The camera pictures near Big Bess and the furnace come from three more plays whose feud was set by hand (Hunting for a Boneyard run, War party for the battle).
- The Easy play of job 6 was started from the Story Wall with the save set to "five jobs done".
- Nothing else; no job was skipped.

## The table

| Job | Started as a player would | Finished by script | Game time (first play) | Spoken lines shown | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 Hot Delivery | yes: Story button, Story card, yard Next up | yes | 25.8 s (25.8) | 4 | furnace line waited 7.4 s |
| 2 Get Out and Walk | yes: next-job button | yes | 10.3 s (8.8) | 2 of 3 | "One lit" never shown |
| 3 Run Him Down | yes | yes | 22.8 s (22.8) | 3 | opening line whole |
| 4 Slow Ride | yes | yes, "fights" driver | 74.1 s (74.1) | 3 | Bess in sight at the start |
| 5 The Key Under the Mall | yes | yes | 40.7 s (21.2) | 3 | key taken at 21.8 s |
| 6 The Everburn, Medium | yes | yes, written defender | 228.7 s (184 to 200) | 14 of 15 | final line never shown |
| 6 The Everburn, Easy | from the wall (save set) | yes, child-pace driver | 199.6 s | 15 of 16 | final line never shown |
| Gas run, long road | yes: wall, GAS RUN | yes | 184.4 s (184.4) | 2 | |
| Boneyard road x3 (Watching, Raiding, Hunting) | yes | yes, 3 of 3 | 142.1, 142.1, 144.3 s (same) | 3 to 4 each | war-party line 0.1 s |
| Battle (War party) | yes: BONEYARD ROAD: THE BATTLE | yes, won | 194.3 s (194.3) | 12 | |

Big Bess, Medium, "fights" driver, whole run: job 4, 100 lowest; long road 100; Boneyard at Watching 100, Raiding 100, Hunting 100 (first play: 100, 34.7, 100); battle 0 with one rest at 123 s, fire landing on her 12.7 s, raiders wearing her 14.9 s, three doors broken. She is hurt less than before everywhere except the battle, which is the same: the car now starts beside her.

## The start of each job and run, second play

| | Car at the first second | In the first picture |
| --- | --- | --- |
| Job 1 | yard gate, facing Tin Town | road and sky; clock reads 00:00.10 |
| Job 2 | (582, 44), inside Tin Town's gate, 17 m from the nearest drawn solid | the town ahead; the car is seen |
| Job 3 | Boneyard, as before | the Boneyard planes; opening line whole |
| Job 4 | (436, 306), 10 m behind Big Bess | Big Bess (20 m ahead) and the planes |
| Job 5 | (150, 416), on the road 150 m short of the mall | open road; "Leave the car outside" on screen from 0.2 s |
| Job 6 | (-445, 283), 30 m from the derrick, facing it | the derrick burning at the centre, the furnace parked beside it; raiders 98 m from the car at 2.4 s (Easy 72 m) |
| Gas runs and battle | 13 m behind Big Bess, 6 m to her right | Big Bess and the derrick both on screen (Bess 24 m from the camera) |

## The thirteen faults of the first play

| # | First-play fault | State | Where to see it |
| --- | --- | --- | --- |
| 1 | Camera inside the furnace (door break, furnace stopped) | **Fixed.** The screen was never filled in any play. See question 1 below | round 5, pictures 2, 3, 15, 16 |
| 2 | Job 6 starts with the camera looking away from the well | **Fixed.** The derrick is on screen, 38 m ahead | round 4, job 6 first |
| 3 | Job 2 behind a pillar; job 5 starts in the mall with the key beside it | **Fixed.** Job 2's car is seen in the gate; job 5 starts 150 m out and Cinder's line is heard first. The scripted driver then drives into the mall to the key, taking it at 21.8 s | round 4, job 2 and job 5 first |
| 4 | Captions too fast and cut | **Partly fixed.** Lines now stay 4.5 to 6.5 s, none is cut by a race word, job 3's opening line shows whole (5.0 s) and "Closer!" is gone. What remains is the queue running late in the chase and lines lost at the job's end (see question 2, new faults 1 and 2) | round 4, job 3 first; `round-5` pictures 1 to 3 |
| 5 | Escorts start far from Big Bess, action out of sight | **Fixed.** Bess and the derrick are on screen at the first second in job 4, the runs and the battle; cinders and the raid are seen when the player drives with her. Moss's "furnace behind us" is now said as the furnace comes out (62.4 s) | round 5, pictures 7, 10, 13, 17 |
| 6 | Job 6 leftovers (raiders piled at the well, "ROADSIDE AMBUSH AHEAD") | **Fixed.** No raider is left when the chase starts (final state: none), no race words anywhere in a job | round 5, picture 1 |
| 7 | Clock hidden by the M MAP button | **Fixed.** The button sits under the clock; "00:00.18" reads in full | every round 4 and 5 picture |
| 8 | "LOOSE SURFACE" in the caption slot | **Fixed.** Not shown once in any job or run | round 5 pictures 1 to 3 |
| 9 | Objective printed three times, over the mirror | **Fixed.** Once, in the top bar; no two panels overlap in any measurement. The battle's bar wraps to two lines, touching nothing | round 5, pictures 13 to 18 |
| 10 | Map labels overprint; oval, FINDS | **Partly fixed.** No oval, no FINDS, no overprinting. The big map draws the route in jobs 1, 3 to 5 and the runs, but in job 2 and in job 6's defence it is a dark empty panel with a few dots and labels and no ground | round 5, picture 6; round 4 job 2 shows the dots on its first picture's small map |
| 11 | After job 6 the yard points at nothing | **Fixed.** One BACK TO THE YARD button; the yard says "The Everburn is lit. Big Bess is loading gas for Tin Town." with a STORY WALL button that opens the wall at GAS RUN | round 5, pictures 4 and 5 |
| 12 | Job 4's stand-in result line | **Fixed.** "The gas is in Tin Town and the forge is lit." | round 4, job 4 results |
| 13 | Hand Flamer drawn as a launcher tube | **Not fixed** (the card puts it in a later art card) | round 4, job 2 "Hold F to step out" |

## The four things the fixes could not prove

### 1. The camera, played

Played with the "fights" driver, not staged, 386 camera samples in the battle and 261 in job 6, plus extra pictures.
- **The furnace.** Closest approach of the camera's place to the furnace: 4.9 m in the battle, 6.2 m in job 6. At those moments the camera is lifted (8.1 m up in the battle, 8 m in job 6; it is 3 to 5 m in ordinary driving). The screen is never filled. At a door break in job 6 the furnace covers about half the picture and the car and road stay in view (round 5, picture 2); 1.5 s later the road is clear (picture 3). When the furnace stops in the battle it fills the left half, hides the small map and a white fire glare washes the left edge, but the car, the road and the target stay readable (pictures 15 and 16, and the extra close pictures at 4 m). It is usable to drive by.
- **Big Bess.** The camera's place came within 0.4 to 0.9 m of her centre in runs (when the player drives past her) and 0.6 m in job 4. The picture taken at 0.9 m shows the player's car, the road and Bess in the rear-view mirror; she never fills the screen.
- **What is still odd.** The lifted camera looks down at a car that sometimes seems cut off at the wheels by the ground (battle, 112 s); the car's gear shows R while it backs away from the furnace, which is the driver's doing.

### 2. The captions, as a reader meets them

The screen's queue works on the game's clock: each line is shown for 1.2 s plus 0.055 s a character, 4.5 to 6.5 s here, in order, and an urgent line cuts in. Every line below was read from the screen. "Wait" is the time between the game handing the line over and the screen showing it.

| Moment | Lines (seconds on screen), waits over 3 s marked |
| --- | --- |
| Job 1 | pot (5.3); flamethrower (6.5, wait 3.1); furnace sighting (6.9, **wait 7.4**); Auntie Solder (5.7) |
| Job 2 | Auntie Solder (5.5); "Hold F to step out" (4.6, wait 3.5); "One lit. Two more." **never shown** (job over) |
| Job 3 | Auntie Solder opener (5.0); planes (3.9); furnace rolls away (2.2, job over) |
| Job 4 | Moss opener (5.3, a COLLISION flash at 5.4 s); furnace on the ridge (5.7); Auntie Solder (1.9, job over) |
| Job 5 | Cinder opener (5.8); lamps (6.2); "Got it?" (4.5, wait 4.1) |
| Job 6, Medium | opener (5.0); "They reached the valve" (5.4); "Valve's free" (4.0); Old Smoke 1 (4.2, wait 1.9); Old Smoke 2 (6.0, wait 3.9); **"He is heading for Tin Town! When a door glows, hit it!" (4.5, wait 7.7)**; "One down. Stay on him!" (3.0, wait 5.0); "HE IS RUNNING FOR THE BONEYARD" (3.5, wait 6.0); Old Smoke 3 (3.5); "RUNNING BACK" (3.5); Auntie Solder (5.5); "HE IS TURNING AROUND" (3.3); "That's it! Get clear!" (3.5); "Well, look at that" (4.4); **"I'm with you now, if you'll have me" never shown** |
| Job 6, Easy | same chase lines with waits of **12.4 s** ("heading for Tin Town"), **8.9 s** ("One down"), **9.4 s** ("running for the Boneyard"); Old Smoke's second line cut to 1.5 s by an urgent door arrow; **"I'm with you now" never shown** |
| Long road | start (4.3); arrival (2.1, job over) |
| Boneyard roads | start (5.5); "Here they come" (1.7 to 3.0, cut by COLLISION flashes); arrival (2.1 to 4.3); war-party line after the third run **shown for 0.1 s** |
| Battle | Moss opener (5.8); "Here they come" (1.7); Moss "furnace behind us" (5.7); Clinker (4.7, **wait 5.9**); cinders (4.0); Clinker (5.3 and 3.0); Moss rest (3.0, 3.3); Cinder (6.0); Moss (4.0); Auntie Solder (2.0, job over) |

Did the queue run so far behind that a line no longer made sense? Yes, in job 6's chase. On Medium "When a door glows, hit it!" is shown at the second the first door breaks, then "One down" is shown 5 s after that; on Easy "When a door glows, hit it!" appears 5 s after the door has already glowed and broken, and the round-5 first picture shows Old Smoke's line from 104 s still up at 109 s with the door glowing. Elsewhere the waits are 3 to 6 s and the lines still fit. Dropped lines: job 2's "One lit", job 6's "I'm with you now" (both difficulties), and the war-party line (0.1 s). The queue is emptied when the job ends (`src/screen-hud.js`, the `captions.clear` in `updateHud`), and the story's last lines are said 2 to 4 s before the end.

### 3. Job 6's defence

- **Medium, the written defender** (a driver that stands 5 to 9 m from the nearest raider and burns it): won, 228.7 s in all. The first wave appears at 2.4 s, 98 m from the car, and is cleared at 25.3 s (23 s); wave 2 was lost at 72 s ("They reached the valve! ... Same lot, once more") and the valve was free at 95.7 s. The car was within 8 m of a standing raider for 48.6 s in all and for at most 9.2 s at a stretch.
- **Easy, the child-pace driver** (with its new back-off): won, 199.6 s in all. First wave at 2.4 s, 72 m from the car, cleared at 20.7 s (18 s); the valve was free at 80.6 s (three waves in 78 s, about 26 s a wave); no wave was lost. The car was within 8 m of a raider for 25.2 s in all and for at most 6.1 s at a stretch, so it does not circle at arm's length; it runs in, burns and backs off.
- Cinder's "Hold them off" line is on screen for the first 5 s, while the first wave walks in; the wave arrives after the line.

### 4. The start of a gas run and the battle

In the first picture of every run and of the battle the derrick stands directly behind Big Bess (they overlap on the screen, the derrick fire above her tank), the car is 13 m behind her and 6 m to her right, and both are on the screen: Bess 23 to 24 m from the camera, the derrick 21 m. Yes, the player can see her (round 5, pictures 7, 10 and 13). Moss's start line matches the picture (the long way round; through the Boneyard).

## New faults, worst for a child first

1. **The chase's instructions arrive late, in job 6.** The three Old Smoke and Cinder lines, an urgent door arrow and "One down" queue up in the first 15 s of the chase. On Easy "When a door glows, hit it!" is shown 12.4 s after it was said, after the first door has glowed and broken; "One down. Stay on him!" is shown 5 to 9 s after the hit. Cause: `src/story/caption-queue.js` shows each line for its full reading time one after another, and the chase says seven or eight lines in 25 s of game time (`src/world/jobs/steps/chase.js`, `old-smoke.js`). A line that waited a long time is not dropped or shortened (the "crowded" rule only shortens lines when three or more wait, to 70%).
2. **The story's last line is lost.** "I'm with you now, if you'll have me. Nobody else lets me bring the pot." (Cinder joining the crew) is never on screen, on Medium or Easy; "Well, look at that" is shown 4.4 s and the job ends 2.2 s after the last line is said. Job 2's "One lit", the closing lines of jobs 3 and 4 (2.2 and 1.9 s), and the war-party line after the third Boneyard run (0.1 s) are cut the same way. Cause: `captions.clear` in `src/screen-hud.js` at the job's end, and the job's own 2.2 s hold for its closing lines.
3. **"COLLISION" appears in the caption slot** for 0.25 to 0.5 s at a time whenever the car touches a raider or a machine: up to 9 times in a run, once at 5.4 s in job 4, where it also cuts Moss's opening line and delays its rest by 0.45 s. Part A kept crash messages in a world job on purpose, but for a child the flashes break the line being read. Cause: the crash branch of `callout` in `src/screen-hud.js` (the `callout` line).
4. **The big map is empty in job 2 and in job 6's defence.** A dark panel with three lamp dots and two labels, no road, no town (round 5, picture 6). The route in jobs 1, 3, 4, 5 and the runs is drawn, but its bend (job 1: a peak midway) is a drawn guess, not the road.
5. **The Hand Flamer is still a launcher tube** (fault 13, not fixed).
6. **After the battle's furnace stops, the fire glare covers the left edge** of the picture and the furnace hides the small map (round 5, picture 16). Low harm; the car and the road stay clear.
7. **Done rows on the Story Wall still read "The Everburn is done."** (the title again). Low harm.

## Could a ten-year-old play it from start to finish today?

Much closer, and the camera and the starts no longer stop a child: every job opens where the player can see the car and what to do, the clock reads, the lines stay long enough to read, and the yard says what to do after job 6. The first thing that would stop that child now is job 6's chase: the three or four lines said at its start queue up, so "When a door glows, hit it!" arrives after the door has glowed, and the line that says Cinder has joined the crew never appears at all. After that, the sparse map in job 2 and the Hand Flamer drawn as a launcher are small stops; the number of collisions flashing in the caption slot is a nuisance, not a stop. What I could not test is a real child's hands on the keys, which job 6's defence on Medium (a lost wave at 72 s, 229 s in all) will test hardest.

Verdict (Claude): to be written.
