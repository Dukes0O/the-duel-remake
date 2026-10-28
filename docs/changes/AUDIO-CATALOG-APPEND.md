---
task: AUDIO-CATALOG-APPEND
status: done
player_facing: no
---

# AUDIO-CATALOG-APPEND: recording a sound no longer reorders the audio catalog

Claude, 15 October 2026. Card `docs/board/cards/AUDIO-CATALOG-APPEND.md`.

## Changed

- `tools/audio/sourcing.mjs` `addCatalogEntry`: a new entry is appended at
  the end; an entry with the same source, key and cue as an existing row
  replaces that row in place. Before, it dropped every row with the same
  source and key and sorted the whole catalog, which reordered the file
  (DRIVE-LESSON-LINES had to restore the order by hand) and could also merge
  two cues cut from one library sound into one row (freesound 249810 serves
  `weapon.crossbow.fire` and `weapon.caltrops.deploy`). Used by
  `tools/audio/elevenlabs.mjs` (say --keep, keep-take) and
  `tools/audio/freesound.mjs` (fetch).
- `tools/test-audio-sourcing.mjs`: new checks that adding an entry leaves
  every existing row and its order byte for byte and puts the new row last,
  that a same source, key and cue entry replaces its row in place while the
  same source's other cue stays, that a second cue from one source gets its
  own row, that a refetch with no cue replaces an old row that had no cue
  field (review fault: `null` and a missing cue now match), and that the file
  keeps its format. They fail on the old code.
  The existing checks are unchanged and pass (56). The card text now
  says source, key and cue.

`tools/audio/catalog.json` is unchanged.

## Checks

Lane tier 25/25 and build on 35f782d8. One review: one fault (a missing cue
and `null` did not match), fixed and confirmed.

## Removed

The sort, and the same-key filter that could merge two cues, in
`addCatalogEntry`.
