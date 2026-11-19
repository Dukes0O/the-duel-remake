# Everburn play-through, third round (round 6), after EVERBURN-PLAY-FIXES third round

Sheet: `round-6.jpg` (nine pictures, three a row: the big map in job 2, in job 6's defence and in the battle; job 6's chase at the first door glow on Medium and on Easy; a bump in a gas run; the results screens of job 6, of a Boneyard run that reaches War party and of the battle). Compare with `round-4.jpg` and `round-5.jpg`; the second play's findings are in `round-4-review.md`.
Taken 12 November 2026 on branch `worktree-agent-a6e8bc73bb6960823` at 6fd73d743, by a helper. No file under `src/` or `public/` was changed to take the pictures.

## How it was taken

As the second play (see `round-4-review.md`): the real game in a browser (QA page, memory-only saves, `story-everburn` and `scablands-runs` on), 1536 by 864, High, the game's own chase camera, Medium unless it says Easy. Chrome ran without a screen, so drawing is in software. The drivers' inputs go straight into the game's own Duel step, one step of 1/60 s at a time, with the game drawn every 0.1 s of game time in the chase (up to the first glow), every 0.25 s after it and every 0.5 s elsewhere.

- Job 6 on Easy: the child-pace driver of `tools/test-everburn-easy.mjs`, ported to run in the page.
- Job 6 on Medium: a defender written for this play (turn to the nearest raider, stand 4 to 9 m off and burn it, back off when under 4 m, creep round when not lined up), then the child-pace driver for the chase, as in the second play. The tests have no Medium defender; the one in the second play was not kept.
- The Boneyard run and the battle: the "fights" driver of `tools/test-run-gas-medium.mjs`, ported to run in the page.
- Every caption in the table below was read from the screen's caption slot after each draw (the text, the game second it appeared, the seconds it stayed), and every line the game handed to the screen's queue was noted with its game second, so "wait" is the time between handing over and showing. The second at which each door began to stoke and to glow was read from the furnace.

## What was set by hand

- A memory-only player, the Rustwall gate marked discovered, and the difficulty (`medium`; `easy` for the one Easy play of job 6).
- The save for each play, so that each started from the Story Wall button: job 2 with "one job done", job 6 with "five jobs done", the Boneyard run with all six jobs done and the feud at Hunting (so that the run takes it to War party), the battle with all six jobs done and the feud at War party. Nothing else was set; no step of a job was skipped.
- The pictures of the job 2 map, the battle map and the two run and battle results screens are from the first pass of this play; the chase, job 6 and bump pictures are from the passes after the last change to the caption queue (a line cut short by an urgent line comes back once at most).

## What was played

| Play | Game time | Result |
| --- | --- | --- |
| Job 6, Medium | 262.4 s (defence to 125.4 s, chase after it) | won; Cinder's two closing lines on the results screen |
| Job 6, Easy | 196.1 s (defence to 85.3 s) | won; the same two lines |
| Boneyard run, feud Hunting to War party | 166.7 s | home with Big Bess at 35 health (Moss's "most of the gas" line), feud now War party, +192 scrap; Moss's line and Auntie Solder's war party line on the results screen |
| The battle on the Boneyard road, War party | 189.0 s | won (three doors, the furnace stopped), Big Bess at 60 health, +384 scrap; Auntie Solder's "No more toll" line on the results screen |

## Job 6's chase: every caption, with its second on screen, the seconds it stayed and its wait

Medium (the chase starts at 125.4 s; the first door stokes at 132.1 s and glows at 136.1 s):

| Shown at | Stayed | Handed over | Wait | Line |
| --- | --- | --- | --- | --- |
| 123.50 | 2.23 | 123.20 | 0.30 | Cinder: Valve's free. Hang on, what's that noise? |
| 125.73 | 2.60 | 125.45 | 0.28 | Old Smoke: Fire is mine. Everything goes grey in the end. |
| 128.33 | 2.80 | 127.67 | 0.66 | Cinder: He is heading for Tin Town! When a door glows, hit it! |
| 131.13 | 5.75 | 129.88 | 1.25 | Old Smoke: If I cannot have the fire, nobody has it. I am going to put out your forge. |
| 136.88 | 2.25 | 136.87 | 0.01 | Cinder: One down. Stay on him! (urgent) |
| 139.13 | 3.50 | 138.90 | 0.23 | HE IS RUNNING FOR THE BONEYARD. AFTER HIM! (urgent) |
| 199.88 | 2.00 | 199.72 | 0.16 | Old Smoke: My beautiful furnace! Stop that! (urgent) |
| 201.88 | 2.50 | 201.73 | 0.15 | HE IS RUNNING BACK TO THE WELL. AFTER HIM! (urgent) |
| 204.38 | 0.50 | | | Old Smoke: My beautiful furnace! Stop that! (comes back once) |
| 204.88 | 5.50 | 202.87 | 2.01 | Auntie Solder: That is close enough, Smoke. Look at the state of you. Go home. |
| 235.13 | 3.25 | 234.98 | 0.15 | HE IS TURNING AROUND. KEEP WITH HIM! (urgent) |
| 252.88 | 3.50 | 252.88 | 0.00 | Cinder: That's it! Get clear! (urgent) |
| 258.13 | 3.00 | 257.90 | 0.23 | Cinder: Well, look at that. A hundred years old and still showing off. |
| 261.13 | 1.22 | 260.12 | 1.01 | Cinder: I'm with you now, if you'll have me. Nobody else lets me bring the pot. (the job ends at 262.35 s) |

Easy (the chase starts at 85.3 s; the first door stokes at 92.0 s and glows at 96.0 s):

| Shown at | Stayed | Handed over | Wait | Line |
| --- | --- | --- | --- | --- |
| 83.48 | 2.15 | 83.10 | 0.38 | Cinder: Valve's free. Hang on, what's that noise? |
| 85.63 | 2.60 | 85.35 | 0.28 | Old Smoke: Fire is mine. Everything goes grey in the end. |
| 88.23 | 2.80 | 87.57 | 0.66 | Cinder: He is heading for Tin Town! When a door glows, hit it! |
| 91.03 | 1.50 | 89.78 | 1.25 | Old Smoke: If I cannot have the fire, nobody has it. I am going to put out your forge. |
| 92.53 | 3.50 | 92.03 | 0.50 | << LEFT DOOR OPENING (urgent arrow, its own time) |
| 96.03 | 0.50 | | | Old Smoke: If I cannot have the fire... (comes back once) |
| 96.53 | 2.00 | 96.50 | 0.03 | Cinder: One down. Stay on him! (urgent) |
| 98.53 | 3.75 | 98.53 | 0.00 | HE IS RUNNING FOR THE BONEYARD. AFTER HIM! (urgent) |
| 141.03 | 4.00 | 140.92 | 0.11 | RIGHT DOOR OPENING >> (urgent arrow) |
| 145.53 | 2.00 | 145.43 | 0.10 | Old Smoke: My beautiful furnace! Stop that! (urgent) |
| 147.53 | 2.50 | 147.47 | 0.06 | HE IS RUNNING BACK TO THE WELL. AFTER HIM! (urgent) |
| 150.03 | 1.50 | | | Old Smoke: My beautiful furnace! Stop that! (comes back once) |
| 158.78 | 5.50 | 158.72 | 0.06 | Auntie Solder: That is close enough, Smoke. Look at the state of you. Go home. |
| 182.03 | 4.00 | 181.98 | 0.05 | REAR DOOR OPENING (BEHIND HIM) (urgent arrow) |
| 186.78 | 3.25 | 186.57 | 0.21 | Cinder: That's it! Get clear! (urgent) |
| 191.78 | 3.00 | 191.60 | 0.18 | Cinder: Well, look at that. A hundred years old and still showing off. |
| 194.78 | 1.27 | 193.82 | 0.96 | Cinder: I'm with you now, if you'll have me. Nobody else lets me bring the pot. (the job ends at 196.05 s) |

Is "When a door glows, hit it!" on screen before the first door glows? Yes on both: Medium 128.3 to 131.1 s with the glow at 136.1 s; Easy 88.2 to 91.0 s with the glow at 96.0 s (and the arrow << LEFT DOOR OPENING from 92.5 to 96.0 s). In the second play it was shown 7.7 s late on Medium (the same second as the first door break) and 12.4 s late on Easy (after the first door had glowed and broken). The longest wait in this chase is 2.0 s on Medium (Auntie Solder) and 1.25 s on Easy; the longest in the second play's chase were 7.7 s on Medium and 12.4 s on Easy. No line was dropped in either play. "I'm with you now" is shown for 1.2 s in the job and is on the results screen, where it stays.

## The closing lines on the results screens

- Job 6 (picture 7): Cinder's two closing lines, "Cinder: Well, look at that. A hundred years old and still showing off." and "Cinder: I'm with you now, if you'll have me. Nobody else lets me bring the pot.", then Hollis's result line, then the pay. Easy shows the same two lines.
- The Boneyard run to War party (picture 8): "Moss: We are here, and most of the gas is too. That will do.", "Auntie Solder: They have stopped raiding and started gathering. That is a war party, driver. Mind how you go.", then "Big Bess is in Tin Town. The Ash Men have gathered a war party." and the pay, the Ash Men's word and the run count. The line the run's own sentence says is not said twice.
- The battle (picture 9): "Auntie Solder: No more toll on the Boneyard road. Tin Town owes you a supper." above "The furnace has stopped for good on the Boneyard road, and Big Bess is in Tin Town."

## The big map

- Job 2 (picture 1): the yard gate, Tin Town, the Everburn, the Dead Mall and the Boneyard are marked and named; the long road and the Boneyard road are drawn faintly and named; the job's own ground (the three forge lamps, named FORGE LAMP 1) is bright beside Tin Town; the player is the white dot. The small panel on the left still shows the job's own ground only.
- Job 6's defence (picture 2): the Everburn is bright and named, the riders are marked, the land is faint under it.
- The battle (picture 3): the Boneyard road is bright with Big Bess, the furnace and the player on it; the long road and the five places are faint; the whole land fits in the panel (the picture is fitted to the land, the job's ground and the player).

## A bump (picture 6)

At 13.75 s of a Boneyard run (the fighting driver, its first touch of anything) the car touches something at 44 km/h and the crash flash is on (0.35 s left on it). "Moss: Here they come. Keep them off the tank." stays on screen; nothing says COLLISION in the caption's place, and the line was not cut. (A first try, driving into the derrick, made no crash flash at all: a slow scrape does not count as a crash.)

## What in the pictures is still wrong

1. At the second the first door begins to glow, the instruction is no longer on screen: on Medium there is no arrow, and Old Smoke's long second line is up (picture 4); the player has the glow and the HUD's own line ("Stop the furnace before it reaches Tin Town. Hit a door while it glows.") at the top. The instruction was on screen 5 s before the glow on both difficulties.
2. On Easy Old Smoke's second line is cut to 1.5 s by the first arrow and comes back for 0.5 s (picture 5), because the arrow, "One down" and the bolt line all come within 8 s; "My beautiful furnace" is cut and comes back in the same way on both difficulties.
3. A place-only job shows on the big map as a few bright dots: job 2's three forge lamps run together into one blob beside Tin Town (picture 1). There is no ring for the job's area.
4. Other messages still lie over the rear-view mirror: "Road is clear. Keep your wheels under you." (pictures 2 and 3) and the raiders' warning "Turn around, driver. This road has a toll." (picture 6). They are not part of this round.
5. While the big map is open, the large italic story caption still runs under its edges (pictures 1 and 3).
6. Cinder's last line, "I'm with you now", is up for only 1.2 s before the screen changes; it stays on the results screen, so nothing is lost.

Verdict (Claude): accepted and merged. The longest wait for any line in job 6's chase fell from 7.7 seconds to 2.0 on
Medium and from 12.4 to 1.25 on Easy, and no line was dropped. Cinder's instruction is read 5 seconds before the first
door glows; the bar at the top of the screen says "Hit a door while it glows" throughout, so the instruction need not
still be on screen at the glow. Cinder's two closing lines, the war party line and the battle's ending line are on
their results screens. The big map shows the land. Still to do, on the card: a place-only job is a few dots on the big
map, two other messages still lie over the rear-view mirror, and the story caption runs under the open big map.
