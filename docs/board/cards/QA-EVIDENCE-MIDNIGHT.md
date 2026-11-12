# QA-EVIDENCE-MIDNIGHT

Found by Claude on 12 November 2026 at 00:25 local time.

`tools/test-review-evidence.mjs`, test 4 ("browser, Blender and fidelity rounds plan the same raw evidence directory"),
fails for a while after midnight with no game code changed: the browser harness plans its evidence folder under one
date (2026-11-11) and the Blender recipes under the next (2026-11-12). The two sides read the day differently (one of
them is not using the laptop's local day). It failed three times in a row between 00:00 and 00:35 and is expected to
pass again later in the night; rule 3 treats that as an unreliable suite, which never holds merges.

Seen again on 12 November: three failures between 00:00 and 00:35 and a pass at 01:05, all with no code changed. The
failing hour is the first hour after local midnight, so one side is taking the day an hour behind the laptop's clock.

## What done looks like

- Both sides take the day from one place, so the test passes at any hour. A test proves it by planning the folders
  with a clock set to 23:59 and to 00:01 local time.
- No assertion is loosened.

## Checks

`node tools/test-review-evidence.mjs`, and the new clock cases.
