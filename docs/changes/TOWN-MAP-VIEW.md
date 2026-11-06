# TOWN-MAP-VIEW

## Changed

- Connected the read-only marker model to the town scene and added reusable HTML pins for places, outposts, routed trucks and unanswered reports.
- Pins fade in toward Scablands zoom, stay clipped to the map view, and hide lower-priority overlaps. The layout updates only after a camera move, resize or town tick. There is no marker count cap.
- Clicking a marker flies the camera there over about one second while keeping its heading. Mouse or arrow movement takes over from the flight.
- Report pins open and select the matching Reports panel item. During a visit, reports remain read-only and have no answer controls.
- Reports with saved top-level coordinates now get pins. The selected report stays selected when a town tick repaints the panel.
- New outpost records keep a known place id. Old records read the id from content without writing to the save. Only the explicit Ridge mapping is placed; locations without coordinates remain unpinned.
- Truck positions are calculated as a pure read from an explicit origin, destination, route and duration. Existing trade trucks have only a distance and no real route, so they correctly show no pin.

## Acceptance gap

Closed: scene and input wiring now render and activate map pins. The existing trade-trip records have no saved route coordinates, so those trucks remain unpinned under the card's rule that trucks without a route show no pin.

## Checks

- All 28 `tools/test-town-*.mjs` scripts passed before review fixes. After review fixes, `node tools/test-town-map-markers.mjs` and `node tools/test-town-visits.mjs` passed.
- `npm.cmd run build`: passed after review fixes. Vite reported its existing dynamic-import and large-chunk warnings.
- `node --check tools/scenarios/town-opens.mjs`: passed after review fixes.
- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4`) on the pre-review-fix snapshot: 25 suites passed before `tools/test-review-evidence.mjs` failed because the sandbox could not start `ffmpeg` (`spawnSync ffmpeg EPERM`); 13 later suites did not run. The one allowed rerun of that suite failed with the same tool error. This is unrelated to the town-map files; no assertions were changed. The review fixes then passed their focused tests and build; the lane tier was not rerun.
- One independent code review and the required save-safety review passed. The code review's two findings were fixed and confirmed.
- Browser scenario for Claude: run `tools/scenarios/town-opens.mjs` and inspect the Scablands zoom, label readability and overlap, the one-second marker flight, planning drag over pins, report selection, and read-only report display during a visit.
- Race fingerprints: not run; this view-only change does not touch race rules or replay data.
- Changed assertions: none loosened. Marker fixtures now use explicit trip route data instead of generic path/progress fields. The read-only assertion now serializes BigInt ticks as strings so it can compare the town snapshot.

## Removed

- Removed the old permissive truck path/progress interpretation, which could pin a truck without a saved origin, destination and route. The new route contract uses only explicit trip data.
