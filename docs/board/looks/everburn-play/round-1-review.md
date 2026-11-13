# Everburn play-through, round 1 (jobs 1 to 6) and the findings of the whole play

Sheet: `round-1.jpg` (jobs 1 to 6, three pictures each: the first second, a moment in the middle, the results screen).
Round 2 (`round-2.jpg`, with its own note) holds the chase and the battle close up, the yard and wall after job 6, and the gas runs.
Taken 12 November 2026 on branch `c/game-audit-experience-2d694d` at f437ce9a8, by a helper. No file under `src/` or `public/` was changed.

## How it was taken

- The real game in a browser (the QA page `/tools/menu-check.html`, memory-only saves, switches `story-everburn` and `scablands-runs` on), 1536 by 864, High graphics, the game's own chase and first-person cameras. Chrome ran without a screen, so drawing is in software; the look is the game's, the speed is not.
- Difficulty Medium: `app.cpuDifficulty` was set to `medium` before each start.
- The drivers are the ones the headless tests use, fed into the real game's own Duel step: the child-pace driver of `tools/test-everburn-easy.mjs` for jobs 1 to 3 and 5, the "fights" driver of `tools/test-run-gas-medium.mjs` for job 4, the runs and the battle. The tests have no Medium driver for the well's defence, so for job 6 a defender was written for this play (turn to the nearest raider, stand 5 to 9 m off, burn it); its chase part is the child-pace driver.
- Every caption in the lists below is the on-screen callout line, read from the game each simulation step (what is shown, who says it, for how many seconds of game time).
- Jobs 1 to 6 were played as one chain: Story button, Story card, yard Next up button for job 1, then each results screen's own next-job button. Nothing was set between jobs.

## What was set by hand

- A memory-only player was made (`addPlayer`) and the Rustwall gate marked discovered (`discoveredGate`), the way `everburn.mjs` does.
- Medium difficulty (see above).
- For the gas runs and the battle: the Everburn save was set to "read, all six jobs done" (the same as `run-gas.mjs`). The feud and run count were then moved only by the game: it started at Raiding, the long road took it to Watching, three Boneyard runs took it to War party, and the fifth run was offered as the battle.
- Nothing else. No job was skipped.

## The table

| Job | Started as a player would | Finished by script | Game time | Spoken lines shown | Faults (numbers refer to the list below) |
| --- | --- | --- | --- | --- | --- |
| 1 Hot Delivery | yes: Story button, Story card, yard Next up | yes | 25.8 s | 4 (Cinder x3, Auntie Solder) | 4, 7, 8, 9 |
| 2 Get Out and Walk | yes: results next-job button | yes | 8.8 s | 3 (Auntie Solder, Cinder x2) | 3, 4, 7, 8, 10, 13 |
| 3 Run Him Down | yes | yes | 22.8 s | 4 (Auntie Solder, Cinder x3), the first cut at once | 4, 7, 8 |
| 4 Slow Ride | yes | yes with the "fights" driver (the child-pace driver sat at Tin Town waiting for her and my stall rule stopped it; not a game fault) | 74.1 s | 3 (Moss x2, Auntie Solder) | 5, 7, 8, 9, 12 |
| 5 The Key Under the Mall | yes | yes | 21.2 s | 4 (Cinder x4), two cut | 3, 4, 7 |
| 6 The Everburn (defence, then the furnace) | yes | yes with the written defender, 184 to 200 s in three plays. The child-pace driver never held the well on Medium: 25 game minutes, 40 "They reached the valve!" restarts | 184.1 s | 11 (Cinder x6, Old Smoke x3, Auntie Solder, plus capital-letter calls) | 1, 2, 4, 6, 7, 8, 11 |
| Gas run, long road (feud Raiding) | yes: Story Wall, GAS RUN, LONG ROAD | yes | 184.4 s | 2 | 5, 7 |
| Gas run, Boneyard road (x3, feud Watching, Raiding, Hunting) | yes | yes, 3 of 3 | 142.1 s, 142.1 s, 144.3 s | 3 to 4 each | 5, 7 |
| Battle on the Boneyard road (feud War party) | yes: wall button BONEYARD ROAD: THE BATTLE | yes, won | 194.3 s | 12 | 1, 5, 7, 9 |

Big Bess, Medium, the "fights" driver (times are game time for the whole run):

| Run | Lowest health | Rests | Seconds of fire landing on her | Seconds with raiders wearing her | Doors broken |
| --- | --- | --- | --- | --- | --- |
| Job 4 | not recorded (87 seen at 22 s) | 0 | 0 | not recorded | n/a |
| Long road | 100 | 0 | 0 | 0 | n/a |
| Boneyard, Watching | 100 | 0 | 0 | 0 | n/a |
| Boneyard, Raiding | 34.7 | 0 | 0 | 6.8 | n/a |
| Boneyard, Hunting | 100 | 0 | 0 | 0 | n/a |
| Battle | 0 (one rest at 123 s) | 1 | 12.7 | 14.9 | 3 |

(Boneyard rows are in play order, the feud word being the one on the wall before the run. Order of the runs: the Boneyard run at Watching left Bess untouched even though two raiders appeared; the one after it, at Raiding, cost her 65 health.)

The feud words and pay on the results screens were right every time: Watching, Raiding, Hunting, War party, then Watching again after the battle; 96 scrap on the long road, 192 on the Boneyard road, 384 for the battle. Auntie Solder's "war party" line plays in turn after Moss's arrival line.

## What the start of each job looked like

| Job | Car at the first second | Verdict |
| --- | --- | --- |
| 1 | Yard gate (0, 0), facing Tin Town, clear ground | fine |
| 2 | Tin Town (600, 0), 30 m from the nearest building box, in an alley | the camera sits behind a dark pillar and the car is hidden (fault 3) |
| 3 | Boneyard (543, 192), clear, facing the planes | fine; the first caption is wrong (fault 4) |
| 4 | Same place as job 3; Big Bess is 165 m away at (422, 303), not in sight | fault 5 |
| 5 | (0, 430), inside the Dead Mall's solid box, staircase and wooden walls round the car | fault 3 |
| 6 | (-445.2, 282.8): 30 m from the derrick, facing it, 17.3 m clear of the well's box, nothing under or inside it | the car is right, the camera is not (fault 2). Two raiders appear 6 m from the car at the same moment |

## The faults, worst for a child first

1. **The camera ends up inside the furnace.** Job 6, when the first door breaks (round 2, second picture): the screen is filled with the stretched shell of the furnace, the rear-view mirror shows furnace metal and black, and Cinder's line is over it. The battle does the same when the furnace stops (round 2, "Battle: furnace stopped"). The child cannot see what is happening for as long as the car stays against the furnace. Probably the chase camera has no check against the furnace model (camera follow in `src/render3d.js`; the furnace is drawn in `src/world/scablands-scene.js`).
2. **Job 6 starts with the camera looking away from the well.** The car faces the derrick (it is turned round by `faceOriginToPlace`, `src/arena/modes/world-job.js:65`; its heading error is 3.03 rad), but the chase camera follows the road direction, so it stands between the car and the well and looks back at the car's face. Measured: the derrick is 21 m behind the camera and off screen. The first picture shows the car, a hill and the sign, never the well. The two raiders spawn 6 m from the car at the same second.
3. **Jobs 2 and 5 start in places where the player cannot see, or has already won.** Job 2: the camera sits behind a dark pillar for the whole 8.8 s (the car is never seen; first and approach pictures). Job 5: the car starts inside the Dead Mall's solid box with a staircase in front of the lens, 12 m from the key; the key is taken at 1.8 s and the job is over at 21 s. Cinder's line "Old Smoke keeps the well key in the old mall. Leave the car outside" is said at 4.4 s, after the key is already in hand and the car is driving away (`src/world/jobs/everburn.js`, job 5 `sayNear` and `startLineId`).
4. **The captions go by too fast and get cut.** Every spoken line is shown for 2.2 s of game time (`duel._callout`, `src/game.js:891`), whatever its length: the median is 78 characters, the longest 103 ("Cinder: See the smoke with wheels under it?..."). That is about 45 characters a second; a ten-year-old reads about 15. Job 1 says three long lines back to back (at 0, 2.2 and 4.4 s). Lines cut before they finish: job 3's opening line "Thief! He's got my bellows!" is replaced after 0.01 s by the leash line "Closer! You're losing him!" at second 0 (`leashLineId`, `src/world/jobs/steps/chase.js:12`), so the first picture says "Closer" about a thief nobody has seen; job 5's "Stay out of their lamps" is cut by "ON FOOT / CAR PARKED" with 0.8 s left, and "Got it? You'll walk slow with that" by "BACK IN THE CAR" with 2.0 s left; job 6's "One down. Stay on him!" is cut by "HE IS RUNNING FOR THE BONEYARD" with 0.6 s left, and Old Smoke's "My beautiful furnace! Stop that!" by "HE IS RUNNING BACK TO THE WELL" with 0.6 s left. The race word "GO. MAKE IT COUNT." is shown for a hundredth of a second under every first line.
5. **Escort runs start far from Big Bess and the action is out of sight.** Job 4 starts 165 m from her; every gas run and the battle start in the Boneyard at (543, 192) with Bess at the well (-424, 303), about 970 m away, so the first picture shows no truck. Moss says "That is his furnace on the road behind us" at the first second of the battle while the furnace is not out yet. "Here they come" and "It is throwing fire on the tank" are said while the player is nowhere near her, so the picture shows a lonely car on sand (round 2, "cinders on Big Bess"). The raiders' toll box ("Turn around, driver. This road has a toll.") draws inside the rear-view mirror.
6. **Job 6 on Medium is hard for a scripted child-pace driver and its leftovers stay.** The child-pace driver never held the well in 25 game minutes (40 restarts). The written defender won, once after one wave restart. Raiders from earlier waves pile up at the well (six standing at the end, none removed), and when the player drives the last stretch home the generic race warning "ROADSIDE AMBUSH AHEAD" appears twice, 1.1 s apart (`src/raiders.js:318`), in the Everburn.
7. **The clock is hidden by the map button in every job.** The "M · MAP" button (`src/world/world-hud.css:12`) sits over the right half of the time, so a player sees "00:0" or "01:1" and never the seconds. Measured: clock box 1222 to 1501 across, button 1427 to 1514.
8. **"LOOSE SURFACE" fills the caption slot while driving.** In the Scablands the car is always off the road, so the line that carries the story captions shows "LOOSE SURFACE" in big letters whenever no story line is up (`src/screen-hud.js:263`). It means nothing to a child.
9. **The objective is printed three times and, in the battle, runs over the mirror.** Top banner, left heading and the right of the clock all repeat it. The battle's long objective wraps to two lines in the banner and the right-hand copy starts inside the rear-view mirror (overlap 7,076 square pixels).
10. **Small map labels run into each other.** Job 2's small map prints "FORGE" and "LAMP 3" on top of each other. The big M map is an oval ring of eight places with the player's blue dot in the right place; it draws no route and carries a leftover line "FINDS Nothing found yet". The small map's "YOU" mark was in the right place in every job (it sits off the route line in jobs 3 and 4, which is correct: the car starts beside the route).
11. **After job 6 the child is told to do something that is not there.** The results screen has two "BACK TO THE YARD" buttons and no mention of the gas run. In the yard the Next up line reads "the Everburn is lit. Drive the Scablands or replay a job" with no button (`src/story/ember-ui.js:53`; driving freely is not built). The GAS RUN is on the Story Wall, which the yard does not point at. Done entries on the wall read "The Everburn is done."
12. **Job 4's results line is a stand-in.** "Slow Ride is done. You made it back to the yard." (`src/screen-arena.js:227` default text) after Bess has reached Tin Town.
13. **Job 2's Hand Flamer is drawn as a launcher tube** in the first-person view, labelled HAND FLAMER with a FIRE TO USE prompt.

Smaller facts: jobs 2, 3 and 5 are over in 8.8, 22.8 and 21.2 s, short enough that the written lines barely get said; a real child will probably meet more of job 6's "They reached the valve" loop than the written defender did; the compass and the map both treat +z as north while the scene's own comments say smaller z is north (the two agree with each other, so the player sees nothing wrong).

## Could a ten-year-old play it from start to finish today?

Not without help. The story can be driven end to end, and the jobs, the runs and the battle all complete with the right pay and the right feud words. What stops a child first is job 2: the camera starts behind a pillar and the car is not seen, and the three lines said in the first seven seconds of job 1 are too fast to read. The next stoppers are the camera inside the furnace in job 6 and the battle, the unreadable captions, and the end of the story, where the yard points at driving that does not exist.

Verdict (Claude): to be written.
