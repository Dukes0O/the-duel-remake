# JESKO-FREE

Kyle decided on 25 October 2026 that the owned Jesko races on every course and in every mode, including with the helicopter on. Medal cars and the restored Sirena keep their existing air-only rule. No design question remains.

The shared air-only list drives race admission, menu notes and pilot-map markers. Flying an owned road car remains optional. Existing Jesko helicopter positions remain in saves; no migration or player-data edit is needed.

Checks: lane tier with jobs 4, production build, and yard-home, heli-first-flight and grand-prix-existing browser scenarios with jobs 1.

## Changed assertions

All changes below follow Kyle's 25 October decision. Medal-car and Sirena admission rules are retained, with positive Jesko coverage added. No physics, reward, ownership or race-result thresholds change.

| Test | Old | New | Why |
| --- | --- | --- | --- |
| `test-course-eligibility` refusal predicate and message | Jesko plus three medal cars refused away from Woods | Only the three medal cars refused | Jesko may race on every course; the loop now starts and restarts its formerly refused pairings. |
| `test-course-eligibility` refusal total | `4 * (COURSE.length - 1)` | `3 * (COURSE.length - 1)` | Exactly one car leaves the restricted list. |
| `test-course-eligibility` added mode/position checks | No all-mode check with an old position | Helicopter on; Jesko starts every course for Duel, Time Trial, Grand Prix and Wasteland requests, retains chosen car/course and preserves `carsAt` | Proves the decision across mode requests; course-specific mode normalization still applies. |
| `test-earned-cars-ui` two exact list assertions (real and scratch medal cars) | Jesko, medals, Sirena | Medals, Sirena | The shared list must exclude only Jesko, including dynamically registered medal cars. |
| `test-grand-prix-cups` admission, reason and active-cup assertions | Jesko Night Cup refused, air-only reason, no active cup | Jesko owned Mountain Cup admitted despite a saved Panorama position and active car is Jesko; abandon succeeds; Enzo then refused with same reason and null active cup | Allows Jesko cups while keeping medal-car refusal and ownership checks. |
| `test-heli-hooks` Panorama start | Unflown Jesko refused with air-only message | Unflown Jesko starts | No flight required. |
| `test-heli-hooks` Woods start after saved Panorama placement | Jesko refused at home | Jesko starts at home; old Panorama position still equals its saved value | Saved positions remain untouched and do not restrict Jesko. |
| `test-heli-hooks` Wasteland/arena refusal predicate | Both Jesko destinations refused | Neither destination refused | All modes regain Jesko access. |
| `test-heli-hooks` menu-note/start agreement, home-note and switch-off-note assertions | Jesko used as restricted fixture | Enzo used; same refusal and null-note expectations | Keeps the restricted-car menu contract covered. |
| `test-heli-hooks` readiness assertions | Jesko closes START, leaving its course clears note; F42 restores saved line | Enzo closes START; same course/line checks; choosing Jesko restores the line | Menu must still explain medal-car restrictions and remove the note for Jesko. |
| `test-heli-jobs` added classification and note assertions | No separate Jesko freedom check | Jesko is not air-only; old Panorama position produces no Snow restriction note | Covers the shared rule directly. Existing customer-pool and seeded-job assertions remain exact. |
| `test-koenigsegg-driver` normal start and completed Pacific run | Fixture first placed Jesko on Pacific | Same assertions without synthetic transport | Earned driver/car may race immediately. All trajectory/result checks stay exact. |
| `test-koenigsegg-driving` menu starts, Pacific trajectory and expansion-route finishes | Fixture placed Jesko at each course first | Same assertions without any synthetic transport | Proves real driving after earning it, preserving exact 30/144 FPS trajectory and results. |
| `test-koenigsegg-progression` earned start and selected/maxed physics assertions | Fixture first placed reward on initial course | Same assertions without synthetic transport | Earning the car is enough; ownership fallback remains checked. |
| `test-sirena-car` customer-pool equality | Every liftable non-air-only car | Same filter with an explicit Jesko exclusion | Preserve the exact existing customer pool and seeded jobs after racing classification changes. |
| `test-sirena-car` position assertion label and new contrast checks | Jesko default position described as start location for every other car | Same position value, labelled helicopter position; Jesko is not air-only and has no Pacific restriction note | Separate saved location from race permission. Existing Sirena Pacific permission and Woods refusal stay exact. |
| `test-map-view` special-car marker | Saved Jesko appears at Panorama | Saved Enzo appears; saved Jesko appears nowhere as an air-only marker | Map must mark the remaining restricted cars only. |
| `test-drive-lesson-helipad` escaped-note example | `<Jesko>` round-trips escaped | `<Enzo>` round-trips escaped | Avoid showing a Jesko restriction as current wording; lesson fixture variable renamed to `airOnlyCar`, with all rule assertions unchanged. |
| `heli-first-flight` menu predicates | Jesko closes START with note; F42 removes note and opens START | Enzo closes START with note; owned Jesko removes note and opens START | Browser coverage of both retained restriction and restored freedom. |
| `yard-home` refusal checks | Jesko refused; state, wallet, run, helicopter and storage unchanged | Enzo refused with all the same isolation checks; Jesko additionally enters/exits yard and passes existing car, framing, wallet and settlement checks | Keeps air-only refusal and proves Jesko yard entry. |
| `yard-home` framing readiness | Waited only for vehicle asset and viewport | Also waits for the Scrapdome yard asset to be ready | First F42 capture used the fallback camera because `homeCamera()` returns null until the yard asset loads. All framing bounds, overlap and viewport thresholds are unchanged. |
| `arena-steering` refusal checks in each quality | Jesko refused with exact note; memory/owner/state/course/run/serial/helicopter unchanged | Same assertions and note for Enzo | Retains arena refusal for a medal car. No steering measurements or thresholds changed. |

## Review

Independent reviewer found the stale arena-steering Jesko refusal. Fixed it with an Enzo fixture; reviewer confirmed the fix and reported no further faults. Shared admission, lessons, menu notes and map all use the central list. Generic Fly my car remains available as an optional activity for liftable owned road cars. Customer dispatch cars remain unchanged to preserve seeded jobs.

## Check results

- Ran `node tools/run-tests.mjs --tier lane --changed --jobs 4`. Initial run: 32 passed, the new cup fixture failed, 32 not run. Corrected that fixture and continued only failed/unrun suites (plus the later selected tooling suites), jobs 4. The corrected cup suite passed 13/13. The Windows temporary-copy tooling test initially hit sandbox `pwsh EACCES`; with process access it passed 46/46. The remaining batch passed 33 suites with one Sirena customer-pool expectation failure; that expectation was corrected to preserve the old pool and its suite then passed 9/9. Every selected lane suite has a passing result; passing suites were not repeated solely to obtain a single green runner summary.
- Explicit `test-course-eligibility`: 3,990 checks passed across 13 cars and 23 courses. This suite is normally excluded from the lane tier, so it was included in the targeted continuation.
- Replay guards: 225 checks across 25 cases, 23 events, nine categories, three frame rates and three runs passed unchanged. Combat replay fingerprints and world composition passed; no fingerprints or world signatures were regenerated.
- `npm run build`: passed (531 modules; existing dynamic-import/chunk-size warnings).
- Ran `node tools/run-browser-scenarios.mjs --scenarios yard-home,heli-first-flight,grand-prix-existing --jobs 1 --output-dir .evidence/2026-10-25/JESKO-FREE`. All three names exist. `heli-first-flight` passed (11 pictures), and `grand-prix-existing` passed (36 pictures), both with zero warnings/errors. Initial `yard-home` failed only the first F42 framing check (panel overlap 4,903.89 square pixels); Enzo refusal and the other eight car views, including Jesko admission, passed. Source inspection found the missing yard-asset prerequisite described above. After the reviewed readiness correction, ran only `yard-home`, jobs 1: passed (15 pictures), zero warnings/errors. Every original framing threshold remains exact.
- Scenario syntax and `git diff --check`: passed. No game code changed after the passing production build; the later correction only waits for the existing yard asset in the QA scenario.
- All browser checks used private ports and memory-only saves. No real player data was read, written or reset. Consumed captures and generated build/QA output were recycled after recording these verdicts.
- Required Cockpit sync: succeeded, zero tasks changed.

## Removed

Jesko membership in the air-only list and tests that require flying it before racing. No saved positions or progress removed.
