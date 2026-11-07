# TOWN-WMAP-UI

## Changed

- The town routes every command through `stepTown`; its optional context reaches the dispatcher, so deed purchases and bids receive the player's profile.
- The Ledger shows the wallet and till, offers deposits of 100, 1,000 or the recorded shortfall, and labels withdrawals with the amount returned after the half-town levy. Successful transfers save the profile and town. Visiting players see no transfer buttons.
- A deed refusal caused by a short till offers a one-press deposit for the exact missing amount when the wallet can cover it.
- The Wasteland map scenario now gives its QA player in-memory scrap, checks refusal at an empty till, funds the till through the map button, buys The Pipe Road, and checks the price leaves the till.

## Checks

- `node tools/test-town-money.mjs`: passed, 38 checks; Ledger balance held through 30 years.
- `node tools/test-town-wasteland-map.mjs`: passed, 35 checks.
- `node tools/test-town-visits.mjs`: passed; visited-town data remains read-only.
- `node tools/test-town-hooks.mjs`: passed.
- `node tools/test-town-panels.mjs`: passed, 35 checks.
- `node tools/test-town-health.mjs`: passed.
- `npm.cmd run build`: passed. Vite reported its dynamic-import and large-chunk warnings.
- Lane tier and browser scenario were not run, as requested. Claude should run `tools/scenarios/town-wmap.mjs` and check the refusal, one-press deposit, purchase, and updated till amount.
- Race fingerprints: not applicable; race code and rules did not change.
- Changed assertions: none. New assertions cover context routing, exact wallet/till movement, the empty-till deed purchase, Ledger controls, and read-only visits. No existing assertions were weakened.

## Claude should review

- Run the browser scenario and confirm the map refusal offers the correct deposit, the real button funds the till, The Pipe Road purchase succeeds, and the till drops by its price.
- Check the Ledger wallet/till display, deposit controls, withdrawal levy wording, and absence of transfer buttons on look-only visits.
- Check the existing map paper, roads, cloud fog, deed cards and dispatch cards remain visually sound.

## Removed

- Removed the deed purchase and bid special case that dispatched outside the town session.


## Claude's fixes

The browser check found that the map's Return to the town button did nothing, because it read its empty attribute as false; a test now covers it. One review pass found the wallet and town saves could disagree silently: `saveWalletChange` now waits out a save under way and tells the player if either save did not take. It rejected the first review's point about `dispatchTownCommand` by giving `stepTown` an optional context, so every command takes the one route.
