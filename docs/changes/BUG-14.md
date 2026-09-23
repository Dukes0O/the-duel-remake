---
task: BUG-14
status: merged
kind: combat-balance-fix
flag: none
player_facing: yes
---

## Legacy police in Wasteland

The spec's Q5 turns radar traps and police off in combat events. Pacific Canyon
still triggered a pursuit in Wasteland. A Medium no-weapon balance run received
a 20-second police ticket, which distorted the UFO time-gain comparison.

Wasteland now starts without a police pursuit, and its radar and ticket paths
return before changing race state. Ordinary Duel races keep their existing
radar and pursuit behavior. Raider encounters are separate later content.

The focused `test-wasteland-police-off.mjs` fixture failed before the change:
the Wasteland radar triggered. It passes after the change and confirms that an
ordinary race still triggers its pursuit. `test-npc-yielding.mjs` (43,174
checks), `test-busted-quit.mjs` (280 checks), and all 162 replay fingerprints
pass on this branch. The combined integration branch has a separate BUG-13 /
BUG-07 CPU-hit regression: Medium Pacific Canyon fell from five to one hit.
With legacy police removed, the exact CPU fixture now passes Pacific
Easy/Medium/Hard 1/2/10 and Titan Arena 0/5/10. The changed lane passes
83/83 suites in 325.09 seconds, and the production build passes.

The balance report still fails its separate acceptance gate: no-UFO ten-race
wins are Easy/Medium/Hard 10/6/2, while stock UFO gains are 9.55/45.52/22.11
seconds and max-level gains are 26.27/62.24/76.18 seconds. These are measured
on the old UFO implementation; BUG-04's exact warp rules remain isolated.
The live game remains untouched.

Exact integration with BUG-13 passed 158/158 merge suites in 291.74 s,
production build, and private High/Performance browser smoke with four
screenshots and zero warnings or errors.
