# LAB-TRY-PICTURES-DIAL

Design: keep every answer picture visible at its existing size. Move the tunnel
picture row below the header, above the low dials and road controls and beside
the Key idea card. Leave the text and on-screen controls at the bottom.

Checks: run the tunnel scenario at 1280 x 800 and 1440 x 900, checking the
machine controls while pictures are visible; run the Lab suites, lane tier
with two jobs, and build. Claude reviews the two window-size pictures.

Changed assertions: strengthen the tunnel scenario to check each machine
control before choosing a picture, rather than only its first control.

Results: the 18 tunnel lesson tests pass. Independent code review found
no defects. All five lessons pass the 1280 x 800 browser scenario, including
every exposed control on each Try. Zero warnings or errors. The requested
1280 picture is saved in Claude's scratchpad. The final 1440 scenario and shared
lane/build results for these two cards are recorded in
LAB-BENCH-PANELS-REMOVE.md. Claude owns the two-picture look check.
An initial 75px picture reduction failed Downforce's dial hit test, so it was
replaced by the row move above. No assertion was relaxed.

QA setup: Vite's default config loader tried to write through linked
node_modules. The temporary QA command uses --configLoader runner instead.
Chrome needed native process access. No dependency or harness change ships.

## Removed

None. This adjusts the existing picture row.
