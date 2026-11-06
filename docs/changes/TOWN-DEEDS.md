# TOWN-DEEDS

## Changed

- Added the 24 deeds, eight territory set perks and starter prices to `src/town/content/deeds.js`.
- Added saved deed ownership, purchases, set bonuses, road toll accounting, four-month Mrs Vane bids, six-month unguarded raids, deed reports and an idempotent `missionResult` settlement hook.
- Registered the town deed system and commands.
- Added `tools/test-town-deeds.mjs` for data, purchase, perk, toll, bid, raid, settlement and save checks.

The open number choices and their reasons are written on the TOWN-DEEDS card. The deed module reads the existing `claimed` territory field and does not change territory records or player credits. New deed state is ordinary town save data; old towns gain empty deed records on first use.

## Checks

- `node tools/test-town-deeds.mjs`: passed.
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

## Removed

- Nothing. This card adds a new simulation feature and does not replace an existing path.
