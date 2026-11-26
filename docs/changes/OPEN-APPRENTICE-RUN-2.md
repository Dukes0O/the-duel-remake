# OPEN-APPRENTICE-RUN-2

- The kiln and apprentice routine unlock after Night 2 is banked. Earlier gas runs pay normally and leave Night 2’s opening four embers and zero gas intact.
- A missing, invalid or stale gas measurement logs a warning. The run still pays scrap and advances the feud, with zero gas credited.
- If a gas run cannot be saved, its earned result stays in the session on return to the yard. A measured run can retry writing the same result once.
- **Removed** the pre–Night 2 kiln and the payout veto for unusable gas measurements.
- With Node `22.23.5` and memory-only saves, the ordinary lane passed 52/52 suites on `432d438f7`. The fix passed 29/29 selected suites on `5b67c8cdd`.
- On `78d9fd22d`, 16/16 integration checks passed, including Apprentice 17/17, Night 2 and story ledger. Browser readiness and expression checks passed 18/18.
- The integration checks covered 1,145 historical-save checks, 9,288 Gas Run checks and 4,954 Field Battle checks. Feature switches passed 133 checks on `432d438f7`.
- The integrated build passed with Vite’s mixed-import and chunk-size warnings. Race replay 306, combat replay 12 and world composition 65 checks passed with their pins in place.
- The legacy real-input gas and battle cases passed on `5b67c8cdd`, covering 180 Medium and 90 Easy trials with their original assertions.
- The handoff board passed 651 checks and repository placement passed. The final integration update `1b7cf3ebf` changed only the board.
- Existing assertions and the player default for `story-choices` stayed unchanged.
- For Claude, complete the independent save and embers review, memory-only browser scenarios, selected laptop-only suites, Windows line-stamp fixtures and merged build listed in the PR.
