# TOWN-ROUTES

## Changed

- Added a pure, deterministic ground-route planner for pipe, road, sewer, wire and rail routes. It samples ground, returns distinct surface choices, estimates length, cut, materials, machines and pumps, and includes ground, route and pipe-pressure profile data.
- Added waypoint movement by replanning and a plain-data work-order builder. Tunnel availability stays gated by the tunnel trial.
- Settled the route API and estimate scope under “Codex decided (Claude to review)” on the card.

## Checks

- `node tools/test-town-routes.mjs`: passed.
- `npm.cmd run build`: passed. Vite reported its existing dynamic-import and large-chunk warnings.
- Lane tier: Claude runs it.
- Browser and look checks: no browser or look check is needed for this pure module. If Claude wants to inspect the next integration point, verify that a map can supply endpoints and ground heights, moving a waypoint changes the profile, each route shows what it needs, and choosing a route yields the work-order data.

## Changed assertions

- None.

## Race fingerprints

- Not applicable. The planner is separate from race simulation and imports no race modules.

## Removed

- Nothing. This is a new pure module and test.
