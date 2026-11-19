# STORY-REPLAY-PICK

Kyle's ruling of 18 November 2026 (`docs/board/decisions.md`, "Five Cold Nights: the last three rulings"): when a story
night is played again, the player picks at the end which outcome stands, so nobody has to replay an older version to get
it back. Codex's card, for its cloud. It touches the save, so it gets the extra save checker (AGENTS rule 6).

## What the player sees

At the end of a night that the ledger has already written, "What people remember" shows two columns: **As it stands**
(the saved night) and **This time** (the run just played). Each column lists what differs: embers and gas in store,
promises and debts, the Word on the road, marks, people met or gone. Two buttons: **Keep how it stands** (the first,
and the one already focused) and **Keep this time**. Nothing changes in the save until the player presses one.
"Keep this time" asks once more in plain words ("The first telling will be forgotten.") before it writes.

## Rules

- Only the night just played is replaced, with every effect of that night and nothing else. A later night already
  written (when Night 3 exists) is not touched. If the replayed night changes something a later night read, the later
  night is marked "told before this changed" on the ledger page; it is not rewritten. Claude decides at that time
  whether a later night must be replayed.
- One version of a night is kept, never both. No hidden copy.
- Scrap and other career money a night paid out is not paid again by a replay, whichever is kept.
- The saved `story.ledger` keeps its version 1 shape if it can; if it cannot, the card says why and adds a versioned
  migration that keeps every existing save readable.
- The choice is offered only after a completed night. Leaving a replay unfinished changes nothing.

## Checks

- A new `tools/test-story-replay-pick.mjs`: keep-first leaves the save byte for byte; keep-this-time replaces exactly
  that night's effects; no double scrap; a later night is marked, not rewritten; an unfinished replay changes nothing;
  a reload between the page and the button leaves the first telling.
- `test-story-save`, `test-story-ledger`, `test-night-2`; the lane tier; `npm run build`.
- For Claude to run: browser scenario `story-night-2` extended with one replay that keeps the first and one that keeps
  this time, and Claude's hand play of both. Sound: `story.ledger.choose` on either button, from the bank's own layers.

needs: STORY-NIGHT-2 (Slice A merged).
