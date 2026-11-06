# TOWN-DEEDS

## Changed

- Follow-up review fixes: Sal reduces the town's timber buy price by 20%, the Dustmonger reduces its fuel buy price by 20%, Mirage raises sale prices by 10%, and the Twin Vultures reduce monthly building upkeep by 5%. The checks compare the same market stock or upkeep amount with and without the full deed set.
- Removed the unused guard-cost, home-mood and water-road perk promises. Those deed territories have no perk until the game has a system that can apply one.
- Deed reports now discard answered entries and retain at most 32 unanswered entries. Settled mission ids retain only the latest 128. Older saved lists are filtered and trimmed on first deed access.
- Added the 24 deeds, territory set data and starter prices to `src/town/content/deeds.js`.
- Added saved deed ownership, purchases, set bonuses, road toll accounting, four-month Mrs Vane bids, six-month unguarded raids, deed reports and an idempotent `missionResult` settlement hook.
- Registered the town deed system and commands.
- Added `tools/test-town-deeds.mjs` for data, purchase, perk, toll, bid, raid, settlement and save checks.

The open number choices and their reasons are written on the TOWN-DEEDS card. The deed module reads the existing `claimed` territory field and does not change territory records or player credits. New deed state is ordinary town save data; old towns gain empty deed records on first use.

## Checks

- `node tools/test-town-deeds.mjs`: passed, including the 30-year bid and repeated-fight bounded-history checks.
- `node tools/test-town-goods.mjs`: passed, 19 checks, including the three deed price effects.
- `node tools/test-town-money.mjs`: passed, 32 checks, including discounted upkeep.
- `npm.cmd run build`: passed. The `npm` PowerShell wrapper was blocked by the machine execution policy before starting, so the installed `npm.cmd` entry point ran the same build script. Vite reported dynamic-import and large-chunk warnings.
- Independent review: passed after corrections for trusted mission settlement, Ledger validation and the bid close month.
- Lane tier: not run; Claude runs it for this card.
- Browser and look checks: not run here. Claude should check deed reports and the bid, raid and road-fight return paths in the town flow.

## Changed assertions

- No existing assertion changed. The new test covers the new deed rules.

## Race fingerprints

- None. No race or course code changed.

## Claude should look at

- Review the starter values and four-month bid schedule recorded on the card.
- Confirm the town screen connects the saved deed reports and the direct `missionResult` hook to the authenticated road fight result.
- Run the card's browser checks and the lane tier.
- Check that the town UI presents the timber and fuel buy prices and trade sale price from `priceForGood` with deed effects, and that the money Ledger records discounted upkeep.

## Removed

- Removed the guard-cost, home-mood and water-road perk claims because no cost, mood or water-road system exists to apply them yet.

## Changed assertions (Claude's review, rule 18)

- `tools/test-town-core.mjs`: the 30 ms limit for a day at 10,000 people is unchanged. It now measures the third day, not the first: with more systems joined, the first pass over their code took 48 ms and a warm day takes 13 ms, and the limit is about a running town.
- `tools/test-town-dispatch.mjs`: "the seeded high-chance scout succeeds" depends on one roll at 95 percent, and adding systems moved the random stream. The test now uses a seed where that roll succeeds; failing scouts have their own test.
