# TOWN-PANELS

Status: built in lane `codex/town-panels`.

## Design

The five UI modules expose read-only panel models and escaped markup. Reports can send answer commands and map-focus requests through callbacks. Teaching starts a measured machine demonstration through a callback; the panel does not create skill or work progress. The existing screen host is outside the card's owned files, so it will mount these modules in a separate card.

The Ledger uses the town's recorded journal, balance, loan and period totals. The Book renders the saved yearly pages and the chronicle in year order. People and building cards read their current records and content definitions.

## Checks

- `node tools/test-town-panels.mjs`: passed, 29 checks.
- `npm run build`: passed. Vite reported an ineffective dynamic import and large chunk warnings.
- Browser check: Claude should mount all five panels in the town screen, check report answer and map-focus callbacks, inspect person/building/site details and the Ledger and Book, and review the teaching wording and demonstration flow.
- Changed assertions: none.
- Race fingerprints: not run; this card does not touch race or replay code.

## Removed

Nothing was removed or replaced.
