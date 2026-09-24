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

## Independent hint and map red evidence

`tools/test-hidden-road-hints.mjs` ran before presentation edits: 0/7 groups
passed in 0.48 seconds. Expected failures identify absent pure hint/dust APIs,
revealed map geometry and named-player cache invalidation. Initial test setup
used a nonexistent disposal-module import; this was corrected to the existing
`world.js` export before recording this behavioral red result.

The agreed presentation contract includes player-aware menu/path eligibility,
five- and ten-completion thresholds, removal after discovery, unchanged default
and flag-off map geometry, and actual spur-to-gate projection. Live map and
preview caches must switch identity without exposing the prior player's path.
The dust hint uses at most 64 finite local points within a 3 m radius and 9 m
height (the authored plan uses 48), pure presentation-time reconstruction,
one Points draw and the existing scene disposal path. Pause, menu, discovery,
ineligible count and mismatched player immediately hide it. Tests prohibit
random consumption in the pure frame helper and preserve snapshot data.

The optional map parameters and provider leave old callers unchanged. Actual
menu/garage wiring, dotted drawing and rendered dust placement remain source
review and the two scored browser rounds; these headless groups do not replace
visual evidence. No existing assertion or replay fingerprint changed here.
## Runtime implementation

Runtime source commit: `f0f3ae4`. The independent discovery suite passes all
10 checks after the initial red handoff. No existing or new assertions changed.
The final focused run took under one second. Independent review, presentation
checks, browser rounds and the required lane/build gate remain pending.

- Version-one Wasteland data now includes a strict discovery boolean and a
  Pacific finish count capped at ten. Existing unknown Wasteland fields remain
  intact; newer Wasteland schemas stay opaque. Outer profile normalization is
  unchanged. There is no scrap or territory progression in this card.
- A missing or invalid counter may use distinct valid completed Pacific wins
  and losses in the last sixty retained history rows. Rows require a valid car,
  finite positive time and reward, and must not be abandoned or timed out. This
  is a conservative lower bound, not a lifetime total. A valid saved count
  takes precedence. New settlements increment only after the existing duplicate
  guard and completed-race validation, regardless of a win or loss.
- Raw missing or invalid discovery fields trigger the existing verified startup
  backup before normalization is written. The existing backup-failure and
  future-schema protections remain responsible for blocking startup writes.
- The actual invitation saves discovery before either choice. App validates the
  current state, journey, player and run owner; repeated callbacks cannot save
  again. The immutable presentation snapshot is replaced only when its values
  change and is mirrored by App. Renderers do not write it.
- A discovered scenic driver keeps the existing safe takeover and opening,
  then automatically enters. All movement and clocks stay in Duel.step.
- Direct visits use a dedicated identity, start twelve metres outside the gate,
  open for three simulation seconds and enter for three more. They create no
  payable run, departure settlement, countdown cue or ghost recorder. Restart
  repeats the visit. Menu clears its identity and restores the saved race
  choices. The arrived endpoint remains a safe hold until the yard exists.
- Menu preview courses now include actual hidden-road geometry only when the
  feature is enabled; the course cache includes that flag. Presentation owns
  the separate player/discovery cache keys and dotted-path visibility.

Only the seven assigned runtime/persistence files changed. No dependencies,
storage keys, real saves, live folder, release files or ports were touched.
