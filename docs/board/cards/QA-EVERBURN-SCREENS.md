# QA-EVERBURN-SCREENS

From the full check of 6 November 2026 (`docs/changes/FIX-EVERBURN-CARD.md`). `tools/scenarios/everburn.mjs` fails two facts. The yard's gate buttons (BACK GATE, DRIVE THE SCABLANDS, `scablandsGateMarkup` in `src/story/ember-ui.js`) are built and tested but never reach the yard: connect them, or if the yard's own route replaced them, remove the unused markup and move the fact to what replaced it, with Claude's written review. The result line is connected (`src/screen-results.js`), but the fact asks for an `app.storyResultLine` that never existed: make it check the line on the real results screen, which proves more. Do this before `story-everburn` is switched on. Rule 4: 30 minutes, then a note.

## Also seen (Claude, 10 November 2026)

Job 6's defend step shows its opening line as the raw id "everburn-job-6-start". WW-BOSS gave the chase step real words through
`captionFor` in `src/arena/modes/world-job.js`; the other steps' line ids still have none.
- Job 6 starts the car inside the well's derrick (Claude, 10 November, after EVERBURN-WELL-ART drew the well).

## Settled for the build (Claude, 12 November 2026; built by Codex)

- A step's opening line that has words in the story's line table shows its words. An id with no words anywhere shows
  nothing, never the raw id, and the builder lists those ids for Claude, who writes story lines.
- Job 6 starts the car on the approach road 30 m short of the well's derrick, facing it, clear of every solid, with a
  check that the start is clear of every solid of the well.
- Codex cannot run a browser under its protected mode: Claude runs `everburn`, `everburn-play` and `everburn-well`
  on the branch.

## Found in the first build, and decided (Claude, 12 November 2026)

- **The story's written lines were never shown in jobs 1, 2, 3, 5 and 6.** Those jobs ask for placeholder ids
  (`everburn-job-1-start` and fifteen others) while the written lines sit in `src/story/ember-lines.js` under their
  own ids. This replaces "an id with no words shows nothing": thirteen placeholders are wired to their written lines
  by each line's "when" (the table is in the change note), and Codex audits every written line for whether any job
  ever asks for it. Three placeholders have no written line (`everburn-job-2-exit`, `everburn-job-6-wave-restart`,
  `everburn-soup-spilled`): they show nothing until Claude writes one.
- **The yard's gate buttons are removed.** The yard's Next up button replaced the story entry. Driving the Scablands
  freely is not built; it gets its own card when the place is worth exploring (SCABLANDS-LAND's other places first).
- The start of job 6 is a field on the step, so that the job mode names no job.

## Third round (Claude, 12 November 2026, after running the browser checks on the second build)

- `everburn-play` and `everburn-well` pass; `everburn` timed out on a forced end of job 3. The result fact moves to
  `everburn-play`, which reaches Hot Delivery's real results screen.
- Four written lines with no trigger are said when the player comes near a place (the first barricade, Tin Town in
  sight, the planes in the Boneyard, inside the mall). "Raiders" (job 2) and "Bess hit" (job 4) are wired only if
  their steps raise an event.
- Two new lines, written by Claude: `story.ember.cinder.26`, Cinder when the well's defence fails and the wave
  starts again: "They reached the valve! I have shut it again. Same lot, once more."; and
  `story.ember.auntie-solder.12`, Auntie Solder when the soup spills: "That was my good soup! Come back. There is
  more in the pot, and less in my patience."
- **The map panel still showed the oval in job 1** (seen in `everburn-play`'s first picture): this morning's job
  map draws only a step with a path. Every world job in the Scablands now draws its own ground: the path, else
  origin to destination through its safe points, else the return path, else the step's named places.

## Result (built by Codex in three rounds; reviewed by Claude, 12 November 2026): merged

Change note: `docs/changes/QA-EVERBURN-SCREENS.md`. Every placeholder line id is gone from the Everburn's jobs and a
test keeps it so; 56 written lines, of which two are still asked for by nothing (`story.ember.cinder.7`, raiders in
job 2, and `story.ember.moss.2`, Big Bess hit: their steps raise no event). The yard's unused gate buttons are
removed. Job 6 starts 30 m short of the derrick. Every world job draws its own ground on the map.

**Changed and removed assertions, reviewed by Claude (rule 18).** The three checks of the removed gate markup went
with the markup. The scenario's gate fact became "the yard's Next up button starts Hot Delivery". The result fact
moved from a hook that never existed to the tick and Auntie Solder's line on Hot Delivery's real results screen in
`everburn-play`. The caption table grew from 54 to 56 with the two new lines. The map test's "a job with no path
gives today's map" became "gives a local map with 120 m of ground", by the third round's design. Nothing is
loosened.

Claude ran `everburn`, `everburn-play` and `everburn-well` on the branch (3 of 3), `test-review-evidence` and
`test-warlord-tollkeeper`, and on the merged result the build with `the-dig`, `field-battle`, `run-gas`,
`scrapdome` and `grand-prix` (5 of 5). Not confirmed from a picture: job 6's first view of the derrick.

