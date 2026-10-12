# QA-LANE-SCOPE: changed lanes use proven consumers

## Design, before code

Keep discovery, smoke, commands, campaign shards, full tier and game assertions exact.
Runner, package, lock and configuration changes still select every suite.
Unknown assets/CSS/source paths and incomplete dependency reads still select every suite.

First explicit mappings, supported by current source:
- Pine bough/bark PNGs: src/vegetation.js loads both literal texture URLs;
  test-pine-material reads the bough bytes. Include their transitive suites.
- Circuit-kit GLBs and manifest: src/track-kits computes GLB paths;
  test-track-kits reads actual GLBs, test-p4-kits reads manifest-selected GLBs
  and scans the directory, and Harbour/Tremblant tests read the manifest.
  Include these explicit readers and their transitive consumers.
- Existing screen CSS: screen-router imports the exact current CSS files;
  direct CSS checks use literal new URL references. Map only these named files.
- QA bootstrap files: test-qa-storage's finite seven-name loop reads them;
  record those exact source paths rather than treating arbitrary computed reads as known.
- Repo hygiene scans all changed files and remains in the unchanged smoke set.

After the first focused failure, root approved a proper installed parser before code.
Vite8 already requires Rolldown1.0.3; its inspected rolldown/parseAst export synchronously
returns real import/export/dynamic-import/new-URL nodes and throws on parse errors.
Reuse it only in the tool, without adding packages. Ignore strings/comments, strip Vite
query/hash suffixes for file lookup, and cache parsed references within one selection.
Second focused failure identified a real finite DATA-module import, not fixture text.
Root settled computed_reader_decision before code: for audited presentation paths, include
every suite with transitive computed imports or fs/fs-promises readers as a possible consumer.
Guess no target. Missing/unreadable/parse-error graphs still fall back full; source-change
uncertainty and unknown paths stay conservative: any unreadable/parse-error graph stays full,
Root final source_reader_decision before edit: mapped sources select static/transitive
consumers plus ALL computed/filesystem-reader suites, omitting unrelated pure suites.
Unmapped sources still fall back full; no target is guessed and every possible reader runs.
No fixture-string workarounds.
Represent reader edges explicitly, alongside the existing local import/literal URL graph.
Keep deleted literal targets in that graph; additions/deletions in known asset families
retain their consumers. Missing/unreadable traversed JavaScript or unresolved local
module imports make mapping incomplete and select every suite. Do not parse computed
expressions or infer consumers from asset names. Unlisted binary families remain full.

Existing runner assertions gain known/mixed/unknown, add/delete and transitive cases.
The old menu-check computed-reader case becomes explicitly known; an unlisted helper
still proves the full fallback. No gameplay assertions or timing thresholds change.
The settled filesystem policy includes the audio reader. The new exclusion assertion
therefore uses the unrelated pure polyline-index suite; speed-format also reads fs. Every fs consumer stays.

## Checks

Prior-stage runner suite: 152 checks pass; 387 suites discovered. Meaningful failures
first exposed regex fixture edges and real DATA-module uncertainty; source was fixed,
and new exclusions retain all filesystem readers. No game assertion or tolerance changed.
Final conservative incomplete/source branches are covered by the required integration gate.
Prior-stage list-mode only: pine187, screenCSS151, kitGLB187, mixed187; no campaign shards.
Unknown mixed/runner394 and full394 preserve complete discovery plus eight campaign shards.
No lane, build, native, art or full run in this card before Director handoff.

## Removed

Replace blanket public/CSS fallback only for the audited paths above. Other fallbacks stay.
