# EGG-04: discovery, return visit and hints

## Independent acceptance contract and runtime red evidence

The expanded board card owns additive Wasteland discovery fields, guarded
invitation discovery, nonpayable visits and presentation hints. No scrap,
territory progression or unbuilt yard actions are included.

The runtime contract uses strict `discoveredGate` and bounded `pacificFinishes`
(0 through 10), preserving unknown Wasteland fields and opaque future versions.
Only distinct valid completed Pacific history rows may initialize an absent or
invalid count; the existing retained history window is not a lifetime total.
Missing additive fields must trigger the existing verified backup gate before
stored migration. The App exposes a frozen player-specific discovery snapshot,
guards actual invitation callbacks, and offers `visitWasteland()` only from the
eligible player's menu. Direct visits have explicit visit identity and no run,
ghost recording, payable race or saved race-setting changes. Scenic repeat
visits still use the safe gate takeover, then pass through automatically.

`tools/test-hidden-road-discovery.mjs` ran before production edits on base
`0168336`: 0/10 groups passed in 0.67 seconds. Failures establish missing field
validation, history initialization, migration detection, completion counting,
invitation persistence, guarded App APIs and automatic scenic passage. Tests
exercise actual App journeys and production settlement with synthetic memory
storage. They retain duplicate, wrong-player, stale-event, flag-off, inactive
entry and interrupted-navigation controls. No real saves or browser origin
were read. Existing historical fixtures will run once during independent save
review after implementation, rather than duplicating them in this red suite.

Map, menu and hint acceptance is a separately owned red group so its builder
can start after that contract is committed. Browser acceptance remains two
bounded scored rounds; no broad gate has run for this card.
