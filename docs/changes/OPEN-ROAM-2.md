# OPEN-ROAM-2 · Tin Town in the open Scablands

Tin Town's five residents have daylight rounds, work poses and dusk or dark routines. Greetings close at the caption reading pace using the existing `open.talk.hail` cue.
Roam has a blank objective and an Out in the open pause card. The weapon lowers in town or near a found non-hostile camp and raises on nearby threats or fire.
The painted FORGE and WASH signs sit above their doors. Each map adds the corresponding spanner or bucket after the first conversation records the existing meeting fact.
**Removed** The greeting's one-option Walk away menu and the generic objective and race pause copy in roam.
**Checks** Node 22.23.5, memory-only. At `3c65604bf` the Rule 23 and affected older set passed 43/43 and `npm run build` passed.
At `c4b6acdb9` the Rule 23 and touched suites passed 14/14 and the build passed. Guards checked core, 306 replay fingerprints, 12 combat replay fingerprints and 65 world-composition assertions.
At `268a434c3` with `a83c0f1ab` integrated, the open-land compatibility checks passed 8/8 and the build passed.
**Changed assertions** The town cast count now includes the three new residents. The greeting checks timed lines and closure. The routine collision assertion measures residual penetration, to distinguish actual overlap from floating-point contact.
**Codex decided** Use the existing caption reading time and ledger meeting fact. Claude approved the shared hooks. Roam starts by day and the tests supply dusk and dark through the existing phase input.
**For Claude to run** `node tools/run-browser-scenarios.mjs --scenarios open-roam --jobs 1` and the merged build. Review the daylight picture, 40 m sign legibility, and the lowered and raised weapon poses.
The scenario expressions parsed and the memory-only drive framed at least three moving people. The browser picture and visual review are pending.
