# TOWN-VISITS

## Changed

Each player now gets a town with a player-specific seed and id. THE TOWN opens the current player's town. Towns saved by the earlier shared build, or older towns without an owner, go to the first player who opens them. Players can visit another town from THE BOOK, or from Hollis's note before making their own town. Visits show the town name and owner, allow looking around, and return to the player's town or yard. The player's town saves before a visit opens. Visits do not advance, save, back up or recover the visited town. Damaged entries stay readable and lead to the store's plain error screen. Career backup verifies towns with BigInt ticks, and imports reject town pointers that do not match their town records. Build commands receive the visit refusal sentence. Complete career export and import keep every town and preserve its BigInt clock value.

## Checks

- `node tools/test-town-visits.mjs` — passed. Covers different player ids and seeds, complete export, backup and import with both owners, BigInt ticks, pointer mismatch rejection, read-only screen controls, and legacy ownership.
- `node tools/test-town-hooks.mjs` — passed.
- `node tools/test-town-store.mjs` — passed.
- `node tools/test-career-backup.mjs` — passed, 88 acceptance checks reached.
- `npm.cmd run build` — passed. Vite reported dynamic-import and large-chunk warnings.
- Lane tier — not run, as requested.
- Browser and look checks — Claude should run `tools/scenarios/town-opens.mjs`, review `town-second-player`, `town-visiting` and `town-visit-return`, and confirm the second player name, visit banner, hidden build/speed controls, refused build command, unchanged tick and stored bytes after leaving, and return to the first player's town. Not run in this lane.

## Changed assertions

No existing assertions changed. Added `tools/test-town-visits.mjs` for this card's behavior.

## Race fingerprints

No race simulation or race fingerprint files changed.

## Removed

Removed the shared-mayor behavior in `src/town/town-entry.js` that made whoever opened the town a mayor. Visits also bypass town recovery writes so opening a damaged town for a visit cannot repair or rewrite it.
