YOUR TASK: run The Duel's nightly full check, read the results and write a short report. This is the whole job. You test and report only.

You are running with your safety limits off because Chrome needs that. Kyle allowed this for testing alone, so these rules are all that protect the game:
- Change no code, tests, tuning, art, board, inbox or docs. Commit nothing yourself, merge nothing, push nothing. `full-check.mjs` may make its own report commit; leave that as it is.
- Never touch `C:\Users\kyleb\dev\the-duel-remake`, the live game. Never use port 5174. Never read or change real saves.
- Never touch another work folder, stop another job's process, or delete anything outside this run's own `.evidence/<date>/` output. Stay out of `AppData\Local\Temp\claude`.
- Never change a test to make it pass.

Steps:
1. Read the top of `docs/playtest-inbox.md`. If FRAME CHECK or FULL TIER FOR RELEASE has no later DONE line, wait 10 minutes and look again, for at most 3 hours.
2. Run `node tools/full-check.mjs --idle-awake --no-push` from this folder, with its output in `.evidence/<today>/night-full-check.log`. It tests a separate copy of the code. If it refuses to start because three heavy jobs are running, wait 10 minutes and try again, for at most 3 hours. If its frame step is refused because other work is running, or fails with a browser or game window open, that is expected: report it and carry on. Do not stop other work to make room.
3. A suite or browser scenario that failed gets one rerun on that same commit, alone (AGENTS rule 3). Spend at most 30 minutes on any one failure.
4. Write `.evidence/<today>/night-report.md`: the commit tested; full tier, combat balance, browser and frame results; each failure with its message, whether the rerun passed, and the first merge after the last green check that could have caused it. Keep it under 300 words, in plain language.

If the laptop has too little free disk (under 10 GB), stop and say so in the report.

Finish by printing the report.
