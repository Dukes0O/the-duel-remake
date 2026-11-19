# Everburn play-through, fourth round (round 7), after EVERBURN-PLAY-FIXES fourth round

Sheet: `round-7.jpg` (six pictures, three a row: the big map in job 2; a spoken line under the caption with the mirror clear; the caption above the open big map; the start of a gas run; the start of job 4; Tin Town with its solid drawn over it). Compare with `round-6.jpg`; the faults it answers are items 3 to 5 of `round-6-review.md`, "What in the pictures is still wrong", and the two left open in `docs/changes/EVERBURN-PLAY-FIXES-B.md`.
Taken 13 November 2026 on the worktree branch `worktree-agent-a81491e2b3b9a2900`, after the last change to the code, by a helper.

## How they were taken

The real game in a browser (the QA page, memory-only saves, `story-everburn` and `scablands-runs` on), 1536 by 864, Performance quality, Medium. The jobs were started from the Story Wall's own buttons, with the earlier jobs marked done in the memory-only save. The pictures come from a scratch scenario that is not committed. It changed no file under `src/`. It did four small things by hand, each named below.

- Picture 1: job 2 started, 13 seconds of game time run (so that no caption is up), then M pressed.
- Picture 2: a gas run on the Boneyard road, 3 seconds in. The line "Road is clear. Keep your wheels under you." was started by calling the game's own spoken-line hook with a weapon-fired event, which is what the flamethrower's first shot does in play. The picture was taken a tenth of a second later. The raiders' toll line ("Turn around, driver. This road has a toll.") came up by itself in the frame check's picture, `everburn-frames` (not on the sheet), and stood in the same place.
- Picture 3: job 2, 1.3 seconds in, M pressed while Auntie Solder's opening line was on screen.
- Pictures 4a and 4b: a gas run on the Boneyard road and job 4, each 1.2 seconds into the job.
- Picture 5: job 2 started, then the game's camera moved to stand south-west of the town, and a green outline of the solid called `tin-town-shell` (x 590.5 to 609.5, z minus 13.5 to 13.5, 8 m high) drawn over the picture with a separate canvas on the page. The outline is for the picture only; nothing of it is in the game.

## What each picture shows

1. **Big map, job 2.** The three lamps are named FORGE LAMP 1, 2 and 3, each with a numbered gold badge, in a column to the left of Tin Town. A thin line joins each badge to a small dot where its lamp stands, so the three can be told apart even though they stand 7 m apart. TIN TOWN, YARD GATE, THE EVERBURN, DEAD MALL and BONEYARD keep their names, and none prints over another.
2. **Spoken line.** "Road is clear..." stands under the story caption, in the middle of the screen. The rear-view mirror above the caption is clear. (Measured on the page: the line's box starts at 408 px, the mirror ends at 234 px and the caption's box, 258 px to 358 px, ends 50 px above it.)
3. **Caption with the map open.** Auntie Solder's line is drawn above the big map on a dark plate, in smaller type than in play, and can be read. The plate covers the top of the map while the line is up.
4. **Big Bess at the start.** In a gas run (4a) she stands 36 m down her road, past the well, with the derrick behind the car and in the mirror; the car is 13 m behind her and 6 m to the side, so she is in the first picture and nothing stands between. In job 4 (4b) she starts at the Boneyard, which never stood inside a solid; she is 10 m ahead of the car and the planes' wrecks stand beside the road.
5. **Tin Town's solid.** The green outline lies round the town's buildings, where the town is drawn. It stood 46 m to the west of here before.

## What in the pictures still looks wrong, or is open

1. **The small panel** (at the left of every picture) still shows job 2's lamps as one gold blob with the name FORGE LAMP 1. The card asked for the big map only, so it is as it was.
2. **Picture 3:** the plate hides the top of the map (its heading and the DEAD MALL label) while the line is up, and a long line (three lines of type) would hide a little more. Nothing in the map is lost once the line has gone.
3. **Big Bess's start has moved.** In a gas run and in the battle she begins 36 m from the well, not at its middle, so each run is 36 m shorter (about 4 seconds at her 9 m a second). The raids' places, the pay and every number on the card are as they were.
4. **The town's solid now stands in the town.** Nothing about job 2's lamps, the forge or the gate lies inside it. Hot Soup's notice board and job 1's delivery spot are inside its edge; the start check shows that the car can reach each from outside the solid. Nothing was driven there in these pictures.
5. **Not done, as the card says:** the Hand Flamer's drawing, and Old Smoke's furnace in job 6, which starts at the well's middle (a machine that chases, not one that is escorted).
6. In every picture the box at the top left is the QA page's own menu, not the game.
