# GP-RACECRAFT

Kyle approved one new lane despite the HELI cleanup hold. Work is preview-only; cpu-racecraft remains dev. Owned files and the settled design are on the card.

## Implementation decisions before code

Keep the complete old path when the switch is off, including state shape and all random draws. Enabled racers start with their actual grid bias, relaxing over the greater of500m and the first braking entry only when the merge lane is clear. Recent player pace uses two-second sectors from the last ten seconds, normalized to the player's own road speed profile; lap pace is used after a completed lap. CPU nitro scales the player's upgrade/car formulas: extra acceleration and extra ceiling at0.5, recharge and close-pass refill at0.5, unchanged tank/drain. Existing contact, pace tuning and catch-up numbers stay unchanged. No new random draws are needed for boost use.

## Acceptance and verification

Three pre-change exact30-second complete field/RNG hashes are pinned in the existing race-field suite. Add opt-in grid, boost, passing, pit safety and determinism cases. The card-authorized racecraft-rate tool will compare the same seeds with the switch off/on across Panorama, Woods and Pacific Canyon, preserving actual failures and the20-race thresholds. A small probe precedes the full measurement. Final nearby/jobs4, production build and one independent code/numbers review are required; no full check or frame measurement here.

## Removed

Nothing yet. Existing drivers and all disabled-switch behavior stay required. No saves, released settings, artwork or current assets are removed.
