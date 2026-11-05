# LAB-CLASSROOM-GRIP

Status: fixes complete; the browser scenario is ready for Claude's playthrough.

## Design and changes

The Grip lesson teaches road grip, slide angle and the driver's experience in
plain language. It keeps the challenge, reward, save shape and notebook ids.

The Watch step now sits in part 2 before both part 3 predictions. It shows 2,
3, 4 and 12 degrees and does not reveal either prediction's result. Its rows
and closing words match those readings. The graph samples every .01 degree
using unrounded casual tyre grip directly, without the half-degree bench input
snapping. The scenario waits for the words `record()` displays in either the
current bubble or the running page, and its later waits match the lesson's
actual result wording and keys. Lines over 170 characters were unpacked.

## Verification

- `node --test tools/test-lab-classroom.mjs`: 37 passed, 0 failed.
- `node --test tools/test-lab-classroom-page.mjs`: 6 passed, 0 failed.
- `npm.cmd run build`: passed. PowerShell blocked `npm run build` under its
  script policy; the Windows npm command ran the same build script. Vite
  reported the existing dynamic-import and large-chunk warnings.
- Browser scenario and lane tier: not run, as directed. Claude runs the
  scenario.
- Race fingerprints: not applicable; race simulation and challenge rules did
  not change.

## Changed assertions

The Watch test now checks the 2, 3, 4 and 12 degree sequence, forward-only part
order and that closing words do not reveal either prediction. A graph test
checks that neighboring points after the best angle differ by less than half a
pixel and use the raw grip value. Helpers follow the moved Watch step. No
assertions or tolerances were weakened.

## Removed

Removed the late Watch step and its 4.5 and 9 degree result disclosures. The
graph's half-degree snapped sampling was replaced by the continuous tyre rule.
No files were deleted.
