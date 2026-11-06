# TOWN-BOOK

## Changed

- Added a registered town-book system with a named first page and one compact
  annual page. The pages summarize births, arrivals, passings, departures and
  returns already represented in town data, fires, dry spells, and the first
  completed building of each kind.
- Added 72 plain text forms under `src/town/content/`. Pages have no fixed year
  limit and are part of the normal town save. `townBookPages` returns copies so
  readers cannot mutate the saved record through the read API.
- The current simulation has no departure or return command. The card records
  the choice to recognize explicit `leftTown` or `status: "away"` state without
  creating a new way for people to leave.

## Checks

- `node tools/test-town-book.mjs` passed. It advanced two same-seed towns
  through 30 years and checked founder names, annual pages, short text, save and
  reload, read-only copies, and repeatable output.
- `npm.cmd run build` passed. Vite printed the existing dynamic import and
  large-chunk warnings.
- Lane tier and browser checks were not run; Claude owns those checks. There is
  no browser UI in this card. Claude should inspect the first page and a later
  annual page, especially the wording when no departure or return events exist.
- Changed assertions: none. New assertions were added in the card test.
- Race fingerprints and course signatures: unchanged; no race or course files
  were touched.

## Removed

- Nothing replaced or removed.
