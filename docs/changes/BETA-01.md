# BETA-01: Experimental Wasteland candidate

Kyle authorized an Experimental beta with the current art. This changes switch eligibility, not the public default, runtime art selection or release status. `wasteland2` and `hidden-road` become `beta`; `career-backup` remains `dev`. The retired `roadside-destruction` switch stays absent while its released behavior remains on.

## Independent red test contract

Crew owns `tools/test-feature-flags.mjs` and `tools/test-wasteland-beta.mjs`. Before the catalog edit, tests will require:

- The exact current catalog has only `career-backup:dev`, `wasteland2:beta`, and `hidden-road:beta`; the Experimental panel lists exactly the two beta names and omits dev and retired switches. This replaces the earlier dev-state and empty-beta expectations because Kyle explicitly approved these two features for opt-in play testing.
- A fresh production flag instance with memory-only storage starts with both beta features off. Turning Experimental on enables both, turning it off disables both, and newly created instances read each saved choice. The dev feature stays off through those changes. The `on` state and retired roadside behavior remain unaffected.
- A production `?flags=wasteland2,hidden-road,career-backup` query cannot enable any switch when `qa:false`. Explicit QA queries still reach named dev and beta features for isolated tests; unknown names remain ignored. Test overrides cannot invent a switch.
- If storage is unavailable, the production default is off; an explicit toggle may preview beta for that session without claiming persistence. All persistence checks use a test-owned `Map`, never player storage.

`test-wasteland-beta.mjs` will exercise the actual exported catalog and Experimental panel together rather than a second copied catalog. It will assert the two beta features move as one explicit opt-in/out pair while `career-backup`, unknown and retired names remain blocked in production. The private menu and Wasteland journey belong to the scenario owner; these unit tests do not claim that journey or release acceptance.

Existing `tools/test-hidden-road.mjs` hard-codes the old `dev` state at line 109. Director granted Crew the narrow hook to change that assertion to `beta` for Kyle's approved promotion. The test's default-off, QA isolation, route, physics and discovery checks remain unchanged.

Tests must go red on the current catalog before the builder changes `src/feature-flags.js`. Retain all existing feature-state, QA-query, blocked-storage and released-feature assertions whose behavior remains valid. Record the red/green commands and any changed assertion with its exact reason before integration.

## Red proof before implementation

On the unchanged catalog, `node tools/test-feature-flags.mjs` fails its exact beta-state assertion, and `node --test tools/test-wasteland-beta.mjs` fails the same expectation using the exported production catalog; its production-query isolation control passes. The new test owns a `Map` storage fixture and writes no real save. The narrow Hidden Road assertion changed from `dev` to `beta` solely because Kyle approved that switch for Experimental. It retains the existing route, physics, ordinary replay and QA checks. The builder may now make the catalog change and rerun the focused tests.

## Private browser journey design before implementation

Career owns the private memory-only browser scenarios. The Experimental scenario checks a production page with no QA query: both beta entries are listed but off by default, the visible UI opts in and out, and a new page reads the saved choice. It also checks that released roadside behavior stays available and `career-backup` remains hidden behind its dev-only path. The Wasteland journey scenario may establish Pacific finish eligibility of ten and place the car at a route start as explicit **fixtures**. From that state, Hidden Road departure, gate invitation, yard entry and a Wasteland race must use production App/simulation transitions and visible UI or keyboard controls. It must not directly set discovery, arrival, result or completion and then call that journey coverage. Screenshots and scenario output will label fixture setup separately from actions actually performed. All storage is memory-only; no real save or live race is touched. These scenarios test the candidate locally and do not claim that it has been released.

## Reviewed legacy assertion correction

`node tools/test-combat-armor.mjs` was run after the catalog change and before its test edit. It reported 18/19 passing; the only failure was line 70 expecting `FEATURE_STATES.wasteland2 === 'dev'` while the approved candidate state is `beta`. Director added this one named hook. The test title and exact state expectation now say opt-in beta; the flag-off armor/state loop and the other 18 assertions are unchanged. This follows Kyle's written Experimental approval, not a relaxation of combat or save behavior.

## Responsive Experimental control fix

The private browser at 1280×720 found `#experimental-open` present but hidden: computed `display:none` and a 0×0 box. The button also has the decorative `build-label` class. Existing compact-height and narrow-width media rules hide every `.build-label`, so they hide this interactive button too. Career is adding a visible, clickable control assertion at the actual 1280×720 viewport before this CSS edit.

The narrow fix is a readable responsive override for `.build-meta .experimental-open` after those media rules. It restores the button's inline layout at compact heights and widths through 1100px while leaving decorative `.build-label` elements hidden. Browser review must check that the control stays on screen, can receive keyboard focus and can be clicked at 1280×720 and a narrow viewport. No viewport increase or menu behavior change is part of this fix.

The first post-CSS browser run revealed a second layout issue: the button now has a 129.6×21px box, but its top is y751.7 at a 720px viewport. Actual browser measurements show a 720px scrollable menu with 800px of content; the footer starts at y697.5 and ends at y772.7. The Start Engine control ends at y658.3 in the left column. The compact layout will anchor only the interactive button at the lower right of the viewport with a 40px hit target; the ordinary footer and decorative labels remain in flow. Placement must pass the real viewport bounds, hit-target and keyboard-focus checks at 1280×720 and 1024×720.

Career then verified the button is visible, clickable and keyboard focusable at both actual browser sizes. The final rule changes only its responsive display and placement; the decorative label hiding and menu actions are unchanged.
