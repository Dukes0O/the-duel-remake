# LAB-UX-FIXES: the last of the old five-step lesson frame

**Changed.** The frame's modules went in LAB-LOOK round 7; `repo-audit` finds no unused module and nothing names
`lesson-frame` or `lesson-pictures`. Its leftovers go now. The panel looks the same and stays for the notebook and word meanings.
**Still in place:** titles stay whole (`test-lab-title-words`); G-force ends on "Start the lap"; `docs/LAB.md` says
10 m and 420 seconds and names no `lab.py`; no `@media` rule in the Lab's styles; one gold and one off-white.
**Checks on b65cf65.** `test-lab*`: 33 of 34 (`test-lab-fan` after deepening the shallow clone). `test-lab-radio`
fails the same way on the base: its byte-for-byte rebuild needs the laptop's ffmpeg. Rule 23 set: 4 of 4. Lane tier:
29 of 31; `test-full-check` needs PowerShell, and `test-heli-mode` fails the same way on the base (`heliceiling.js`
imports `heli-flight.js`, from the far-jobs work). `npm run build` passes. No assertion changed.
**For the laptop:** `test-lab-radio`, `test-full-check`, then every `lab-*` scenario: `lab-navigation` first (its
selector changed), `lab-view`, `lab-walk`, `lab-polish`, `lab-restore`, `lab-brian-faces`, `lab-fan-view`,
`lab-tune-view` and the seventeen `lab-classroom*`.
**Removed:** the `.lab-teaching h4` and `button:disabled` rules in `lesson-ui.css`, the step-action split in
`lesson-ui.js` and the `[data-teach="back"]` selector in `lab-navigation`, which nothing renders.
