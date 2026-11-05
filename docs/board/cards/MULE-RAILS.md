# MULE-RAILS

The short board entry controls current state, ownership, dependencies and locks.

`docs/story/iron-mule.md` section 5 is the design and section 4's data shows every field. Build what the two stories need and no more: `src/world/iron-line.js` (the line from section 4, smoothed into a curve, both arcs of the Deck Town loop, the rail gate spur), step kinds `src/world/jobs/steps/board.js` and `drivetrain.js` added to the runners, the train as a job actor with roof plates moving with it, `lentCrew`, the line player `src/world/jobs/step-lines.js`, and the fix to `stepReach`'s marker. Named hooks in `src/arena/modes/world-job.js`: passing the train's progress and speed in the view, and W and S going to the train during a `drivetrain` step. Other modes do not change. Race state stays repeatable from seed and inputs; the renderer only reads.

**Checks:** `tools/test-iron-line.mjs`, headless: a driver holding W from the slowest start breaks the gate; one who brakes bounces back and can go again; falling off keeps the plate reached; the train stops at its buffers and waits; a loan leaves the save untouched; two runs with the same seed and inputs match. `tools/test-everburn-easy.mjs` still passes unchanged.

Sounds: `train.whistle`, `train.gate-break`, `train.run`, each from existing banks if one fits (say which).

Design: [docs/story/the-long-dry.md](../../story/the-long-dry.md), [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) section 9 and 13. Read `docs/story/iron-mule.md` first. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
