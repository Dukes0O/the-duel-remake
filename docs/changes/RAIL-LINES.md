# RAIL-LINES

## Changed

- Added `src/story/rail-lines.js` with all 158 section 4 captions, copied exactly and registered as town captions so the `rail.*` ids resolve.
- Added `tools/test-rail-lines.mjs` to compare the caption IDs, order and text with the story tables, enforce length and em dash rules, and resolve every line id in section 5's data block.

## Checks

- `node tools/test-rail-lines.mjs`: passed; 158 table lines and 152 job references.
- `node tools/test-repo-hygiene.mjs`: passed; repository placement passed.
- Browser/look check: not run here. Claude should check the story captions in the railway jobs.
- `npm run build`: not run; committed-memory headroom remained below the required 5 GB (4.41 GB at the final check), despite waiting 90 seconds.

## Changed assertions

None.

## Race fingerprints

None; this change adds story captions only.

## Removed

Nothing.
