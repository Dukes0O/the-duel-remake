# QA-BORER-SUITE-TIME: one file outside the card

**What needs deciding.** The card names `src/machines/borer.js` (spoil planning) and `borerLandRefusal`. With
those alone, the borer suite falls from 127 s to 87 s in the cloud container (about 150 s on the laptop by
the ratio), still over the 120 s target. After them, about 11 of the 15 s a mesa bore takes is inside
`src/world/ground-edit.js`: every fill and cut builds its empty result with `Object.fromEntries`, the reserved
ground check calls `Math.hypot` for every reserved place, and a bored cut reads the same ground cell's natural
height 32 times.

**Options.**
1. Keep the second commit, which touches `src/world/ground-edit.js` only with changes that give the same answers
   to the last bit: a literal empty result (same keys, same order), a skip before `Math.hypot` when one axis
   alone is already out of reach (the distance is never less than either offset), and one read of the cell for
   the 32 strips of a bored cut. A side-by-side run of the old and new file over 120,000 mixed cuts, fills and
   questions gives identical results, revisions and saves, and the four mesa bores keep their fingerprints.
2. Drop that commit and slice a separate card for `ground-edit.js`.

**Pick: 1.** It is what takes the borer suite under the laptop's 120 s. It is one separate commit, so
dropping it is a revert of that commit alone.
