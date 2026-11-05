# GEAR-FIND

## Design

Added a rank-gated Things to Try list to the yard home behind `gear-find`. The
Armory lists Wasteland car weapons with their effect, rank gate, NEW marker and
FIT action for weapons the career owns. Scrapdome now keeps locked Ambush Alley
visible as disabled with its rank and progress bar. Rank thresholds stay as
they were.

## Checks

- `node tools/test-gear-find.mjs` — passed.
- `npm.cmd run build` — passed. Vite reported existing dynamic-import and
  large-chunk warnings.
- Claude: look at Things to Try on the yard home and the weapons list and FIT
  action in the Armory.
- Race fingerprints: no simulation or race-rule files changed; not applicable.
- Changed assertion: Scrapdome's locked-mode assertion changes from hidden to
  visible and disabled with rank/progress. A locked mode still cannot be
  selected or started. This is the card's stated behavior and loosens nothing.

## Removed

- Replaced the Scrapdome section 10 rule that hid locked modes.
