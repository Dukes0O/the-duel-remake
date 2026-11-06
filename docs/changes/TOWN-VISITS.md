# TOWN-VISITS

## Changed

Each player now gets a town with a player-specific seed and id. THE TOWN opens the current player's town. Towns saved by the earlier shared build, or older towns without an owner, go to the first player who opens them. Players can visit another town from THE BOOK, or from Hollis's note before making their own town. Visits show the town name and owner, allow looking around, and return to the player's town or yard. The player's in-memory town is held during a visit and saved once on RETURN; its tick does not advance. Visits do not advance, save, back up or recover the visited town. Damaged entries stay readable and lead to the store's plain error screen. Career backup verifies towns with BigInt ticks, and imports reject town pointers that do not match their town records. Build commands receive the visit refusal sentence. Complete career export and import keep every town and preserve its BigInt clock value.

This follow-up gives the town session a headless controller for entering a visit, advancing frames, commands, Book/card reads, Escape and RETURN. One RETURN route can run at a time. The visit picker excludes the player's own town and unclaimed old towns; Hollis's note offers an unclaimed save only through “Take over this town.” That explicit action assigns the mayor and saves. RETURN from a visit with no own town exits without claiming the visited town.

## Checks

- `node tools/test-town-visits.mjs` — passed. In addition to export/import coverage, drives the session through a real store recorder: 1,200 fast frames, a build command, Book and person-card reads, Escape and RETURN. The visited town has zero writes and identical serialized bytes; the owner's town saves once without ticking; repeated return routes once. Escape-only and RETURN-only visits also have zero writes and unchanged bytes.
- `node tools/test-town-hooks.mjs` — passed.
- `node tools/test-town-store.mjs` — passed.
- `node tools/test-career-backup.mjs` — passed, 88 acceptance checks reached.
- `npm.cmd run build` — passed. Vite reported dynamic-import and large-chunk warnings.
- Lane tier — not run, as requested.
- Browser and look checks — Claude should run `tools/scenarios/town-opens.mjs`; confirm the visit banner, hidden build/speed controls, refused build command, unclaimed town takeover prompt, RETURN from a new player's visit, and that one RETURN opens only one copy of the own town. Not run in this lane.

## Changed assertions

No existing assertions changed. Added `tools/test-town-visits.mjs` for this card's behavior.

## Race fingerprints

No race simulation or race fingerprint files changed.

## Removed

Removed automatic mayor assignment when opening an unclaimed town. It now requires the player's explicit takeover action from Hollis's note. Removed the direct RETURN click handler from `paint()` so `bindTownInput` is the only screen handler; a shared leave guard blocks duplicate Escape/RETURN actions. Visits still bypass town recovery writes so opening a damaged town cannot repair or rewrite it.
