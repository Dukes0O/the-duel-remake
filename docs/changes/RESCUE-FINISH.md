# RESCUE-FINISH

Rescue stays dev; helicopter stays on. Claude retains final review and release.

## Decision before code

Use on-screen fuel guidance for Summit avalanche jobs. The complete existing
flight needs two fuel stops: start area, then pickup beside the slide. Budget
remaining legs up to the next planned fuel stop (or handover after the pickup),
including the climb at 4 m/s and 60 seconds for approaches/hold. Calculate burn
from thin-air thrust, 330 kg departure fuel and the two-person load at 20 m/s.
Below the mountain point to the start-area truck when short; near the slide
point to the pickup truck when short. After enough fuel is bought, restore the
slide target. Explain the second stop in text. Guidance cannot guarantee fuel
for arbitrary hovering. Autopilot goals stay unchanged.
Show why a hold resets using its existing lifted/dragged/away event reason.
The playable finishing check then found that Summit had no rendered pump.
Expose the existing paid pump at either truck while on the ground. Offer the
existing recipe's tank targets 190/230/330/360/400 kg, plus fill. Show a clear
reason for lower or already-reached targets (including less than 0.1 kg room).
The Summit evidence recipe now selects and buys through the real DOM controls.
No recorded voice, save change, physics change or new dependency.

## Checks and findings

Complete flights below use Assisted mode, fixed seeds and ordinary pitch,
roll, collective, hook, radio, cruise, pump and autopilot actions. They start
at the home pad with a waiting call and finish at handover/payment. No
teleport, injected completion, player save, frame measurement or new voice.
The table uses a clue-only hiker search: 120 m parallel rows, stopping at 60 m
waypoints. It is cautious, rather than a claim about a human pilot's best pace.
The seed-known regression also passed (7:44.7, 207.0 kg, a42ce566).
Other rescue routes use seeded waypoints and verify the beacon/hold mechanics;
they are controlled flights, not a claim of blind human search testing. Browser picture flights are separate
from the complete headless flights.

| Rescue | Completed | Mission time | Fuel left | Finding | Fingerprint (FNV-1a) |
| --- | --- | --- | --- | --- | --- |
| Hiker, Woods (clue-only grid) | Yes | 14:01.4 | 23.1 kg | Hiker cold/hurt; 58.6 seconds left. Search and boarding instructions now written. | 415d77c0 |
| Avalanche, Snow | Yes | 6:55.9 | 184.3 kg | One lifted hold reset; the retry now explains why and how to recover. | 4363244b |
| Hoist, Ridge | Yes | 11:16.6 | 35.3 kg | Driver gets cold before handover. Low return fuel; no clock/physics retune in this lane. | 1ede265f |
| Supply, Snow fallback | Yes | 24:30.5 | 201.4 kg | Only 29.5 seconds remain; Claude should assess this fallback's pace. Written hook/release steps added. | 122f0304 |
| Avalanche, Summit | Yes | 23:24.9 | 35.3 kg | Both planned truck stops needed. Target and text now explain fuel stops; no truck autopilot routing. | 0e873fbb |
| Supply, Summit | Yes | 27:56.1 | 48.7 kg | Three crates delivered; truck top-ups to 230/230/190 kg keep loads liftable. | 997a19b3 |

Fuel is read immediately after the script's completion, not after a return
home that the job does not require. Mission time includes cruise time.
Full fingerprint strings and fuel/time records: ignored evidence flights.json.
Ordinary race replay and combat fingerprints passed unchanged.

Browser: rescue-view (four types) passed, 18 pictures, port 25154;
rescue-finish (Summit) passed, eight pictures, port 46813. Both headless,
High quality, memory-only; zero errors or warnings. The original four-type
pictures precede the final written approach instructions; Summit pictures
include the final runtime code. No art/model changes or fourth art round.
Sheet: docs/board/looks/heli-rescue-finish/round-1.jpg, 441,957 bytes.
The yard-only camera retake passed on port 58298: one picture, zero errors or
warnings. Raw pictures/reports: .evidence/2026-10-26/RESCUE-FINISH/{browser,summit,yard}/.
The first extra yard leg failed with the static waypoint camera-flight recipe;
the tested terrain-following cargo controller fixed the recipe. No game rules
were changed for that failure. The final yard shot faces the delivery circle.
The retained sheet recipe is tools/art/rescue-finish-sheet.py.

Independent code review: clear after fixing the initial fuel estimate's
burn/second-stop fault and clarifying the fallback yard wording. Final QA
search and sheet recipe reviewed clear too. No heavy jobs run by reviewer.

Verification complete (PowerShell; System32 first on PATH; at most four jobs):

- First lane attempt: 51 passed, one sandbox FFmpeg EPERM, four unrun.
- Final runtime source: lane tier with --changed --jobs 4 --json: 49 passed;
  the sheet's initial flights.jpg filename failed placement; six unrun.
- Renamed the sheet to the required round-1.jpg. Existing runner, jobs 4,
  selected only that failure and six unrun checks: 7/7 passed, zero unrun.
  Thus all 56 checks in the lane plan are covered, with no remaining failure.
  FFmpeg evidence analysis passed with access to the installed tool.
- Rescue regression 442 checks plus the additional clue-only hiker flight;
  view 209 existing plus 12 new checks; Summit arrival 38; Summit tune 118.
  Race replay guard: 225 unchanged checks. World composition: 47 exact checks.
- npm run build passed (541 modules, 2.20 seconds). Existing chunk-size and
  mixed static/dynamic import warnings remain; no build error.
- Independent review clear, including actual fuel-control reachability and
  clear lower/equal/sub-minimum fuel target refusals.
Receipts: final-lane.json (49 passes), remainder.json (7 passes), build.log,
flights.json and browser report.json files under this card's ignored evidence.
No frame check or voice recording. All admission checks used FACTORY section 8;
no foreign job was stopped. Temporary QA/build output is recycled at session end.


## Changed assertions

No existing assertion was changed or loosened in this lane. Added checks:

- Summit arrival: insufficient fuel points at the start truck, both text
  surfaces explain it, an insufficient 1 kg refill keeps it, and a refill
  to 330 kg switches target/text back immediately (eight checks), plus two
  checks that the pump and partial target are rendered.
- Summit tune: before/after the second truck refill, the target names the
  pickup circle then the slide (four checks).
- Rescue view: each lifted/dragged/away reset names its cause and remedy
  (three checks). Nine more checks cover fill/target controls, five tank
  choices, the paid first truck fill, and no truck purchase in the air or
  away from the circle. The browser verifies real DOM purchases and the
  clear lower-target refusal.
Optional evidence logging and the clue-only search add no relaxed expectation.
Part 1's previously accepted assertion change is historical: cable endpoint
changed from the old raised hand (2.22 m) to the loaded model's hook/chest
geometry, with the same 0.05 m tolerance and a new hook-height check.

## Removed

No runtime assets replaced. The old home-only pump restriction is replaced
in place; no old fuel path or duplicate handler remains. The temporary QA
bundle, production build and one-off remainder runner are recycled after use.
The superseded blank yard capture is recycled; the final view is in yard/.
Raw pictures and receipts remain for Claude's finishing review.

## Earlier part 1 findings carried forward

Part 1 removed the unused debris model, rebuilt the rescuer/pair poses, drew
the stranded car, and kept delivered crates visible. Its round 3 sheet and
accepted pose/cable assertion change remain in heli-rescue-view. The scene now
shares vehicle assets, and SUMMIT-HELI-RESCUES supplies the matching recovery
car id (covered by its existing test). Still open: the hanging casualty uses
the driver model for every rescue. This lane does not alter accepted art.
Claude still owns the final look verdict, frames, switch-on and release.

## Still open for Claude

Final look/feel verdict and frames before switch-on/release. Review the narrow
margin in the cautious hiker search, Ridge hoist and Snow fallback supply
clock; this lane changes no timing or balance numbers. The casualty model
limitation from part 1 remains. No merge, push or live installation in this lane.

## Claude review (26 October 2026)

Approved: only checks were added; nothing changed or loosened. Merged with rescue still dev; tuning for a child is on the card.

## Child margins: decision before code (26 October 2026)

Keep fuel burn, loads, controls and rescue dev unchanged. Tighten the hiker's
last-seen clue to a 180 m search circle with the hiker at most 120 m from its
centre. The same cautious 120 m rows / 60 m stops cover that smaller circle.
Keep hoist slope, road clearance and tree checks; use valid sites within
550 m of the start, so the return with two people is shorter. Raise the Ridge
hoist clock to 900 s and the Snow supply clock to 1,860 s (24:30.5 x 1.25,
rounded up to a half minute). Retain other clocks if the cautious flights
leave at least 25% of their flown time spare. Full-tank flights must finish
with at least 60 kg, including the staged Summit missions.

Checks: existing six complete flights, plus explicit time/fuel margin checks;
existing rescue-finish arrival/hoist pictures; lane tier jobs 4, then build.
No frames. Changed exact expectations will be listed below for Claude review.

## Child margins: results and assertion changes

The 750 m hoist trial still finished with 31.1 kg. Restricting valid slopes
to 550 m from the start produced the required reserve; no slope, road, tree,
load, fuel-burn or controller rule was changed. The hiker clue alone changed;
the hidden hiker and clearing remain the same seeded places.

| Cautious rescue | Before time / fuel | After time / fuel | Clock after | Spare over flown time |
| --- | --- | --- | --- | --- |
| Woods hiker, clue-only grid | 14:01.4 / 23.1 kg | 9:18.8 / 159.8 kg | 15:00 | 61.1% |
| Snow avalanche | 6:55.9 / 184.3 kg | 6:55.9 / 184.3 kg | 12:00 | 73.1% |
| Ridge hoist | 11:16.6 / 35.3 kg | 10:06.9 / 71.2 kg | 15:00 | 48.3% |
| Snow supply | 24:30.5 / 201.4 kg | 24:30.5 / 201.4 kg | 31:00 | 26.5% |
| Summit avalanche | 23:24.9 / 35.3 kg | 23:25.0 / 35.2 kg | 37:30 | 60.1% |
| Summit supply | 27:56.1 / 48.7 kg | 28:16.2 / 45.9 kg | 44:30 | 57.4% |

Summit still uses the existing partial tank/refill recipe to lift its loads.
Both missions begin full at home, so these two reserves FAIL the literal
60 kg acceptance. No exemption is claimed; the card records the open decision.
No new refuelling was added. The older before numbers predate the current
integration baseline; the current Summit route code is unchanged by this lane.
The Ridge driver still becomes cold before handover; the condition rules stay.

Every changed assertion in this follow-up (none loosened):
- test-heli-missions: exact base clock table hoist 720 -> 900 s, supply
  1,500 -> 1,860 s. Other entries unchanged.
- test-heli-search: last-seen radius exactly 300 -> 180 m for both forest
  courses; the existing offset bound now uses hikerFromPoint 120 rather than
  250 m. Its label now says 120 m. Added each hoist site's <=550 m start bound.
- test-heli-rescue-session: initial search radius exactly 300 -> 180 m.
  The clue-grid recipe covers the new circle with the same row/stop spacing;
  it now runs unconditionally. Added completion/time >= cautious x 1.25 and
  final fuel >=60 kg checks to all four normal flights and the clue-grid flight.
  No cold, damage, payment or timeout assertion changed. Ordinary race and
  rescue-off fingerprints stay fixed; rescue-on updates are listed below.
- test-heli-summit-tune: exact non-Summit clock table updated as above;
  hoist's no-Summit-row fallback 720 -> 900 s; Snow supply countdown/expiry
  fixture 1,500 -> 1,860 s. Summit clocks and all 35% spare checks unchanged.

Independent code review: clear after correcting stale base-table and hoist
fallback clock expectations. Claude's written assertion review remains needed
before merge under AGENTS 18. This lane commits only; no merge or push.

Removed: replaced the old clue radius and clock/site selection in place;
no duplicate code path, old asset, dependency or new voice. The 750 m trial
was replaced by the 550 m bound. Temporary builds and test fixtures are recycled
at session end; pictures remain only for Claude's pending finishing review.


Further changed assertions and control fixtures (all exact, no wider tolerance):
- test-heli-autopilot-rescue: the closer clue now spots this seeded hiker on
  approach. Hover position/height targets the clearing instead of last-seen,
  and stage found + spotted replaces fly + not-spotted. The 60/144/240 Hz
  checks target the same clearing. Original 6 m / 2 m / 2.5 m tolerances stay.
  The hoist controller now lowers 1.5 m for slack during the same 40 s hold
  budget, as the existing complete Summit controller does. Clip/8 s checks stay.
- test-heli-skin-gear: rescue-on search pin 880789153 -> 4001410629 for the
  closer clue. Cable/bucket/rescue/survey/camera pins and gear equality stay.
- test-heli-skin-session: rescue-on hiker 4027545282 -> 75325398 for clue;
  hoist 2433107444 -> 3958087009 for site/clock; supply 1784988904 ->
  1425980116 for clock. Car/avalanche/fire and skin-off equality stay.
- test-heli-summit-rescues: rescue-on, Summit-off pin 1293191622 ->
  2318537187 for base clues/sites/clocks. Rescue-off Summit pin stays.
  Recovery fixture seed 0x2468ace -> 4 separates its wreck from the new driver
  site. Added an explicit >20 m separation check; original priority assertions
  and their tolerances stay. The old fixture accidentally overlapped the driver.

Final verification for the child-margin code:
- 52/52 selected lane suites covered, jobs <=4, PowerShell/System32 first.
  Initial 11 pass / 1 course-kit Recycle Bin error / 40 unrun. Retry plus
  remainder: course-kit passes; 37 pass and four affected expectations fail.
  Exact rescue pins/targets updated: two pass, two control fixtures fail.
  Corrected slack and distinct-target fixtures: both pass (169 and 114 checks).
  No passing suite repeated; all four receipt files are under RESCUE-TUNE.
- Rescue session 457 checks; Summit tune 118. All six complete flights finish.
  Cautious clue-grid fuel 159.8 kg, Ridge hoist 71.2 kg, Snow supply 26.5%
  time spare. The two Summit fuel reserves remain unmet, as recorded above.
- Race replay, combat replay and world-composition guards pass unchanged.
- npm run build passes, 1.11 s; existing import/chunk-size warnings only.
- Existing rescue-view: port 12714, 15 pictures; rescue-finish: port 6628,
  eight pictures. Both headless, High, memory-only; zero warnings/errors.
  Reviewed arrival/flare, Ridge approach and Summit hoist pictures. No art
  changes, new art round, voice or frame timing. Raw pictures remain for Claude
  under .evidence/2026-10-26/RESCUE-TUNE/{browser,summit}/.
- New FNV-1a fingerprints: clue-grid hiker 6b3be955; Snow avalanche 869c5607;
  Ridge hoist b4854b13; Snow supply 716a56b8; Summit avalanche 5a095c26;
  Summit supply 93455371. Full strings remain in the flight/gate receipts.
- Cockpit sync ran through its protected runner. It lists unrelated untracked
  Lab cards; no task was added or edited by hand in this lane.


Summit reserve experiment (not the accepted fix): re-used only the existing
scripted section of test-heli-summit-tune in memory, with avalanche refuelTo
[330,400] and supply want 230 for every crate, plus a >=60 kg completion check
for both. All 41 checks passed: avalanche 1,405.158 s / 71.339 kg; supply
1,698.542 s / 82.429 kg. No burn, mass, controller, site or game code changed.
The pump already offers these targets. The original card now asks Claude to
choose this refill plan or a re-sliced site change; the instruction says to
move sites, so this lane does not silently substitute a refuelling fix.

Final independent review of the pin/control changes: clear. All original
hold, completion and tolerance requirements remain. The full child-margin
acceptance is still OPEN for the two original Summit fuel reserves. Rescue
stays dev. No frame measurement, merge, push or live installation was done.

Final card/change-note/status placement checks pass (board and repo hygiene,
2/2, jobs 2). Owned QA/production bundles and superseded diagnostic/trial
logs were sent to the Recycle Bin; final receipts and pending-review pictures
remain. STATUS regenerated for this lane; no full-tier or frame pass claimed.
