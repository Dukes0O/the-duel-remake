# DEEP-ZONE

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: DEEP-ZONE
    title: "The Deep zone format, Pacific ramp and dive entry"
    owner: codex
    lane: SIM
    size: L
    needs: [DEEP-LOOK]
    status: ready
    flag: the-deep
    locks: [busy-game-files]
    owns: [src/deep/deep-zone.js, src/deep/deep-journey.js, src/deep/deep-ui.js, src/deep/deep-ui.css, tools/test-deep-zone.mjs, docs/changes/DEEP-ZONE.md]
    hooks: [src/app.js, src/game.js, src/course.js, src/coastal-water.js, src/render3d.js]
    design_decision: "Claude, THE_DEEP 10 and 10.1: zone format v1 as written; ramp in the Pacific Coast cove off the racing line; pause, Dive / Turn back and ramp return copy the Hidden Road journey. A test zone lives in the test only."
    acceptance:
      - "Zone format 10.1 loads; the ramp, shoreline pause, dive choice and return work in Node; Pacific Canyon fingerprints exact with the ramp unused and with the-deep off. Lane tier, build, one review."
```

## Parallel lane interface — 12 October 2026

DEEP-AUDIO owns an event/update/stop adapter in src/deep/deep-audio.js with an injected existing audio host; this card owns its App journey lifecycle wiring when busy-game-files is available. DEEP-SAVE owns discovery/hint/kit methods; coordinate its eventual narrow App hook rather than duplicating save fields or award logic. Preserve all switch-off paths.

## Director independent format slice — 12 October 2026

DEEP-ZONE-FORMAT owns deep-zone.js and its pure Node acceptance independently while Summit holds busy-game-files. This card now depends on that slice and retains journey/UI/ramp/runtime wiring ownership; do not duplicate its validator or edit its files concurrently. Its10.1 contract and exact runtime/replay acceptance stay. No new production zone or changed ramp position is implied.

Validated format source6934122f is integrated: original20/20 lane and build1988.9206ms, ordinary review and persisted-ID repair confirmation CLEAR. Reuse defineZone/version1 and the existing unchanged zone floor; do not duplicate their implementation. All runtime ramp/journey/waterline/scene contracts remain this card’s next work once busy-game-files is free.

## Director runtime scope settled before code — 12 October 2026

Read-only preflight found no named cove anchor or fixed ramp distance. Derive each Pacific route's ramp after its normal generation, using existing coast section samples in ascending distance, shoreOffset/groundAt/worldAt and actual shoreline at SEA_LEVEL=-15. Reject dry headland, road/shortcut corridor, scenery and deterministic sea-stack conflicts across the complete ramp footprint. Choose the first fully clear candidate without RNG draws or deleting/moving existing scenery. The ramp is 120 m and ends at sea level minus8 m (-23 world y). An unavailable candidate is explicit and fails the owned route acceptance; no fallback coordinates, shorter ramp or fabricated production trail. Preserve the normal generated course, seeds and unused-ramp race fingerprints.

The journey owns pure coordinate conversion. Simulation stays in coast-world coordinates: floor y=SEA_LEVEL+zone-floor y. Approved look modules keep their zero-surface contract: render-only camera/car y=world y-SEA_LEVEL. Before Dive, pass a translated camera copy to the unchanged waterline. After Dive, render a private surface-local underwater scene and translated visual poses. Reuse the existing ambient-shading factory for that scene's own pass; leave the race scene/pass and Claude's look modules exact. Renderer changes never move simulation or race state. Dispose on menu/restart/return and restore owned car materials/parent, scene/background/environment and waterline state through the existing lifecycle.

This card's additional named hooks are screen-router imports, mount beside Hidden Road, per-frame HUD/presentation update and existing disposal wiring, with no new main-menu button; environment-key adds a ramp marker only when deepRamp exists and retains all current absent-ramp/Hidden Road/Muddy Hollow keys exactly. Render3d's named hook covers entry/return ownership, the descent overlay, private scene/view/ambient pass and cleanup, rather than a literal single call. No other renderer redesign or prototype-look edits are granted.

Director grants only these additional literal importer/specifier pairs in tools/test-deep-look.mjs's existing approvedImports set: src/course.js|./deep/deep-journey.js; src/game.js|./deep/deep-journey.js; src/app.js|./deep/deep-audio.js; src/render3d.js|./deep/deep-ui.js; src/render3d.js|./deep/waterline.js; src/render3d.js|./deep/underwater-scene.js; src/screen-router.js|./deep/deep-ui.js; src/screen-router.js|./deep/deep-ui.css; tools/test-deep-zone.mjs|../src/deep/deep-journey.js; tools/test-deep-zone.mjs|../src/deep/deep-zone.js; tools/test-deep-zone.mjs|../src/deep/deep-ui.js. Retain all ten previously approved pairs, complete rejection guard and all existing5287 assertions/tolerances. Coastal-water reads course.deepRamp and needs no Deep import. Any actually required extra pair/file must be re-sliced before its code.

Use an injected per-Game provider list with empty default, owned by deep-journey and supplied through a narrow Game initialization option; no mutable global registry. Providers receive immutable resolved-ramp geometry and return a validated zone in that route's frame. The owned Node test injects its small zone only inside that test. Later Claude DEEP-TRAIL supplies the actual Kelp Coast provider/bootstrap binding. Until a real provider is installed, production entry remains inactive: normal shoreline recovery, no pause or dead Dive button. This is the graph's explicit Zone-before-Trail interface, not a finished Kelp Coast claim or a test zone shipped as content.

First entry requires the kit and ordinary Duel/TimeTrial; revisits allow the written race/TimeTrial rule with the kit, excluding Mad Max. Before Dive, freeze race clocks and CPU state, clear locked inputs and allow Turn back/ramp rejoin to resume. Dive commits abandonment once, no charge or record; remember discovery through the existing safe App/save methods and wire the already merged audio adapter lifecycle. Once Dive has abandoned that race, driving back up the ramp returns to menu, never resurrects the abandoned race. Test actual choice/ramp-return lifecycle in Node with memory-only profiles, including missing-provider behavior, coordinate continuity, route clearance, independent provider lists, old keys and switch-off/unused-ramp exact fingerprints. Art/browser/frame checks remain night and no production zone is invented. Busy-game-files still belongs to Summit; this scope records no claim or runtime implementation.