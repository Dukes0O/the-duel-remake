# GROUND-EDIT

Status: implemented in `codex/ground-edit`. Feature switch remains `wasteland-town`.

This follow-up fixes four review findings in the ground edit layer. `heightAt` now blends the four surrounding 1 m edit samples, treating absent samples as zero, and adds that blended delta to the natural height. This preserves exact natural heights before edits and blends correctly across chunk edges. Save loading validates every delta and material ID in a temporary map before replacing current chunks. Fill checks material names as own keys. The Scablands layer can now be replaced with `setScablandsGroundEdit` or restored to a fresh natural layer with `resetScablandsGroundEdit`.

The original design remains: circular edit and reserved shapes (`{x, z, radius}`); `cut` takes the finished elevation and reports excavated material; `fill` accepts loose cubic metres and compacts by 1.25. No other design choice changed.

## Checks

- `node tools/test-ground-edit.mjs` — passed. Save size: 1,117,920 bytes for about 200 chunks; 10,000 small cuts: 120.9 ms. New cases cover smooth interpolation, natural heights, missing and cross-chunk samples, failed-load atomicity and bad sample values, inherited material names, and Scablands reset.
- `node tools/test-scablands-ground.mjs` — passed, 5/5.
- `npm run build` — passed via `cmd.exe` after PowerShell blocked the `npm` script shim. Vite reports the existing mixed dynamic/static `src/game.js` import and large output chunk warnings.
- Lane tier and browser/look checks were not run in this follow-up; Claude owns those checks under the card.
- No existing assertions changed. The tests add assertions for each review fault. No race fingerprints were recorded or changed; an undug world still returns the natural-height function exactly.

## Claude browser check

Open the Scablands and check road driving, Tin Town walking and Ridge driving still follow natural ground before edits. Confirm the reset API returns the natural surface after an edit. The player-facing edit controls are not part of this card, so no browser interaction creates a cut or fill.

## Removed

- Replaced rounded single-sample height lookup with bilinear edit-delta interpolation.
- Replaced destructive-before-validation save loading with validate-then-swap loading.
- Replaced inherited-key material acceptance with own-key validation.
- Replaced reliance on one permanent Scablands edit object with explicit replacement and reset operations.
