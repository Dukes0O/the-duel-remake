# OPEN-MAP-2 · Round two of the Scablands map

The open job's big map shows the original terrain colours across adjoining driven squares. Its 44% paper wash fades over 100 m at the boundary, leaving the relief sharp. Both maps draw the found site's ring and square at three quarters of the usual size.
Rule 23 on Node 22.23.5 at `5cf1c6eae` passed core (804), race replays (306), combat replays (12), world composition (65) and the production build. Fingerprints and signatures held.
All eight older suites naming scablands-map passed there: scablands-map, scablands-job-map, scablands-size, everburn-job1/2/4 and everburn-play-fixes-a/round4.
The open-map check initially failed because its recorder returned a fresh function for an unset canvas property. At `1d7c34751` the corrected recorder and all three guards passed. Game code is identical.
At `1d7c34751` a raster sample retained full terrain RGB across a driven seam and measured wash coverage from 44% to zero at its outer edge. All 15 browser expressions parsed. The memory-only simulation drove 1.5 km over squares 70–73.
**Changed assertions.** Replaced the count of hard square holes with checks of wash bounds, layer order, continuous driven ground and feather width. Both maps must put a smaller mark at a found site and omit it before discovery.
**For Claude to run.** Run the memory-only `open-map` scenario on the laptop and inspect the two maps on round-2.jpg. Look for hill detail through the wash, a rich driven strip without seams, the Glasshouse mark clear of the car and the named Radio Hill rumour. Review the assertion changes and build the merged result.
**Codex decided.** The fixture uses land seed 2 and stops northwest of the Glasshouse. The cloud did not capture or visually judge the sheet. The scenario retires round-1.jpg only after writing round-2.jpg.
**Removed.** Replaced the hard-edged wash and full-size fallback mark for found sites in open jobs.
