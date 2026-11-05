# SHIPS-JOBS

The short board entry controls current state, ownership, dependencies and locks.

`src/world/jobs/ships-in-the-sand.js`, the block in `docs/story/ships-in-the-sand.md` section 5 as it stands. The `SHIPS_WORK` rows in that block become content rows under `src/town/content/`, using the town's own dispatches and sites, and each job's `opensWhen` goes to the chapter graph. A scripted town proves no job opens before its work is finished, and that the NEXT line always names what is under way. `src/story/ships-save.js` under `profile.story.ships` through `registerStory`: marks only rise, nothing is ever wiped. Fill `{aground}` the way Long Dry section 10 does. Chapter 23 added as a row in the chapter data under `src/town/content/`, opening once chapter 22 is done, the town has reached Year 15 and at least one game year has passed, with its NEXT line and a report. `src/town/town-links.js` reads what the rewards name: the Baron's peace job closed, Deck Town's standing, Isolde in town, the boat at the north gate, and `sea-works-open` for Act 5. The job's `what` is the one screen line. A driver with no Titan and no rally car can always do job 6 in the show truck.

**Easy proof:** `tools/test-ships-easy.mjs`: a child-pace test driver wins each of the six jobs and Lamp Oil on Easy at least 8 times in 10, headless, starting with neither the Titan nor the rally car. If a job cannot reach that with its own settings, stop and ask Claude. Never change shared numbers.

**Other checks:** the save marks in a small test; replays for existing courses unchanged. One independent review (saves).

Design: [docs/story/the-long-dry.md](../../story/the-long-dry.md), [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) sections 2, 3, 10, 11 and the checks in section 15. Read `docs/story/ships-in-the-sand.md` first. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
