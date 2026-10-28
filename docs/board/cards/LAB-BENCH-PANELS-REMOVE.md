# LAB-BENCH-PANELS-REMOVE

Since the sixteen five-step lessons replaced the bench panels, the old bench markup (dials, Run, readout) in `src/lab/lab-markup.js` and `src/lab/lab-view.js` is reached only by the Rust Restore and the wind tunnel's secret fan. The rest is dead player interface. Found by FC-LAB-SCENARIOS on 28 October 2026.

Done when: the unreachable bench panels and their styles are removed, Restore and the secret fan still work (`lab-restore`, `lab-fan-view` scenarios pass), `tools/test-lab-player.mjs` still runs every lesson's dial settings on the rules, and the change note lists what went under Removed. Run `node tools/repo-audit.mjs` before and after.