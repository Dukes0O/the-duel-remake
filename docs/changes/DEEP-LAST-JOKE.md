# DEEP-LAST-JOKE

**Status:** implementation is committed with `deep-vasca` at `dev`. Claude's independent save, browser, look and sound reviews remain.

## Changed

- Finished the Deep story fixes and the optional Squeak mission, including the Vasca reward and race setup.
- Preserved an earned `falcone_vasca` in `normalizeProfile` while `deep-vasca` is off. Added a memory-only load/save regression test.
- Updated counts, allowlists and save-fixture expectations for the optional Vasca find and car. General car lists still hide it until the mission switch and ownership permit it; the helicopter starts it at Pacific Canyon.
- The original checkpoint is `4103db39`; this commit adds the save fix, its test, remaining card-required expectation updates and this note.

## Checks

- Every `tools/test-deep-*.mjs` suite was run manually in PowerShell, one at a time. All passed except `test-deep-audio.mjs` (configured FFmpeg loudness measurement failed) and `test-deep-phone.mjs` (recorded voice credits total 2,404, above the unchanged 2,000 cap). The phone line, catalog and settings checks passed before the credit budget check. Claude owns FFmpeg checks.
- `test-deep-vasca.mjs`: all seven tests passed, including 30 child-pace dives across routes and seeds, 10/10 Easy wins, and 10/10 child-pace finishes.
- `test-deep-explorer.mjs`: 17 tests passed. `test-deep-save.mjs`, `test-deep-look.mjs` (5,409 checks), and `test-sirena-car.mjs` passed.
- `test-progression.mjs`: 28 checks passed, including Vasca preservation with `deep-vasca` off.
- Follow-up checks passed: `test-earned-cars-ui.mjs`, `test-feature-flags.mjs`, `test-save-fixtures.mjs` (26 fixtures, 1,123 checks), `test-grand-prix-podiums.mjs` (33 checks), and `test-course-kit.mjs`.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going` started 317 suites. Its log stopped changing after all suites started and the last concurrent results reported. After about seven idle minutes the runner had not exited, so it was stopped. The log recorded FFmpeg spawn errors, the phone credit budget, `pwsh EACCES` in the full-check test, and unrelated existing audio, course, review-evidence and launcher failures. Card-related failures were corrected; the affected suites passed directly. No final aggregate summary was produced.
- `npm.cmd run build`: passed (650 modules, 2.07 s). Existing large-chunk and mixed static/dynamic import warnings remain.
- `test-board.mjs`: 641 checks passed. `test-repo-hygiene.mjs`: passed; size targets are advisory.
- Claude should check the browser scenario with memory-only data: squeak ping, duck in view, lift ring, bath rising, title card, car in the garage and one race start. Claude should judge whether the bath reads clearly from the chase view and review the new sound and Ana recordings. No Chrome check was attempted.
- No replay fingerprints or signatures changed.

## Changed assertions

This list names the changed expectations and their reasons for Claude's review. No gameplay or race tolerances changed.

| Check | Old | New | Why |
| --- | --- | --- | --- |
| `test-deep-phone` line count | 16 | 27 | The card adds Ana's mission lines. |
| `test-deep-phone` runtime audio size budget | 1.5 MB | 3 MB | The required 27 recordings total about 2.41 MB. This is an asset capacity budget, not a gameplay tolerance. |
| `test-deep-phone` recording settings | All lines used stability 0.4 | Existing lines remain at 0.4; the revised otter take and 11 new takes use catalog stability 0.45 | Exact expected settings now match the recorded takes. |
| `test-deep-log` pearl unlock index | 8 (ninth pearl) | 2 (third Kelp Coast pearl) | Only the Kelp Coast's three pearls exist today. |
| `test-deep-log` displayed pearl count | 2 saved pearls across coasts; total 9 | 1 Kelp Coast pearl shown; total 3 | The garage counts pearls only on found coasts. |
| `test-deep-explorer` protected goal count | 16 | 17 | The optional Vasca find is protected from rock placement. |
| `test-progression` roster count | `2 + 6 + 1 + medalCars + 2` | `2 + 6 + 1 + medalCars + 2 + 1` | The Vasca is a new gated car. |
| `test-feature-flags` switch count and state | 50 switches; no `deep-vasca` | 51 switches; `deep-vasca` is `dev` | The card adds its development switch. |
| `test-earned-cars-ui` car list | No Vasca in the expected air-only list | Vasca is air-only and remains hidden from general lists until allowed and owned | This matches the car and helicopter rules. |
| `test-sirena-car` first helicopter placement | Sirena at Pacific Canyon | Sirena and Vasca at Pacific Canyon | Both cars begin at the coast road. |
| Save fixture roster | 25 fixtures | 26, including `25-deep-vasca.json` | The new fixture covers the earned car and Deep progress. |
| New fixture's raised-id check | One `includes` assertion for two ids | Separate checks for `sirena-car` and `falcone-vasca` | The helper checks one included value at a time. |
| Additive fixture compatibility | New fixture matched pre-card normalized bytes | New fixture checks retained Vasca ownership and Deep progress; the other 25 retain the byte comparison | The old normalizer dropped the Vasca when its switch was off. |
| `test-deep-save` bubble checks | Asserted the removed `bubbles` field | Those assertions were removed | The field was removed with the old tip. |
| Garage tip | “Look for bubbles at the end of the old boat ramp on Pacific Canyon. A dive kit lets any car explore below.” | “Look for the BOAT RAMP sign on Pacific Canyon's coast road. A dive kit lets any car explore below.” | The old tip pointed at bubbles that are not drawn. |
| Otter log fact | “Otters eat sea urchins. Without otters, urchins eat the kelp and the forest disappears.” | “Otters eat sea urchins. With too few otters, urchins can eat a kelp forest bare.” | The new wording avoids an absolute claim. |
| `deep.ana.otter` line | “See the otters? They eat the sea urchins. No otters, no kelp forest.” | “See the otters? They eat the sea urchins that eat the kelp.” | The revised recording matches the story. |

## Removed

Removed `deepHints().bubbles`, its old second garage tip and the nine-pearl unlock rule. No save fields or runtime dependencies were added.
