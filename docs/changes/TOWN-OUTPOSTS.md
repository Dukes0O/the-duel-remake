# TOWN-OUTPOSTS change note

## Changed

- Added data for Dot, Miss Quill, Old Tam, Captain Imre and Pim, with chapters 11 to 16 scheduled from Years 3 to 7.
- Added saved standing, capped at -100 to 100, with delivery, protection, raid, enemy-help and yearly drift changes.
- Added repeatable neighbour reports and flatbed trade convoys. A trade removes its cargo from a stockpile, moves at 30 km/h over its data route, restores reward goods on arrival and then raises standing.
- Recorded protection payments through the town Ledger as monthly protection income.
- Made Bo's captions follow his age: before 16 his visit line is hidden, at 16 to 17 he asks to drive, and from 18 he has his own truck.
- Added the Act 2 chapter data to the default chapter flow. The needed scope choice is recorded on the card under “Codex decided (Claude to review)”.

## Checks

- `node tools/test-town-outposts.mjs` — passed. Covers standing bounds and drift inputs, trade cargo and convoy arrival, report recurrence, protection income and ledger balance, chapter timing, and Bo's age lines.
- `npm.cmd run build` — passed. Vite reports the existing `src/game.js` dynamic-import warning and large bundle warning.
- Lane tier — not run, as requested; Claude runs it.
- Browser and look checks — not run, as requested for this job.
- Race fingerprints and course world signatures — not run. The change is confined to town simulation and story data; no race or course code changed.

## Claude should look at

- In the town flow, complete Acts 1 and confirm chapters 11 to 16 appear in order from Years 3 to 7.
- Confirm the town Ledger shows protection income and remains balanced after monthly settlement.
- Confirm the town view or browser scenario can surface a flatbed convoy on its route and its delivered goods. This card adds the deterministic convoy simulation; the current town view does not yet draw convoy agents.
- Check Dot's repeat report after the prior report is answered, and Bo's captions at ages 15, 16 and 18.

## Changed assertions

None. The new assertions are in the card's own test.

## Removed

No old behavior or files were removed. The temporary build log was deleted after review.
