# QA-EVIDENCE-MIDNIGHT-AGAIN

Found by Claude at 00:35 on 20 November 2026, after the one-clock cure (QA-EVIDENCE-DATE-BOUNDARY) merged on 19 November:
`tools/test-review-evidence.mjs` case 4 failed again just after midnight in a folder whose `.evidence/` held a `2026-11-19` folder
from runs earlier that night: "crew browser and Blender must share round 1 raw evidence: ...\.evidence\2026-11-19\crew\round-1 vs
...\.evidence\2026-11-20\...". One side still names the day by something other than `evidenceDate` (likely the Blender or fidelity
planner's Python `date.today()` read at a different moment, or a tool that reuses the newest existing day folder). Find which side
said 19 November, make both take the day from one place at one moment, and add a case that runs with a previous day's folder present
just after midnight. Unreliable-suite card under rule 3: it does not hold merges.
