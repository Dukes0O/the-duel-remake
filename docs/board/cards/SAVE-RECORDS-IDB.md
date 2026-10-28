# SAVE-RECORDS-IDB

The short board entry controls current state, ownership, dependencies and locks.

## Why (Claude, 25 October 2026)

Kyle's live career stopped saving ("Career save failed ... the 4 MB origin
storage budget is full"). The real localStorage held only 271 KB: two career
backups under non-game key names (`duel-<player>-before-weapons-...` and
`duel-<player>-before-max-...`, 137 and 134 KB) that `src/career-budget.js`
counts as foreign data. Ordinary (non-record) data may use only 400 KB,
because 3.6 MB is reserved for ghosts and lap telemetry, so one larger save
tipped it over. Kyle downloaded both backups to a file and removed them.

## The card

1. Move ghosts and lap telemetry into the IndexedDB career store (as the
   career itself already is) so localStorage holds only the small journal,
   and drop the 3.6 MB reserve; the 4 MB check then guards only the journal.
2. Until then, never let a backup written under a non-game key share the
   ordinary allowance: whatever wrote the `duel-*-before-*` keys (find it;
   not in this repository's `src` or `tools`) writes to the archive store
   instead, or the budget counts recognised backup keys separately.
3. When a save is refused, the message names what is using the space.
Saves card: one independent review; old saves load untouched; never delete a
player's backups.
