# Town systems follow-up

## Changed

- Report answers carry an effect descriptor with the event and answer data. Answering applies and records it on the town. Medic answers raise the selected people's health, a missed Road Rat raid removes stock, and an ignored fire damages the named site. Other answer effects are recorded in the town's conditions data.
- Work shortages can receive the town context and raise a `site-stopped` report in `town.reports`, with the `get-ingredient` job attached.
- Flat routes omit the zero-volume fill stage.
- Town radio captions use a caption registry that does not register them as story/save entries. This fixes the story registry failure without changing its assertions.

## Checks

- Every `tools/test-town-*.mjs`: passed (11 suites).
- `tools/test-story-registry.mjs`: passed (78 checks).
- `npm run build`: passed. Existing chunk-size and dynamic-import warnings remain.
- Browser and look checks: Claude should open the town report panel, answer a sickness report and a Road Rat report, and verify the affected person and stock visibly change. Also check that town chapter radio captions still play.
- Race fingerprints: not applicable; no race or replay code changed.
- Changed assertions: none. Added event-kind, work-shortage and flat-route checks.

## Removed

- Removed town dialogue from the story/save registry. Its captions remain available through the shared caption lookup.
