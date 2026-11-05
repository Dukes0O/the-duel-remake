# TOWN-MONEY

## Changed

- Added a deterministic monthly money system with a double-entry Ledger, a one-time 1,500 scrap grant, resident rent, shop and ticket sales, staff wages, building upkeep, loan interest and ownership/debt summaries. Internal amounts use `BigInt` so town money does not stop at the safe-integer limit.
- Added `tillIn` and `tillOut` commands. They move scrap between the town till and the supplied Wasteland profile; withdrawals return half to the player and keep half in the town. Finished buildings can set ticket or shop prices to Cheap, Fair or Dear.
- Unpaid buildings stop and carry a plain reason. After three short-till months, Hollis loans enough to meet the bills; interest is capitalized monthly and surplus cash repays principal while leaving one month's costs in reserve.
- Chosen starting prices, wages and loan rate are recorded on the card for Claude's review. Rent, wages and upkeep use the real figures named in `docs/WASTELAND_TOWN.md`.

## Checks

- `node tools/test-town-money.mjs`: passed, 31 checks. Covers the grant, till transfers and levy, price choices, rent and sales, wages and upkeep, stopped buildings and recovery, Hollis's loan and interest, save/load, balanced double entry, and a 30-year run.
- `npm.cmd run build -- --outDir .qa-dist/town-money-build`: passed. PowerShell blocked the `npm.ps1` wrapper, so `npm.cmd` ran the package build script. Vite reported its existing dynamic-import and large-chunk warnings.
- Lane tier: Claude runs it. Browser and look checks: not applicable to this headless simulation module. Claude should review the selected ticket/shop prices, the 1% monthly interest, the rent and wage defaults, and the loan and repayment behavior before TOWN-PACE tunes them. No browser surface is wired yet.
- Existing assertions changed: none. One new interest assertion was adjusted to run the month after Hollis's third short-till month, when interest first accrues. No assertion or tolerance was weakened.
- Race fingerprints and world signatures: unchanged; this card has no race hooks.

## Removed

- None.
