# TOWN-GOODS

## Changed

- Added cell-based stockpiles with kg conversion, finite stock transfers, and stock-sensitive prices.
- Added recipe data and staffed-building production for salvage sorting, the forge, kiln, sawmill and kitchen.
- Added road-graph routes, handcart and truck capacity, road speeds, fuel use, and a salvage gang that travels to and from its site.
- Added `tools/test-town-goods.mjs` for material weights, recipe work, distance, fuel failure, salvage return and the 200-hauler target.
- The 0.8359 kg/L automotive diesel mass at 15 C uses Measurement Canada's standard density, [V-18](https://ised-isde.canada.ca/site/measurement-canada/en/laws-and-requirements/v-18-selection-volume-correction-factor-tables-and-standard-density-values-some-common-products). The design's cell size is 8 m. Other mass and economy values are starter game data. Road speeds, vehicle capacities and fuel use are written on the card for Claude's review.

## Checks

- `node tools/test-town-goods.mjs`: passed, 16 checks; 200 haulers stepped in 11.59 ms on the measured run with 10,000 town people present.
- `npm.cmd run build`: passed. Vite reported its existing ineffective dynamic import and large chunk warnings.
- Lane tier: not run; Claude runs it.
- Browser and look checks: not run. Claude should inspect how goods stock, recipes and hauler agents connect to the town simulation, and review the starting speed, capacity, fuel and economy values. This change has no visual surface yet.
- Changed assertions: none.
- Race fingerprints and world signatures: not applicable; no race, course or signature code changed.

## Removed

Nothing was replaced.
