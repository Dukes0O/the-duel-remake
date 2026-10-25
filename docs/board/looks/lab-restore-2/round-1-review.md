# LAB-RESTORE-2: installation pictures

25 October 2026. Visual installation check: pass. This uses the accepted
SIRENA-WRECK-ART model; no new art was made.

The large frame shows the actual Sirena racing at 57 km/h in Sea wreck.
Faded red, pale crust and the weathered stripe remain visible from the chase
camera. The lower frames show the 1,000-credit offer, mechanical work with
crust intact, the separate rebuild/paint show after the 1,500-credit purchase,
and the garage with both finishes owned. The scenario also switches back to
Sea wreck for free. Wheel, steering, driver and damage hooks are checked
against the real GLB in `test-vehicle-assets`.

`round-1.jpg` is 225,003 bytes, below 500 KB. These are private, memory-only scenario
pictures, not live-player data. This is a race picture, not a frame-timing
measurement. No performance claim is made from the screenshot.

To rebuild: run `tools/run-browser-scenarios.mjs --scenarios lab-restore
--jobs 1` and use its `lab-restore` captures. Compose a 1120-wide JPG: the
`restore-sea-wreck-racing` image at 1120 x 630, then two rows at 560 x 315
(`restore-offer`, `restore-4-strip`, `restore-6-paint`,
`restore-both-finishes`). Preserve each picture's aspect ratio, add short
labels, and save at JPEG quality 80. Raw pictures are recycled after this
verdict is committed.
