# TOWN-ROUTES-UI

## Changed

Added `src/town/ui/town-route-tool.js`, a standalone town route planner view. It draws the supplied ground heights and planned routes in world coordinates, shows the route choices side by side, and includes a profile for the ground, pipe or route depth, and water pressure. It preserves every supplied waypoint for pointer and keyboard editing, and offers a midpoint handle when there is no waypoint yet.

Agreeing returns the selected route and a plain construction work order. The view marks survey flags and sends their positions to the host. After the host marks a pipe route as laid, the valve action sends its points to the host with a camera-follow request. The view does not change town state. The host remains responsible for planting flags in the town scene and moving its camera.

The UI is exposed as renderer, model and delegated-control functions. No town screen currently imports this module; Claude should mount it in the town view for the browser review.

## Checks

- `node tools/test-town-route-tool.mjs`: passed, 26 checks.
- `node tools/test-town-routes.mjs`: passed.
- `npm.cmd run build`: passed. Vite reported its existing dynamic/static import warning for `src/game.js` and large chunk warnings.
- `npm run build` through PowerShell's script shim did not start because the local execution policy blocks `npm.ps1`; the same build passed through `npm.cmd`.
- Lane tier not run, as requested. Browser and look checks are for Claude.
- No existing assertions changed. The new pointer test initially used an incorrect fixed coordinate; it now derives the expected world coordinate from the route map bounds. No tolerance was loosened.
- Race fingerprints: not applicable. The change is a view and callback module; it does not change route simulation or race rules.

## Claude browser review

Mount the tool in the town view with a pipe route over a hill and check that:

1. Around, over and through options are visible together, with different lengths, materials, machines and pump counts.
2. Dragging the map point and moving it with the arrow keys updates all options and the side profile. Keyboard focus stays on the point.
3. The side profile shows ground, pipe and pressure. Agreeing returns the work order and displays survey flags at their world positions.
4. After the pipe is laid, opening the valve requests a camera follow along the route into town and gives the player a clear status message.
5. The map and option cards remain readable at a shorter window height.

## Removed

Nothing. There was no earlier route tool view to replace.
