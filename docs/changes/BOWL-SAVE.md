# BOWL-SAVE

## Changed

- Added pure Bowl save operations for event best scores and night rewards in
  `profile.bowl`.
- Added once-per-night awards. Scrap goes to the existing
  `profile.wasteland.scrap` wallet; nights, trophies, paint, bolt-ons and
  settlement receipts stay in `profile.bowl`.
- Recorded the wallet choice on the card before implementation. Newer Bowl
  save versions are left untouched.

## Checks

- `node tools/test-bowl-save.mjs` — passed, 122 checks. It covers rising
  records, idempotent settlement, prizes and scrap, all existing save
  fixtures, and save/backup/restore in memory-only storage.
- `npm.cmd run build` — passed. PowerShell blocked the `npm.ps1` wrapper, so
  the same build ran through `npm.cmd`. Vite reported its existing dynamic
  import and large chunk warnings.
- Lane tier — not run, as requested; Claude runs it.
- Browser and look checks — Claude runs after the Bowl screens are integrated.
  Check a won night's trophy and purse, ensure replaying settlement pays once,
  confirm a loss can be retried, and inspect how saved paint and bolt-ons are
  shown in the Bowl and Career screens.
- Replay fingerprints — not run. This save-only module does not touch race
  state, physics or replay code.
- Independent save review and the broader save checker — pending Claude's
  integration review.

## Changed assertions

None. The new assertions check this card's save behavior.

## Removed

None.
