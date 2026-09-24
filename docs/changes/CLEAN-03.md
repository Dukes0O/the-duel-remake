# CLEAN-03: Raw review evidence outside Git

Status: ready-to-merge

## Changed

- Browser smoke, scenarios and audio recording now write screenshots, videos, WAV stems, reports and graphs under ignored `.evidence/<date>/` by default. The browser suite keeps one original evidence tree instead of making a second temporary copy. QA still uses private ports and memory-only saves.
- Blender review renders and fidelity manifests now use `.evidence/<local-date>/<family>/round-N`. Direct test-fighter, crew, first-person and Rustwall browser captures use the same folder, so Blender, browser and the fidelity composer share one round. A caller may select a folder within `.evidence` explicitly.
- A completed fidelity sheet publishes one JPG under `docs/board/looks/<family>/round-N.jpg`, at most 500,000 bytes. Browser-only review rounds use the same one-sheet rule. Independent review notes remain separate. Routine `run-browser-scenarios --all` does not publish review sheets.
- Hidden Road arrival publishes only the designated final comparison for each established round. Intermediate and supplement captures remain raw evidence.
- Historical JSON manifests in `docs/board/looks/` remain as read-only fallbacks for first-person and Rustwall QA. CLEAN-05 must preserve the needed fixture facts elsewhere before deleting those old files.

## Checks

- New path, handoff, size and publication tests passed: `tools/test-review-evidence.mjs` 8 tests and 170 checks; `tools/test-browser-harness.mjs` 5 tests and 14 new checks. The arrival test requires exactly one JPG publisher per round. No existing assertion was weakened.
- Blender 4.5.13 composed a synthetic raw PNG and a 23,452-byte JPG, both in ignored evidence. The synthetic files were deleted after the check.
- Browser smoke passed on private port 26097: four screenshots, zero warnings or errors, memory-only saves. The on-foot camera review scenario passed on private port 63128: 11 screenshots and one raw contact sheet under `.evidence`, zero warnings or errors. The rigged-fighter scenario passed on private port 55291: 18 screenshots and `captures.json` in the test-fighter round folder, zero warnings or errors. Audio race passed on private port 46989: 841 frames, 23 events and seven WAV stems under `.evidence`, zero warnings or errors. Review JPG publication was disabled for the repeatable camera QA run.
- The pre-review lane tier passed 236/236 suites in 383.03 seconds; 162 replay fingerprint checks were unchanged. Build passed and measured 316,671,592 bytes, unchanged from CLEAN-02. The final post-review lane tier and build are required immediately before merge because the reviewer fixes and this note followed that first gate.
- `docs/board/looks/` remains 2,723,829 bytes, below the 20 MB target. No runtime asset, simulation, save or replay fixture changed.
- Independent review found and then cleared the art round path mismatch and duplicate arrival JPG publishers. Its final focused re-review found no remaining blocker. The historical manifest fallback is a named CLEAN-05 dependency.

## Removed

- Removed the default `.qa-dist/browser-output` capture route and the browser suite's duplicate temporary archive. Raw output is deleted after its review verdict is recorded, as part of the after-merge janitor.
- No historical review JSON was deleted here; CLEAN-05 owns consolidation and removal after its still-needed fixture data is preserved.
