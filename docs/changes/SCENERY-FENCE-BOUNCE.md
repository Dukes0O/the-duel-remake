# SCENERY-FENCE-BOUNCE
Cause: the CPU scenery response snapped its heading toward the road, rotating its nose into a thin fence; the next tick expelled that new overlap.
Fix: preserve world heading through sheet-wall contact and road-coordinate conversion; keep the swept entry face and 4 cm clearance.
Scope: Scablands box walls up to 24 cm thick, including gate leaves; thick solids, buildings and arena walls keep their existing path.
Measured at 120 Hz, three released cars, both faces, 20/40 mph: Tin Town CPU step back 1.237276–1.503345 m before; maximum 0.008820 m after.
Home Ground CPU panels: x axis 1.250430–1.517396 m before, maximum 0.011664 m after; z axis 0.486085–0.600997 m before, maximum 0.003722 m after.
New suite PASS: 72 native rams (player and CPU) plus 72 cross-sheet endpoints, including starting overlaps; entry-side body clearance and heading checked.
Checked base commit `af42cc8d` plus this final working patch: source blob `fc3535aa`, regression blob `2be668ed`; no code changed after these checks.
Required set PASS 9/9: core (804), replays (306), combat replays (12), world composition (65), arena shove (16,973), truck-wall (240 rams), home-ground (126), open-doors and new suite.
Lane `--tier lane --changed --jobs 2`: all 32 suites passed; only failed/unrun suites resumed after the initial tool failure. `npm run build`: PASS (existing chunk-size/import warnings).
Tool retries: full-check needed PowerShell launch permission; hygiene fixtures inside this lane needed `GIT_CEILING_DIRECTORIES` to avoid finding the parent repository. Both passed unchanged.
Assertions: new regression only; no existing assertion, released-car replay fingerprint, arena pin or world signature changed.
Browser checks and independent code review: Claude's handoff. No new event or sound cue. All saves used by checks are memory-only.
**Removed:** thin-sheet contacts' forced CPU road-heading snap. Generated test/build output cleaned; no replacement assets or old implementation kept.
