# OPEN-JOURNAL-SIZE questions for Claude (26 November 2026)

## Where to compact at a bank

Integration `5269a4dc5` saves a completed Night 2 through `settleNight2` and `bankLedgerHearth`.
Neither calls `settleOpenWorld`. `directBankedOpenWorld` is only called from a test. The card owns
neither of the live bank files. Folding on the next roam exit would leave the banked save untouched
until that exit, and it might never happen.

**Pick.** Name the `settleNight2` bank-success hook in `src/story/night-2-save.js` on the card.
Have it call a pure helper from `open-save.js` against an existing readable open record, before
App commits the profile. Leave replay replacement and the legacy ledger-only bank writer alone.
Also enforce the ceiling in `settleOpenWorld`, where roam can write without banking.

## Which entries can be folded under pressure

The old rows are not all audit history. `thread-rule.js` reads the last arrival at each beat and
`director.js` reads the last thread start. `site-view.js` reads the last burn for its two-night look.
`open-effects.js`, `parts/sites.js`, `parts/buildings.js` and `parts/checkpoints.js` read choice IDs
for deduplication or numbering during the current night. The recollection page and Night 2 replay
use the separate ledger. Dropping old thread or burn rows, or folding current-night choice IDs
without a corresponding lookup, can change play after reload.

**Pick.** Keep those rule inputs exact. Fold audit-only rows older than the last bank into summaries
by choice prefix and night range, oldest first. For ceiling pressure, approve a summary-aware
choice lookup and name the three part readers on the card. Use exact sequences of numbered IDs
where possible so a same-night repair can be recognised after reload. Confirm the fallback when
an unusually large set of distinct prefixes or rule inputs cannot fit the ceiling. A replay-unsafe
fallback loses progress semantics, while a lossless packed row meets an entry cap by itself but
does not guarantee a byte cap for arbitrary IDs. The fixture should cover both historical
compaction at a bank and same-night dedupe after loading a capped roam exit.
