# WW-ART-WHITES

## Changed

- Kept the accepted photo-built works station. The clock is a 25 cm deep lathed drum with a clock picture on each side and no hands. Rebuilt its steps with two stringers that join the deck; removed the pale end-view bar and deck-end squares.
- Kept the irregular 16 m salt heap with several offset lobes, a low shoulder, slumped face and gullies. It feathers below ground without a rim and tiles the salt picture at about 5 m. The pan crust repeats at about 6 m with alternating quarter turns.
- Completed the photo-built dead conveyor, canteen, school hut, pay office and vane fence. The conveyor has an open frame and rollers. Each hut uses its own side/end photos, open doors and empty windows; the school gable has its measured bell, and the pay-office window is barred. The fence remains under 5,000 triangles and carries the clean VANE RECLAMATION sign.
- Rebuilt the complete family GLB and the review renders from that exported GLB imported into an empty Blender scene with Standard view transform. Added the round-3 sheet and review note.
- Added a credit for the salt-heap side reference. Its crop appears only on the sheet; the full reference is not in the game model.

## Checks

- `blender -b --python tools/blender/rail-whites.py -- --root .` - passed; all eight requested pieces built and exported, and side/quarter renders saved from the re-imported GLB.
- Family render from the exported GLB in an empty Blender scene - passed; composed all requested pieces on near-white ground at car height.
- `node tools/test-blender-output.mjs` - passed, 296 checks and 0 failed. The read-back Whites GLB is 46,854 triangles and 2,897,984 bytes.
- `node tools/test-repo-hygiene.mjs` - passed; repository placement clean, with existing size targets reported as advisory.
- Claude should inspect the round-3 sheet, especially the roof supports/gap, the salt heap at car height, and whether the family arrangement reads as one place.
- Changed assertions: none. Race fingerprints: not applicable; no race code or rules changed. Browser checks: not run; this art card is reviewed from the sheet.

## Removed

- Removed the round-2 sheet and review note when replacing them with round 3.
- Removed temporary family renders, trial reference copies, scripts and logs from `.qa-dist` before handoff.
