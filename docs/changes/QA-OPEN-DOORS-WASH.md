# QA-OPEN-DOORS-WASH

- Cause: the service fixture began at dawn, so the story director spawned Slack at (6026, 47.1), blocking the wash doorway before the player crossed its room boundary.
- Comparison: detached checkout of `ee70a4307` under TEMP failed at the same assertion before the fix; the reported location split did not reproduce on this commit.
- Resolution trace: all 2,333 import edges matched after root normalization; all 538 local module files had identical SHA-256 hashes. Both used Three 0.171.0 from integration's node_modules.
- Ignored-file and ancestor-config scan found no local game overrides; only the expected dependency junction and diagnostic output were ignored in this lane.
- Fix: stage the service fixture at daytime (120 seconds) before its first tick, avoiding the dawn storyline while retaining real movement, collision and service interactions.
- Tested tree: `ee70a4307` plus the two fixture lines in this commit; subsequent edits are documentation only.
- PASS: `test-open-doors` here and in the detached checkout with the same fix; `test-open-roam`; `test-open-apprentice-run` (21 checks); `test-open-routines`.
- PASS: requested `run-tests --jobs 2` set: core (804), replays (306 fingerprints), combat replays (12 fingerprints), world composition (65); 4 suites passed, 0 failed.
- PASS: `npm run build`. No browser scenarios. Storage remained memory-only.
- Assertions changed: none. Game rules and sound cues changed: none.
- **Removed**: the implicit dawn fixture; temporary checkout, dependency junction, module/pose tracing hooks, logs and generated build output cleaned up after diagnosis.
