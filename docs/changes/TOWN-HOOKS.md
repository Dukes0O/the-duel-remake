# TOWN-HOOKS

Connected the yard's THE TOWN button to a switch-gated dynamic route. A first visit shows Hollis's note and a town name field, then creates and saves the town. Later visits follow the town pointer and load the store's last good copy when needed. QA uses the store's memory-only mode. The screen advances whole town ticks at the four designed speeds, saves each game day and when leaving, and stays open with the store's sentence after a failed save. BACK UP uses the town store export. Escape and THE YARD save before closing and release the town loop, listeners, scene resources and renderer.

The first screen uses the existing town state and view APIs. It begins at street zoom and rises to the town view. Selected plans can be placed on the view. The route checks the switch before importing any `src/town/` module.

## Checks

- `node tools/test-town-hooks.mjs` passed. It checks the switch-gated button and dynamic route, first save, pointer-based return load, saved road and continued simulation after a rejected store save.
- `node tools/test-town-view.mjs` passed.
- `node tools/test-feature-flags.mjs` passed (129 switch checks).
- `node --check tools/scenarios/town-opens.mjs` passed.
- `npm run build` passed. Vite reported its existing dynamic import warning for `src/game.js` and the existing large chunk warning.
- No lane tier or browser scenario was run here. Claude should run `town-opens`: inspect the yard and Hollis note, name the town, place a road, leave and reopen, and review the five screenshots for screen composition and return persistence.
- No changed assertions or race fingerprints.

## Removed

Nothing was replaced or removed.
