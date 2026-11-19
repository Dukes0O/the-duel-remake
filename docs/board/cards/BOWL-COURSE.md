# BOWL-COURSE

The short board entry controls current state, ownership, dependencies and locks.

`src/bowl/bowl-course.js`, `def.bowl`, in the pattern of `titan-arena`: floor, ramps, crush lines, flame jets, night mood. Existing Titan courses unchanged. A new registry entry: re-record pinned counts with a one-line reason (Gates).

**Checks:** `tools/test-bowl-course.mjs` (ramps launch, crush items crush, existing course signatures unchanged). Claude runs: look.

Design: [docs/WASTELAND_WORLD.md](../../WASTELAND_WORLD.md). Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/BOWL-COURSE.md` with a Removed section. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key.

## Art notes to carry out here (Claude)

The art merged at the three-round cap with fixes left for this card. Read the last "Round 3" verdict on `docs/board/cards/BOWL-ART-CRUSH.md` and do those fixes here, as materials, placement or the look of props. They are not new art rounds.

## Builder decided (Claude to review)

**The floor fits the stadium, not the Titan Arena's size (19 November).** The course merged on 5 November was a 1,280 m Titan-sized oval with the 94 m stadium model dropped at its start line: most of the ring, both ramps and the whole crush line stood outside the stadium, and the Titan Arena's own stands were drawn round it. The stadium's layout passed its art review, so the course now fits it: a 140 m ring round the podium, between an island wall and a wall in front of the stands, 16.5 m between the wall faces (floor half width 6.1 m), with the floor layout the Scrapdome uses (walls, floor width, and a 42 mph floor speed that applies once the show runs the Bowl as an arena event; as a course it does not). Two ramps on one long side (a 1.8 m kicker and a 2.6 m jump; both launch the Titan from 30 mph), a flame jet either side of each on the wall tops, and the crush line on the other long side: three rows of junk cars, the crushed buses and RV, then three burning stacks. That is the size of a real monster-truck floor. BOWL-HOOKS runs the events on it; the open question for it is below.

**Round 3 fixes, done in the game as materials and placement:** junk cars for most of the row and only the bus and RV from the model; each vehicle its own faded paint (the model's materials load white, so they are coloured by name); no cone flame, the game's fire burning out of each stack. Found on the way: the model's parts were picked up without their root's turn, so the stack stood on end and the bus and RV were never drawn at all; the old test's stand-in model hid it. The crushed bus and RV are still thin as trays: that is the model, for the judgement at BOWL-FINISH.

**Open for BOWL-HOOKS:** the Bowl is a `COURSE` entry with no price, so the menu refuses it (`isCourseUnlocked`), and the show's events are not laps. The Scrapdome, Pit and Salt Flats are venues in `ARENA_VENUES`, kept out of `COURSE` so they never show in the circuit picker, and entered by `startArenaEvent`. Recommended: BOWL-HOOKS moves the Bowl to a venue started by the show, and removes the `COURSE` entry. As a course today, two things the review found are wrong and a venue cures both: the start places of computer trucks (game.js, 16 m apart from 20 m behind the line) wrap round the 140 m ring into the crush line and onto the ramps, and the on-foot and boarding limits read the floor's walls only for venues (`onfoot.js`, `crew-gear/boarding.js`), so they still allow 21 m.
