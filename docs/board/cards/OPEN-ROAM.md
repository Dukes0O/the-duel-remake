# OPEN-ROAM

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol** (Kyle, 20 November 2026: Sol builds what is not graphics or physics).
[STORY-OPEN-WORLD](STORY-OPEN-WORLD.md) cut this card from `docs/story/open-scablands.md`.

## What to build

Sections 10, 13 and 14.

1. **The step `roam`.** A step kind that never completes and holds nothing. A world job of that one step starts with
   the player on foot at Tin Town's hearth and the car at the gate. It ends when the player chooses to leave from the
   pause menu. With `story-choices` on, the Story Wall's ledger panel gets one button, "Go out into the Scablands".
2. **The routine rule.** `routinePose(routine, seconds, seed, partOfDay)` returns where a person is, the heading and
   the task, for the three kinds `track`, `wander` and `post`. Each walking step goes through `stepMover`. A walker
   steps aside for a car. `advanceStoryPeople` learns to loop a path; Night 2's placements are unchanged.
3. **The people table,** with routines for the figures in hand: Auntie Solder and Cinder always, and the Walkers when
   the ledger says they live inside the fence. Day, dusk and dark routines for each.
4. **Talk by walking up.** Within 2.5 m, the on-foot use key (F) starts a talk. The person stops and faces the driver
   (`attendTo`) and returns to the routine afterwards by walking. The talk is the first row of the person's talk table
   whose conditions are true. Walking away ends a talk with no choice made; questions asked stay asked.
5. **The conditions function** `isTrue(fact, world)` for the facts that can be read today (`word`, `mark`, `made`,
   `feud`, `stock`, `night`, `draw`, `all`, `any`, `not`). OPEN-STATE adds the rest.
6. Two greeting lines for each person for each of the five words, and one line for each that reads a Night 2 mark.
   Claude writes them into this card's "Claude answers" before the build starts.

## Files and locks

New: `src/world/jobs/steps/roam.js`, `src/world/open/routine-rule.js`, `src/world/open/facts.js`,
`src/world/open/content/people.js`, `src/world/open/content/talk-tables.js`, `src/world/open/open-cues.js`,
`tools/test-open-roam.mjs`, `tools/test-open-routines.mjs`, `tools/scenarios/open-roam.mjs`.
Named hooks: one line in the `runners` table of `src/world/jobs/job-engine.js`; path looping in
`src/world/jobs/story-people.js`; the start method and the button in `src/app.js` and `src/screen-yard-home.js`; the
people's update in `src/arena/modes/world-job.js`. Lock: `busy-game-files`, for `src/app.js`.

## Checks

1. `tools/test-open-routines.mjs`: the same routine, clock and seed always give the same pose; a track loops and a
   wander stays inside its circle; over ten minutes of clock nobody stands inside a solid or crosses ground too steep
   to climb; a change in the part of the day changes the routine by a walk and never by a jump.
2. `tools/test-open-roam.mjs`: a roam job is not done after an hour of steps and holds nothing; a talk starts only
   within 2.5 m, the person faces the player, and walking away leaves the choice unmade; with the switch off the button
   is absent and no roam job can start.
3. Laptop only: the browser scenario `open-roam` (walk from the hearth to Cinder, talk, walk away, drive out of the
   gate and back).

Rule 23 (behind an off switch): the checks above, then
`node tools/run-tests.mjs --jobs 4 --filter core --filter test-replays --filter test-combat-replays --filter test-world-composition`
with a `--filter` for each suite named above, and `npm run build`. It merges when that is green. Claude drives it in
the merged batch.

## Sound cues

`open.talk.hail`: a person noticing the driver, small and close. Named in `src/world/open/open-cues.js`; OPEN-SOUND
registers it.

## Claude answers

The lines of item 6 (21 November 2026). The word read is the person's own (`auntie-solder`, `cinder`).

| Who | When | The line |
| --- | --- | --- |
| Auntie Solder | Sworn | There you are. I've kept a bowl of soup warm for you, and I don't do that for just anybody. |
| Auntie Solder | Friendly | Come and sit by the hearth for a minute. You look as if you've been out in the wind all day. |
| Auntie Solder | Strangers | You're the one who carried the fire in. I haven't made up my mind about you yet, so mind the soup. |
| Auntie Solder | Wary | I'm counting the embers again tonight. I count them more often when you've been near the store. |
| Auntie Solder | Cold | The hearth is for the town. You can warm your hands, and then you can find something useful to do. |
| Auntie Solder | The mark for giving Rell an ember | I hear the Walkers have a fire at the Wash tonight. That was our ember, and I still think it was the right thing to do, most of the time. |
| Cinder | Sworn | I'd trust you with the kiln, and I've never said that to anyone before. Please don't tell Auntie that I said it. |
| Cinder | Friendly | The kiln is drawing well today. If you stand here for a moment, you can feel the heat through the door. |
| Cinder | Strangers | Mind the kiln door, because it's hotter than it looks. I say that to everybody once. |
| Cinder | Wary | I keep one lump back from every batch now. I never used to feel that I needed to. |
| Cinder | Cold | I've nothing to say to you today. The kiln and I are both busy. |
| Cinder | The mark for refusing the Walkers | The Walkers' camp is dark tonight. I can see it from the kiln roof, and I wish that I couldn't. |

## Rules for every open Scablands card

Design: [docs/story/open-scablands.md](../../story/open-scablands.md), the sections this card names; it wins over this
card where they differ. Everything is behind `story-choices`, and nothing the released game does with that switch off
may change. A rule is a plain function that returns new data and reads no graphics. Every draw is a named draw from the
save's seed (`src/rng.js`, as `namedThrow` in `src/story/ledger.js`). Every position is written with `land.at` or
`land.between` (`src/world/scablands-names.js`). Content is rows in tables: adding a person, a building, a checkpoint, a
site or a thread must need no change to a rule. Every word a player reads is a whole plain sentence with no em dash.
Stay inside the files named here. If another file is needed, write the choice under "Codex decided (Claude to review)"
and carry on, unless it touches saves or a released course; then stop and say so. Before CARD DONE, search `tools/` for
every older suite and scenario that names what this card changes, and run them. Checks use memory-only saves. Do not
clean up anything in Claude's scratchpad. A commit from the lane needs approval: rerun git and ask for it. Write
`docs/changes/OPEN-ROAM.md` with a **Removed** line.
